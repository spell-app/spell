/**
 * Tests of `EpicPageFormat`:  an epic page as a `ChunkedPlace`, its skeleton the list and its part files the bodies;
 * and several writers on one page, through `PlanDocFiles` and the kit's `ChunkFiles`.
 */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, join } from "node:path"
import { fileURLToPath } from "node:url"

import { afterEach, describe, expect, test } from "vite-plus/test"

import { idOfRow } from "spell/util/places/places.types"

import { EpicPageFormat } from "spell/epic/tool/EpicPageFormat"
import { PlanDocFiles } from "spell/epic/tool/PlanDocFiles"
import { PlanParts } from "spell/epic/tool/PlanParts"
import { ReviewInbox } from "spell/epic/tool/ReviewInbox"

/** The tracked fixtures:  a new doc in `<epic-*>` markup. */
const FIXTURES = fileURLToPath(new URL("fixtures", import.meta.url))

/** How many writers go at one page at once. */
const WRITERS = 12

/** A skeleton, as the tool writes it:  across lines, a host of each kind, marks waiting. */
const SKELETON = `<!doctype html><html><body><main><epic-page epic="x" stage="overview">
<epic-summary>S</epic-summary>
<epic-overview id="overview">
  <epic-section id="o1" kind="overview-part" title="One" source="parts/o1.html" part-ids="o1-deep"></epic-section>
</epic-overview>
<epic-section id="phases" kind="phases" to-see="UP3@2026-10-31 ch9">
  <epic-phase
    id="p-one"
    title="One"
    status="active"
    source="parts/p-one.html"
  ></epic-phase>
</epic-section>
<epic-section id="decisions" kind="questions">
  <epic-item id="Q1" status="open" source="parts/q1.html"><span slot="title">Has <b>parts</b></span></epic-item>
  <epic-item id="q2" status="open"><span slot="title">No parts</span></epic-item>
</epic-section>
<epic-section id="tests" kind="tests"></epic-section>
<epic-choices id="s-upgrades" standing></epic-choices>
<epic-choices id="s-closed" standing closed></epic-choices>
<epic-change id="ch1">words</epic-change>
<epic-change id="ch2" accepted="2026-10-31">words</epic-change>
<epic-update id="up1" at="2026-10-31">words</epic-update>
<epic-update id="up2" seen="2026-10-31">words</epic-update>
</epic-page></main></body></html>`

describe("EpicPageFormat", () => {
  const dirs: string[] = []
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
  })

  /** A skeleton in a fresh folder, with these parts:  its file. */
  function page(parts: Record<string, string> = {}, text = SKELETON) {
    const dir = mkdtempSync(join(tmpdir(), "epic-page-format-"))
    dirs.push(dir)
    const file = join(dir, "x.plan.html")
    writeFileSync(file, text)
    if (Object.keys(parts).length) mkdirSync(join(dir, "parts"))
    for (const [id, html] of Object.entries(parts)) writeFileSync(join(dir, "parts", `${id}.html`), html)
    return file
  }

  test("its addresses are what a skeleton's `source`s already say", () => {
    const format = new EpicPageFormat()
    expect(format.listAddress("x.plan.html")).toBe("x.plan.html")
    expect(format.bodyAddress("x.plan.html", "q1")).toBe("parts/q1.html")
    expect(EpicPageFormat.partIdOf("parts/q1.html")).toBe("q1")
    expect(EpicPageFormat.partIdOf("/demo/parts/q1.html")).toBeUndefined()
    expect(EpicPageFormat.partIdOf("parts/a/q1.html")).toBeUndefined()
  })

  test("the list is every host and mark in the skeleton's text:  ids as written, across lines", () => {
    const { rows } = new EpicPageFormat().listIn(SKELETON)
    expect(rows.find((row) => row.id === "p-one")).toEqual({
      tag: "epic-phase",
      id: "p-one",
      title: "One",
      status: "active",
      source: "parts/p-one.html"
    })
    expect(rows.find((row) => row.id === "o1")?.["part-ids"]).toBe("o1-deep")
    expect(rows.find((row) => row.id === "Q1")).toBeDefined()
    expect(rows.find((row) => row.id === "s-closed")).toMatchObject({ standing: "", closed: "" })
    expect(rows.find((row) => EpicPageFormat.tagOf(row) === "epic-page")).toMatchObject({ stage: "overview" })
    expect(rows.map((row) => idOfRow(row, "id")).filter(Boolean)).toContain("phases")
  })

  test("an attribute's words are never taken for an attribute (`was`)", () => {
    const html = `<epic-page><epic-change id="ch1" was="it was accepted here"></epic-change></epic-page>`
    expect([...ReviewInbox.itemIds(html)]).toEqual(["ch1"])
  })

  test("a list reads no body:  the parts can be broken, or missing altogether", async () => {
    const file = page()
    const place = PlanParts.placeOf(file)
    const { rows } = await place.list(basename(file), {})
    expect(rows.length).toBeGreaterThan(5)
    expect(existsSync(join(file, "..", "parts"))).toBe(false)
  })

  test("a body is its part file, read alone;  none:  `undefined`", async () => {
    const file = page({ q1: "<p>the body</p>\n" })
    const place = PlanParts.placeOf(file)
    expect(EpicPageFormat.textOf(await place.bodyOf(basename(file), "q1"))).toBe("<p>the body</p>\n")
    expect(await place.bodyOf(basename(file), "nope")).toBeUndefined()
    expect(PlanParts.reader(file)("q1")).toBe("<p>the body</p>\n")
    expect(PlanParts.partFile(file, "q1")).toBe(join(file, "..", "parts", "q1.html"))
  })

  test("asking for what a list doesn't hold reads only the bodies that exist", async () => {
    const file = page({ "p-one": "<p>the phase's</p>" })
    const { rows } = await PlanParts.placeOf(file).list(basename(file), { select: ["html"] })
    expect(rows.find((row) => row.id === "Q1")?.html).toBeUndefined()
    expect(rows.find((row) => row.id === "p-one")?.html).toBe("<p>the phase's</p>")
    expect(rows.find((row) => row.id === "q2")?.html).toBeUndefined()
  })

  test("read only:  edits are whole pages, under the tool's lock (J13)", () => {
    expect(PlanParts.placeOf(page()).describe().write).toBe("none")
  })

  test("what takes a mark is the same from the text and from the place", async () => {
    const file = page()
    const fromPlace = await ReviewInbox.itemIdsOf(file)
    expect(fromPlace).toEqual(ReviewInbox.itemIds(SKELETON))
    expect([...fromPlace].sort()).toEqual(
      ["ch1", "ch9", "o1", "p-one", "q1", "q2", "s-upgrades", "stage", "summary", "tests", "up1", "up3"].sort()
    )
  })

  test("a page that isn't there takes no marks", async () => {
    expect((await ReviewInbox.itemIdsOf(join(tmpdir(), "no-such-folder", "x.plan.html"))).size).toBe(0)
  })
})

describe("several writers on one page", () => {
  /** A fresh split page of the fixture's, in an epic folder of its own:  the file and the tool on it. */
  function splitPage(dirs: string[]) {
    const content = mkdtempSync(join(tmpdir(), "epic-writers-"))
    dirs.push(content)
    const folder = join(content, "epics", "x")
    mkdirSync(folder, { recursive: true })
    const file = join(folder, "x.plan.html")
    writeFileSync(file, readFileSync(join(FIXTURES, "epic-plan.html"), "utf8"))
    return { file, files: new PlanDocFiles({ content }) }
  }

  const dirs: string[] = []
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
  })

  test(
    "they take turns:  every edit lands, each part's there, no temp file or lock is left",
    { timeout: 60_000 },
    async () => {
      const { file, files } = splitPage(dirs)
      await files.edit(file, (plan) => plan.addItem("todo", "the first", { details: "<p>first's details</p>" }), {
        split: true
      })

      // a reader throughout:  the list never names a body that isn't there
      let readings = 0
      let done = false
      const reader = (async () => {
        while (!done) {
          const { rows } = await PlanParts.placeOf(file).list(basename(file), {})
          for (const row of rows) {
            if (!row.source) continue
            readings++
            expect(existsSync(join(file, "..", row.source as string))).toBe(true)
          }
          await new Promise((resolve) => setTimeout(resolve, 1))
        }
      })()

      const ids = await Promise.all(
        Array.from({ length: WRITERS }, (_, n) =>
          files.edit(file, (plan) => plan.addItem("todo", `writer ${n}`, { details: `<p>writer ${n}'s</p>` }))
        )
      )
      done = true
      await reader
      expect(readings).toBeGreaterThan(0)

      expect(new Set(ids).size).toBe(WRITERS)

      const plan = files.read(file)
      expect(plan.parts!.missing).toEqual([])
      for (let n = 0; n < WRITERS; n++) expect(plan.toString()).toContain(`writer ${n}'s`)
      const beside = readdirSync(join(file, ".."))
      expect(beside.filter((name) => /\.lock$|\.tmp$/.test(name))).toEqual([])
      expect(readdirSync(join(file, "..", "parts")).filter((name) => name.endsWith(".tmp"))).toEqual([])
    }
  )

  test("a part no longer written goes, the skeleton last;  a page with nothing changed writes nothing", async () => {
    const { file, files } = splitPage(dirs)
    const id = await files.edit(file, (plan) => plan.addItem("todo", "soon empty", { details: "<p>details</p>" }), {
      split: true
    })
    const part = PlanParts.partFile(file, id)
    expect(existsSync(part)).toBe(true)

    const skeleton = readFileSync(file, "utf8")
    await files.writeDoc(file, files.read(file), true)
    expect(readFileSync(file, "utf8")).toBe(skeleton)

    const emptied = files.read(file)
    const host = emptied.document.getElementById(id)!
    for (const node of [...host.childNodes]) {
      if (node.nodeType !== 1 || !(node as Element).hasAttribute("slot")) node.remove()
    }
    await files.writeDoc(file, emptied, true)
    expect(existsSync(part)).toBe(false)
    expect(readFileSync(file, "utf8")).not.toContain(`parts/${id}.html`)
  })
})
