import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterAll, beforeAll, describe, expect, test, vi } from "vite-plus/test"

import { PackageBuild, expandGlobs, type BuildReport, type PublishedRepo } from "spell/cli/publish"

/**
 * `PackageBuild` on a made-up repo, `spell-fake`:  one file per source file, every import made one node runs,
 * decorators lowered, Solid's JSX compiled, `?inline` CSS and `import.meta.glob()` made plain modules.
 * - Not a git repo, so every file of its `src/` counts (`trackedFiles()`'s fallback).
 */
const ROOT = mkdtempSync(join(tmpdir(), "spell-fake-"))
const STAGE = join(ROOT, "stage")
afterAll(() => rmSync(ROOT, { recursive: true, force: true }))

// esbuild, Solid's compiler and Lightning CSS load on the first build
vi.setConfig({ testTimeout: 30_000 })

const REPO: PublishedRepo = {
  name: "spell-fake",
  root: join(ROOT, "repo"),
  manifest: { name: "spell-fake", version: "0.0.1" },
  settings: { exclude: ["tools/**"] }
}

write("src/index.ts", 'export * as F from "."\nexport { Thing } from "spell-fake/things"\n')
write(
  "src/things/index.ts",
  [
    'import { E } from "spell/element"',
    'import get from "lodash/get"',
    'import sheet from "./thing.css?inline"',
    "",
    "function tag(value: unknown, _context: unknown) { return value as never }",
    "",
    "@tag",
    "export class Thing extends E.DOMElement {",
    "  sheet = sheet",
    "  get = get",
    "  version = __PACKAGE_VERSION__",
    "}",
    "",
    'export const words = import.meta.glob("./*.en.ts", { eager: true })',
    ""
  ].join("\n")
)
write("src/things/thing.css", "a {\n  color: red;\n}\n")
write("src/things/thing.en.ts", "export const en = 1\n")
write("src/things/View.tsx", 'export const View = () => <div class="x">hi</div>\n')
write("src/things/data.json5", "{ kept: true }\n")
write("src/tools/skip.ts", "export const skipped = true\n")
write("src/AGENTS.md", "# never shipped\n")
// a package with no `exports`, as lodash is:  node needs `lodash/get.js`
write("node_modules/lodash/package.json", '{ "name": "lodash" }')
write("node_modules/lodash/get.js", "module.exports = () => 1\n")

let report: BuildReport
beforeAll(async () => {
  report = await new PackageBuild(REPO, STAGE, "9.9.9").build()
})

describe("PackageBuild.build()", () => {
  test("one JavaScript file per source file, the rest copied, the excluded left out", () => {
    expect(report).toMatchObject({ compiled: 4, modules: 1, copied: 2, declarations: 0, warnings: [] })
    expect(existsSync(dist("things/data.json5"))).toBe(true)
    expect(existsSync(dist("tools/skip.js"))).toBe(false)
    expect(existsSync(dist("AGENTS.md"))).toBe(false)
  })

  test("its own names and `.` become relative paths;  other packages' stay names, with node's extension", () => {
    expect(read("index.js")).toMatch('import * as F from "./index.js"')
    expect(read("index.js")).toMatch('from "./things/index.js"')
    const thing = read("things/index.js")
    expect(thing).toMatch('from "spell/element"')
    expect(thing).toMatch('from "lodash/get.js"')
  })

  test("decorators lowered, the version stamped, class names kept", () => {
    const thing = read("things/index.js")
    expect(thing).not.toMatch(/^@tag/m)
    expect(thing).toMatch("__decorateElement")
    expect(thing).toMatch('"9.9.9"')
    expect(thing).toMatch('"Thing"')
  })

  test("`?inline` CSS:  a module of its minified text", () => {
    expect(read("things/index.js")).toMatch('from "./thing.css.inline.js"')
    expect(read("things/thing.css.inline.js")).toBe('export default "a{color:red}"\n')
  })

  test("`import.meta.glob()`:  what it matched, imported", () => {
    const thing = read("things/index.js")
    expect(thing).toMatch(/import \* as __glob_0_0 from "\.\/thing\.en\.js"/)
    expect(thing).toMatch(/"\.\/thing\.en\.ts": __glob_0_0/)
  })

  test("Solid's JSX:  compiled for the DOM", () => {
    const view = read("things/View.js")
    expect(view).toMatch('from "@solidjs/web"')
    expect(view).toMatch("_$template(`<div class=x>hi`)")
  })
})

describe("expandGlobs()", () => {
  test("lazy, with a query, an import and a pattern left out;  comments left alone", () => {
    const file = join(REPO.root, "src/things/x.ts")
    const code = [
      "// import.meta.glob() in a comment",
      'const all = import.meta.glob<string>(["./*.css", "!./skip.css"], { query: "?inline", import: "default" })'
    ].join("\n")
    write("src/things/skip.css", "b {}\n")
    expect(expandGlobs(code, file)).toBe(
      [
        "// import.meta.glob() in a comment",
        'const all = { "./thing.css": () => import("./thing.css?inline").then((module) => module["default"]) }'
      ].join("\n")
    )
  })

  test("a comment among its arguments, with an apostrophe:  skipped, not read as a string (epic repo-split P22)", () => {
    const file = join(REPO.root, "src/things/x.ts")
    const code = [
      "const all = import.meta.glob([",
      '  "./*.css",',
      "  // the thing's own file is left out",
      '  "!./skip.css"',
      "])"
    ].join("\n")
    expect(expandGlobs(code, file)).toBe('const all = { "./thing.css": () => import("./thing.css") }')
  })

  test("a string that never closes is an error, not a hang", () => {
    const file = join(REPO.root, "src/things/x.ts")
    expect(() => expandGlobs('import.meta.glob("./*.css)', file)).toThrow(/never closes/)
  })
})

/** Write `content` to `path` in the made-up repo, making its folders. */
function write(path: string, content: string) {
  mkdirSync(dirname(join(REPO.root, path)), { recursive: true })
  writeFileSync(join(REPO.root, path), content)
}

/** `path` in the built `dist/`. */
function dist(path: string): string {
  return join(STAGE, "dist", path)
}

/** The built file `path`'s text. */
function read(path: string): string {
  return readFileSync(dist(path), "utf8")
}
