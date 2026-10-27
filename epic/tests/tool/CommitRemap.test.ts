/**
 * Tests of `CommitRemap` (`epic commits remap`, epic-engine's P49) on a scratch content folder:  an epic page and its
 * parts listing commits of repos repo-split's P20 · One Repo merged, rewritten to their new ids in the merged repo.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { CommitRemap } from "spell/epic/tool/CommitRemap"
import { PlanDocCommands } from "spell/epic/tool/PlanDocCommands"
import { PlanDocFiles } from "spell/epic/tool/PlanDocFiles"

/** A fake 40-hex id from a short seed:  `id("a1")` -> `a1a1...` */
const id = (seed: string) => seed.repeat(40).slice(0, 40)

const OLD_UI = id("a1")
const OLD_UI_2 = id("a2")
const OLD_APP = id("b1")
const UNKNOWN = id("c9")
const NEW_UI = id("e1")
const NEW_UI_2 = id("e2")

const UI = "https://github.com/spell-app/spell-ui"
const APP = "https://github.com/spell-app/spell-app"
const SPELL = "https://github.com/spell-app/spell"

const MAP = `old                                      new\n${OLD_UI} ${NEW_UI}\n${OLD_UI_2} ${NEW_UI_2}\n`

const root = mkdtempSync(join(tmpdir(), "commit-remap-"))
const content = join(root, "content")
const page = join(content, "epics", "x", "x.plan.html")
const part = join(content, "epics", "x", "parts", "i1.html")
const mapFile = join(root, "commit-map-ui.txt")

/** The page:  its own repo spell-ui;  one commit inheriting it, one of spell-app's. */
const PAGE = `<epic-page epic="x" title="X"
  repo="${UI}">
<epic-phase id="p-one"><epic-commit sha="${OLD_UI}">the first</epic-commit
><epic-commit sha="${OLD_APP}" repo="${APP}">spell-app's</epic-commit></epic-phase>
</epic-page>
`

/** A part:  a short id inheriting the page's repo, an explicit one, and one the map lacks. */
const PART = `<epic-item id="i1">
<epic-commit sha="${OLD_UI_2.slice(0, 7)}">short</epic-commit
><epic-commit sha="${OLD_UI}" repo="${UI}"
  >explicit</epic-commit
><epic-commit sha="${UNKNOWN}">not in the map</epic-commit>
</epic-item>
`

beforeEach(() => {
  rmSync(content, { recursive: true, force: true })
  mkdirSync(join(content, "epics", "x", "parts"), { recursive: true })
  writeFileSync(page, PAGE)
  writeFileSync(part, PART)
  writeFileSync(mapFile, MAP)
})

afterAll(() => rmSync(root, { recursive: true, force: true }))

const remap = (from = ["spell-ui"]) => new CommitRemap({ ids: CommitRemap.readMap([mapFile]), from, to: SPELL })

describe("CommitRemap", () => {
  test("rewrites ids and repos over the page and its parts", () => {
    const report = remap().run(content)
    expect(report).toMatchObject({ found: 4, remapped: 3, pages: 1 })
    expect(report.missing).toEqual([{ sha: UNKNOWN, file: "epics/x/parts/i1.html" }])
    expect(report.files.map(({ file, found, remapped }) => [file, found, remapped])).toEqual([
      ["epics/x/parts/i1.html", 3, 2],
      ["epics/x/x.plan.html", 1, 1]
    ])
    const pageNow = readFileSync(page, "utf8")
    expect(pageNow).toContain(`repo="${SPELL}">`)
    expect(pageNow).toContain(`<epic-commit sha="${NEW_UI}" repo="${SPELL}">the first`)
    // another repo's commit is left alone
    expect(pageNow).toContain(`<epic-commit sha="${OLD_APP}" repo="${APP}">`)
    const partNow = readFileSync(part, "utf8")
    // a short id becomes the full new one
    expect(partNow).toContain(`<epic-commit sha="${NEW_UI_2}" repo="${SPELL}">short`)
    expect(partNow).toContain(`<epic-commit sha="${NEW_UI}" repo="${SPELL}"\n  >explicit`)
    // not in the map:  it keeps its old repo, now written on it, as its page moved
    expect(partNow).toContain(`<epic-commit sha="${UNKNOWN}" repo="${UI}">not in the map`)
  })

  test("--dry-run writes nothing, and reports the same", () => {
    const report = remap().run(content, { dryRun: true })
    expect(report).toMatchObject({ found: 4, remapped: 3, pages: 1 })
    expect(readFileSync(page, "utf8")).toBe(PAGE)
    expect(readFileSync(part, "utf8")).toBe(PART)
  })

  test("a second run changes nothing", () => {
    remap().run(content)
    const [pageOnce, partOnce] = [readFileSync(page, "utf8"), readFileSync(part, "utf8")]
    const again = remap().run(content)
    expect(again).toMatchObject({ found: 1, remapped: 0, pages: 0 })
    expect(again.missing.map(({ sha }) => sha)).toEqual([UNKNOWN])
    expect(readFileSync(page, "utf8")).toBe(pageOnce)
    expect(readFileSync(part, "utf8")).toBe(partOnce)
  })

  test("an older name of the repo, and renamedRepos, match it", () => {
    writeFileSync(page, PAGE.replace(UI, "https://github.com/spell-app/spell-old-ui"))
    const renamed = new CommitRemap({
      ids: CommitRemap.readMap([mapFile]),
      from: ["spell-app/spell-ui"],
      to: SPELL,
      renamed: { "https://github.com/spell-app/spell-old-ui": UI }
    })
    expect(renamed.run(content, { dryRun: true })).toMatchObject({ found: 4, remapped: 3, pages: 1 })
    expect(remap(["spell-ui", "spell-old-ui"]).run(content, { dryRun: true })).toMatchObject({ found: 4, pages: 1 })
  })

  test("never walks a link:  the old docs folder's links back into epics/", () => {
    mkdirSync(join(content, "packages", "docs", "content"), { recursive: true })
    symlinkSync(join(content, "epics"), join(content, "packages", "docs", "content", "epics"))
    expect(remap().run(content, { dryRun: true }).found).toBe(4)
  })

  test("a short id two of the map's start with is not in it", () => {
    const ids = CommitRemap.parseMap(`${id("ab1")} ${NEW_UI}\n${id("ab2")} ${NEW_UI_2}\n`)
    const lookup = new CommitRemap({ ids, from: ["spell-ui"], to: SPELL })
    expect(lookup.newIdFor("ab")).toBeUndefined()
    expect(lookup.newIdFor("ab1a")).toBe(NEW_UI)
  })

  test("refuses a line that isn't two ids, and the new repo as the old one", () => {
    expect(() => CommitRemap.parseMap("old new\nnope\n")).toThrow(/not a commit map line/)
    expect(() => new CommitRemap({ ids: new Map(), from: ["spell"], to: SPELL })).toThrow(/the new repo/)
  })
})

describe("epic commits remap", () => {
  let printed: string[]

  afterEach(() => vi.restoreAllMocks())

  /** The command, on a checkout whose content folder is the scratch one. */
  function commands() {
    const owner = new PlanDocCommands({ files: new PlanDocFiles({ root, content }) })
    printed = []
    vi.spyOn(owner, "print").mockImplementation((text) => void printed.push(text))
    vi.spyOn(owner, "warn").mockImplementation((text) => void printed.push(text))
    return owner
  }

  test("prints each file, the ids not in the map and the totals;  --dry-run writes nothing", async () => {
    const code = await commands().run(["commits", "remap", mapFile, "--repo", "spell-ui", "--to", SPELL, "--dry-run"])
    expect(code).toBe(0)
    expect(printed).toContain("  epics/x/parts/i1.html  2 of 3, 1 not in the map")
    expect(printed).toContain(`  not in the map:  ${UNKNOWN.slice(0, 12)}  epics/x/parts/i1.html`)
    expect(printed.at(-1)).toBe(
      `${UI} -> ${SPELL}:  4 commits found, 3 remapped, 1 not in the map, in 2 files;  1 page's own repo moved` +
        "  (dry run:  nothing written)"
    )
    expect(readFileSync(page, "utf8")).toBe(PAGE)
  })

  test("needs a map and --repo", async () => {
    expect(await commands().run(["commits", "remap", "--repo", "spell-ui"])).toBe(1)
    expect(printed.join("\n")).toMatch(/commits remap <map>/)
  })
})
