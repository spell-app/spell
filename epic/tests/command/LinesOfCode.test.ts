/**
 * Tests of `epic loc` (`LinesOfCode`) and the page it writes (`LocPage`), on SCRATCH git repos:  never a real one.
 * - what counts:  code vs docs by extension, tests by folder and name, rows by the settings file's globs
 * - what's left out:  a file git's `linguist-generated` marks, GENERATED on its first line, the settings' globs;
 *   GENERATED further down is counted (the first scan dropped `StyleGenerator.ts` for it)
 * - a multi-repo top:  its child repos, cloned inside it
 * - the page:  its tables and lists rewritten, its prose and ids kept;  a missing one made from the guide template
 */
import { execFileSync } from "node:child_process"
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { parseHTML } from "linkedom"
import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { DataFile } from "spell/server/DataFile"
import { LinesOfCode } from "spell/epic/command/LinesOfCode"
import { LocPage } from "spell/epic/command/LocPage"
import { LOC_DEFAULTS, type LocScan } from "spell/epic/command/command.types"

const TEMP = realpathSync(mkdtempSync(join(tmpdir(), "epic-loc-")))
afterAll(() => rmSync(TEMP, { recursive: true, force: true }))

/** spell-epic's guide template. */
const DURABLE = resolve(dirname(fileURLToPath(import.meta.url)), "../../templates/durable.html")

const TODAY = "2026-10-25"

/** A scratch git repo at `folder`, holding `files` (path => text), every one added (none committed). */
function gitRepo(folder: string, files: Record<string, string>): string {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(folder, path)), { recursive: true })
    writeFileSync(join(folder, path), text)
  }
  execFileSync("git", ["init", "-q", folder])
  execFileSync("git", ["-C", folder, "add", "-A"])
  return folder
}

/** The files of a small repo:  code, tests, docs, and the ones left out or not. */
const FILES = {
  ".gitattributes": "src/a/byAttribute.ts linguist-generated\n",
  "src/a/code.ts": "// a comment\nconst a = 1\n\n/* block\n   comment */\nexport const b = a // trailing\n",
  "src/a/code.test.ts": "test()\n",
  "src/top.ts": "export {}\n",
  "src/a/byAttribute.ts": "export const x = 1\n",
  "src/a/firstLine.ts": "// GENERATED -- do not edit\nexport const y = 1\n",
  "src/a/later.ts": "/**\n * Writes the GENERATED tables.\n */\nexport const z = 1\n",
  "tests/a.ts": "one()\ntwo()\n",
  "docs/guide.md": "# Guide\n\ntext\n",
  "README.md": "# Read me\n",
  "vendor/lib.js": "vendored()\n",
  "data.json": "{}\n"
}

let printed: string[] = []
beforeEach(() => {
  printed = []
  vi.spyOn(process.stdout, "write").mockImplementation((text) => {
    printed.push(String(text))
    return true
  })
  vi.spyOn(process.stderr, "write").mockImplementation(() => true)
})
afterEach(() => vi.restoreAllMocks())

describe("LinesOfCode", () => {
  test("counts code, tests and docs by row;  leaves out generated files by attribute or first line only", () => {
    const repo = gitRepo(join(TEMP, "one"), FILES)
    const loc = new LinesOfCode({ cwd: join(repo, "src", "a"), today: TODAY })
    expect(loc.ensureSettings().written).toBe(true)
    expect(DataFile.read(join(repo, LinesOfCode.SETTINGS))).toEqual({ repos: { "*": LOC_DEFAULTS } })
    expect(DataFile.text(join(repo, LinesOfCode.SETTINGS))).toMatch(/^\/\/ epic loc's settings/)
    const scan = loc.scan()
    expect(scan.root).toBe(repo)
    const [one] = scan.repos
    expect(one!.name).toBe("one")
    // code.ts:  2 code lines of 7;  later.ts (GENERATED on line 3) counts:  1 of 5;  top.ts 1 of 2
    expect(one!.rows["src/a/"]).toMatchObject({ files: 2, codeLines: 3, allLines: 12 })
    expect(one!.rows["src/ (top files)"]).toMatchObject({ files: 1, codeLines: 1 })
    expect(one!.rows["docs/"]).toMatchObject({ files: 0, docFiles: 1, docLines: 4 })
    expect(one!.rows.other).toMatchObject({ files: 0, docFiles: 1 })
    expect(one!.code).toMatchObject({ files: 3, codeLines: 4, docFiles: 2 })
    // tests/a.ts and code.test.ts
    expect(one!.tests).toMatchObject({ files: 2, codeLines: 3 })
    expect(scan.skipped).toEqual([{ file: "one/src/a/firstLine.ts", why: "generated" }])
    expect(scan.generatedByAttribute).toBe(1)
  })

  test("the settings file's rows, tests and leaveOut, per repo, leaveOut adding to every repo's", () => {
    const repo = gitRepo(join(TEMP, "tweaked"), FILES)
    mkdirSync(join(repo, "guides", "loc"), { recursive: true })
    writeFileSync(
      join(repo, LinesOfCode.SETTINGS),
      `// mine
{ "repos": {
  "*": { "leaveOut": ["**/*.md", "vendor/**"] },
  "tweaked": { "rows": ["src/a", "src"], "tests": ["tests/**"], "leaveOut": ["src/top.ts"] }
} }
`
    )
    const loc = new LinesOfCode({ cwd: repo, today: TODAY })
    expect(loc.ensureSettings().written).toBe(false)
    const settings = loc.settingsFor("tweaked")
    expect(settings.leaveOut).toEqual(["**/*.md", "vendor/**", "src/top.ts"])
    expect(settings.code).toEqual(LOC_DEFAULTS.code)
    const [repoScan] = loc.scan().repos
    // code.test.ts is code now, in its row;  top.ts and the docs left out
    expect(Object.keys(repoScan!.rows).toSorted()).toEqual(["src/a/"])
    expect(repoScan!.rows["src/a/"]).toMatchObject({ files: 3, docFiles: 0 })
    expect(repoScan!.tests).toMatchObject({ files: 1 })
    expect(DataFile.text(join(repo, LinesOfCode.SETTINGS))).toMatch(/^\/\/ mine/)
  })

  test("a multi-repo top:  the top, then each child repo cloned in it, from inside a child", () => {
    const top = gitRepo(join(TEMP, "kit"), {
      ".epic/config.json5": '{ "repos": ["child", "missing"] }\n',
      "src/x/a.ts": "a()\n"
    })
    gitRepo(join(top, "child"), { "src/y/b.ts": "b()\nc()\n" })
    writeFileSync(join(top, ".gitignore"), "child/\n")
    const loc = new LinesOfCode({ cwd: join(top, "child", "src"), today: TODAY })
    expect(loc.checkouts().map((each) => each.name)).toEqual(["kit", "child"])
    const scan = loc.scan()
    expect(scan.repos.map((repo) => [repo.name, repo.code.codeLines])).toEqual([
      ["kit", 1],
      ["child", 2]
    ])
  })

  test("--json, --print, and a word it doesn't take", async () => {
    const repo = gitRepo(join(TEMP, "cli"), FILES)
    const loc = new LinesOfCode({ cwd: repo, today: TODAY })
    expect(await loc.run(["--json"])).toBe(0)
    expect(JSON.parse(printed.join("")).repos[0].code.codeLines).toBe(4)
    printed = []
    expect(await loc.run(["--print"])).toBe(0)
    const lines = printed.join("").trimEnd().split("\n")
    expect(lines[0]).toMatch(/^repo\s+Code: Files\s+: Lines\s+: Chars\s+All: Lines\s+: Chars\s+Doc: Files\s+: Lines$/)
    expect(lines.map((line) => line.split(/\s{2,}/)[0])).toEqual([
      "repo",
      "cli",
      "cli tests",
      "All code",
      "Tests",
      "Both"
    ])
    await expect(loc.run(["extra"])).rejects.toThrow(/takes no extra/)
  })

  test("short numbers", () => {
    expect([999, 1000, 12_345, 1_400_000].map(LinesOfCode.short)).toEqual(["999", "1.0k", "12.3k", "1.4M"])
  })
})

describe("LocPage", () => {
  /** A scan of `repos` names, each with a row or two. */
  function scanOf(...names: string[]): LocScan {
    return {
      scanned: TODAY,
      root: "/Users/someone/www/kit",
      repos: names.map((name) => ({
        name,
        folder: `/x/${name}`,
        code: { ...LinesOfCode.zero(), files: 3, codeLines: 12_345 },
        tests: { ...LinesOfCode.zero(), files: 1, codeLines: 500 },
        rows: { other: { ...LinesOfCode.zero(), files: 1 }, "src/a/": { ...LinesOfCode.zero(), files: 2 } }
      })),
      skipped: [{ file: `${names[0]}/src/gen.ts`, why: "generated" }],
      generatedByAttribute: 4
    }
  }

  test("rewrites the tables, lists and dates;  keeps the prose and the ids;  drops a repo no longer scanned", async () => {
    const content = join(TEMP, "content")
    const file = join(content, LinesOfCode.PAGE)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(
      file,
      `<!doctype html><html><head><title>LOC</title></head><body><main class="spell-doc-main">
<p class="lede">How big:  scanned 2020-01-01.</p>
<ui-list class="spell-meta"><ui-item icon="user">Written for:  me</ui-item><ui-item icon="calendar">Scanned: old</ui-item></ui-list>
<ui-section id="1-by-repo" label="1. By repo"><ui-icon slot="icon" name="cubes"></ui-icon>
<ui-statistics><ui-statistic value="1" label="lines of code"></ui-statistic></ui-statistics>
<p id="mine">My own words.</p><ui-table><table><tbody><tr><td>old</td></tr></tbody></table></ui-table>
<ul><li id="loc-ratio">old ratio</li></ul></ui-section>
<ui-section id="2-by-folder" label="2. By folder"><p>Folders.</p>
<ui-section id="folders-gone" label="gone"><ui-table><table></table></ui-table></ui-section>
<ui-section id="folders-alpha" label="alpha"><ui-table><table></table></ui-table></ui-section></ui-section>
<ui-section id="3-how-its-counted" label="3."><ui-section id="left-out" label="Left out"><p>Why.</p>
<ui-accordion class="spell-aside" appearance="styled"><ui-title>old</ui-title><ui-content></ui-content></ui-accordion></ui-section></ui-section>
<ui-section id="4-refresh-it" label="4."><p>Run it.</p></ui-section>
<footer class="spell-doc-footer"><p class="meta">Last checked 2020-01-01.</p></footer>
</main></body></html>`
    )
    const page = new LocPage({ file, scan: scanOf("alpha", "beta"), root: content, content, tidy: false })
    expect(await page.write()).toEqual({ created: false })
    const { document } = parseHTML(readFileSync(file, "utf8"))
    expect(document.querySelector(".lede")!.textContent).toBe(`How big:  scanned ${TODAY}.`)
    expect(document.querySelector("footer .meta")!.textContent).toBe(`Last checked ${TODAY}.`)
    expect(document.querySelector("#mine")!.textContent).toBe("My own words.")
    expect(document.querySelector("#4-refresh-it")!.textContent).toBe("Run it.")
    const meta = [...document.querySelectorAll("ui-list.spell-meta ui-item")].map((item) => item.textContent)
    expect(meta).toEqual([
      "Written for:  me",
      `Scanned:  ${TODAY}, the checkout ~/www/kit and its 1 child repos, each at its checked-out branch`
    ])
    // section 1:  stats, then the prose, the table, the ratio
    const one = document.querySelector("#1-by-repo")!
    expect([...one.children].map((child) => child.localName)).toEqual([
      "ui-icon",
      "ui-statistics",
      "p",
      "ui-table",
      "ul"
    ])
    expect(one.querySelector("ui-statistic")!.getAttribute("value")).toBe("24.7k")
    const head = [...one.querySelectorAll("thead tr")].map((row) =>
      [...row.children].map((cell) => `${cell.textContent}${cell.getAttribute("colspan") ?? ""}`)
    )
    expect(head).toEqual([
      ["repo", "Code3", "All2", "Doc2"],
      ["Files", "Lines", "Chars", "Lines", "Chars", "Files", "Lines"]
    ])
    const names = [...one.querySelectorAll("tbody tr, tfoot tr")].map((row) => row.firstElementChild!.textContent)
    expect(names).toEqual(["alpha", "alpha tests", "beta", "beta tests", "All code", "Tests", "Both"])
    const cell = one.querySelector("tbody tr")!.children[2]!
    expect([cell.textContent, cell.getAttribute("title"), cell.getAttribute("class")]).toEqual([
      "12.3k",
      "12,345",
      "num right aligned"
    ])
    expect(one.querySelector("#loc-ratio")!.textContent).toMatch(/24,690 lines of code and 1,000 lines of tests/)
    // section 2:  alpha kept in place (its id), beta added, gone removed;  rows sorted, other last
    const subs = [...document.querySelectorAll("#2-by-folder > ui-section")].map((each) => each.id)
    expect(subs).toEqual(["folders-alpha", "folders-beta"])
    const rows = [...document.querySelectorAll("#folders-beta tbody tr")].map(
      (row) => row.firstElementChild!.textContent
    )
    expect(rows).toEqual(["src/a/", "other"])
    expect(document.querySelector("#folders-beta")!.getAttribute("open")).toBe("false")
    // left out
    expect(document.querySelector("#left-out ui-title")!.textContent).toBe(
      "The 1 files left out this scan, besides 4 marked linguist-generated"
    )
    expect(document.querySelector("#left-out li")!.textContent).toBe("alpha/src/gen.ts:  GENERATED on its first line")
    expect(document.querySelector("#left-out p")!.textContent).toBe("Why.")
  })

  test("a missing page:  made from the guide template, its four sections written", async () => {
    const content = join(TEMP, "fresh")
    const file = join(content, LinesOfCode.PAGE)
    const page = new LocPage({
      file,
      scan: scanOf("solo"),
      root: content,
      content,
      tidy: false,
      // what `epic pages create durable` does, near enough:  the template copied
      create: async () => {
        mkdirSync(dirname(file), { recursive: true })
        copyFileSync(DURABLE, file)
      }
    })
    expect(await page.write()).toEqual({ created: true })
    const { document } = parseHTML(readFileSync(file, "utf8"))
    const sections = [...document.querySelectorAll("main > ui-section")].map((each) => each.id)
    expect(sections).toEqual(["1-by-repo", "2-by-folder", "3-how-its-counted", "4-refresh-it"])
    expect(document.querySelector("#folders-solo ui-table")).not.toBeNull()
    expect(document.querySelector("#3-how-its-counted p code")!.textContent).toBe("guides/loc/loc.json5")
    expect(document.querySelector("#loc-ratio")!.textContent).toMatch(/12,345 lines of code/)
    expect(document.querySelector(".lede")!.textContent).toMatch(`scanned ${TODAY}`)
    expect(readFileSync(file, "utf8")).not.toMatch(/TEMPLATE:|1-summary/)
    expect(readFileSync(file, "utf8")).toMatch(/<ui-section id="1-by-repo" label="1. By repo" sticky collapsible/)
  })
})
