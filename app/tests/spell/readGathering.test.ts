/**
 * The table:  what the compiler finds a project reads, against what a real page reads, over the built-in projects (epic `data` P12).
 * - Each program compiled, run on the page's real `<spell-viewer>` in headless Chromium, and its reads recorded from the cells:
 *   a stored property read while a computation is collecting.
 * - Every type counts as saved, to see how far the pass sees:  only the recipe box's really is.
 * - What only SHOWS a value isn't a read:  a drawn view's element mirrors every property as an attribute
 *   (`SpellElement.shownValueOf()`), read through `whileOnlyShowing()`.
 * - Only a first draw:  nothing's clicked.  So it can only say the pass missed less than it would with people using it.
 * - Skips itself when `yarn build:element` hasn't run.
 */
import { existsSync, writeFileSync } from "fs"
import { resolve } from "path"

import { chromium, type Browser } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { SRV } from "spell/server"
import { P } from "spell/parser/parser"
import { parseSpellProject } from "spell/parser/spell/test"
import {
  compiledFixture,
  EXAMPLE_PROJECTS,
  fixtureImportScope,
  fixtureImports,
  fixtureProjectNames,
  GUIDE_PROJECTS,
  loadFixtureProject
} from "spell/app/spaces/test"

/** `yarn build:element`'s output. */
const ELEMENT_DIR = resolve(__dirname, "../../app/dist-element")

/** Goes before a program:  notes each stored property read while a computation is collecting. */
const RECORDER = `import { Thing as RecordedThing, List as RecordedList } from "@spell/core"
;(() => {
  const cells = globalThis[Symbol.for("spell:cells")]
  const reads = (globalThis.__reads ??= new Set())
  for (const Class of [RecordedThing, RecordedList]) {
    const { getProp } = Class.prototype
    Class.prototype.getProp = function (property, ...rest) {
      if (cells.collector && !cells.isOnlyShowing) reads.add(this.constructor.name + "." + property)
      return getProp.call(this, property, ...rest)
    }
  }
})()
`

/** How many projects a page at a time. */
const AT_ONCE = 6

/** One project's row. */
type Row = {
  /** Its name. */
  name: string
  /** Fields its types declare. */
  fields: number
  /** How many of them the pass finds reachable from a draw. */
  found: number
  /** How many a page really read. */
  read: number
  /** Read, and not found from a draw:  they'd be caught at run time, or by the project-wide list. */
  missedByDraw: string[]
  /** Read, and not found anywhere in the project:  only the run-time half would catch these. */
  missed: string[]
}

describe.skipIf(!existsSync(resolve(ELEMENT_DIR, "spell-runtime.js")))("reads found, against reads made", () => {
  const programs = new Map<string, string>()
  let browser: Browser
  let url: string
  let server: { close: () => void }

  beforeAll(async () => {
    const element = SRV.folderRoute("/element/", ELEMENT_DIR)
    const served = await SRV.serveRoutes((path: string) => {
      const text = programs.get(path)
      if (text !== undefined)
        return { text, type: path.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8" }
      return element(path)
    })
    ;({ url, server } = served)
    browser = await chromium.launch()
  }, 60_000)

  afterAll(async () => {
    await browser?.close()
    server?.close()
  })

  /** What a page reads running `name`:  `Type.field`. */
  async function readsOf(name: string, index: number): Promise<string[]> {
    const folder = `/p${index}`
    programs.set(`${folder}/app/main.spell.js`, RECORDER + compiledFixture(name))
    for (const [module, imported] of Object.entries(fixtureImports(name))) {
      const id = module.replace("@spell/project/", "")
      programs.set(`${folder}/app/${id.slice(id.lastIndexOf("/") + 1)}.spell.js`, compiledFixture(imported))
    }
    programs.set(
      `${folder}/index.html`,
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><script type="module" src="/element/spell-viewer.js"></script></head><body><spell-viewer src="app/main.spell.js"></spell-viewer></body></html>`
    )
    const page = await browser.newPage()
    try {
      await page.goto(new URL(`${folder}/index.html`, url).href, { waitUntil: "load" })
      await page
        .waitForFunction(() => (globalThis as { __reads?: Set<string> }).__reads?.size, undefined, { timeout: 3000 })
        .catch(() => {})
      await page.waitForTimeout(600)
      return await page.evaluate(() => [...((globalThis as { __reads?: Set<string> }).__reads ?? [])])
    } finally {
      await page.close()
    }
  }

  /** `name`'s row. */
  async function rowOf(name: string, index: number): Promise<Row> {
    const parentScope = fixtureImportScope(name)
    const { files, scope } = parseSpellProject(loadFixtureProject(name), { parentScope })
    const statements = files.map(({ match }) => (match?.AST as P.ASTStatementGroup | undefined)?.statements ?? [])
    const project = P.WriterProject.of(statements, scope)
    const gathering = P.ReadGathering.of(statements, project, { scope, allTypes: true })!
    const fieldsOf = new Map([...project.properties.keys()].map((type) => [type, gathering.fieldsOf(type)]))
    const all = [...fieldsOf].flatMap(([type, fields]) => fields.map((field) => ({ type, field })))
    const isThingsName = (field: string) => field === "name"
    const stored = (await readsOf(name, index)).filter((read) => {
      const [type, field] = read.split(".")
      return fieldsOf.get(type!)?.includes(field!)
    })
    return {
      name,
      fields: all.length,
      found: all.filter(({ field }) => gathering.namesDrawn.has(field) || isThingsName(field)).length,
      read: stored.length,
      missedByDraw: stored.filter((read) => {
        const field = read.split(".")[1]!
        return !gathering.namesDrawn.has(field) && !isThingsName(field)
      }),
      missed: stored.filter((read) => {
        const field = read.split(".")[1]!
        return !gathering.namesRead.has(field) && !isThingsName(field)
      })
    }
  }

  test("every read a first draw makes is one the project's code names", { timeout: 300_000 }, async () => {
    const names = fixtureProjectNames().filter(
      (name) => EXAMPLE_PROJECTS.has(name) || GUIDE_PROJECTS.has(name) || !name.includes("/")
    )
    const rows: Row[] = []
    let next = 0
    await Promise.all(
      Array.from({ length: AT_ONCE }, async () => {
        while (next < names.length) {
          const index = next++
          rows.push(await rowOf(names[index]!, index))
        }
      })
    )
    const sum = (read: (row: Row) => number) => rows.reduce((total, row) => total + read(row), 0)
    // the table, for the epic page:  `READ_TABLE=<file> yarn vp test run tests/spell/readGathering.test.ts`, at the app's root
    const table = process.env.READ_TABLE
    if (table)
      writeFileSync(
        table,
        [
          "project | fields | found from a draw | read on a first draw | missed from a draw | missed anywhere",
          ...[...rows]
            .sort((one, other) => one.name.localeCompare(other.name))
            .map(
              (row) =>
                `${row.name} | ${row.fields} | ${row.found} | ${row.read} | ${row.missedByDraw.join(" ") || 0} | ${row.missed.join(" ") || 0}`
            ),
          `TOTAL ${rows.length} | ${sum((row) => row.fields)} | ${sum((row) => row.found)} | ${sum((row) => row.read)} | ${sum((row) => row.missedByDraw.length)} | ${sum((row) => row.missed.length)}`
        ].join("\n")
      )
    expect(rows.flatMap((row) => row.missed)).toEqual([])
    // the walk from a draw is only a head start:  what it misses is asked for when it's reached
    expect(sum((row) => row.missedByDraw.length)).toBeLessThanOrEqual(2)
  })
})
