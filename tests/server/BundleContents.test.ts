import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { SRV } from "spell/server"

/** A scratch kit:  a build in `out/`, its maps' paths from there (`builtAt`). */
const ROOT = mkdtempSync(join(tmpdir(), "bundle-contents-"))

/** The built folder. */
const OUT = join(ROOT, "out")

/** Write `text` at `path` under `OUT`, making folders. */
function put(path: string, text: string): void {
  mkdirSync(dirname(join(OUT, path)), { recursive: true })
  writeFileSync(join(OUT, path), text)
}

// a.js:  its first 22 bytes from our src/a.ts, the rest (14 and the newline) from lodash-es
put("assets/a.js", 'import{x}from"./b.js";console.log(x)\n')
put(
  "assets/a.js.map",
  JSON.stringify({
    version: 3,
    sources: ["../../src/a.ts", "../../node_modules/lodash-es/x.js"],
    // [0, 0, 0, 0], then 22 columns on and the next source:  [22, 1, 0, 0]
    mappings: "AAAA,sBCAA"
  })
)
// b.js:  all of it lodash-es too, so lodash-es is built in twice
put("assets/b.js", "export const x=1\n")
put("assets/b.js.map", JSON.stringify({ version: 3, sources: ["../../node_modules/lodash-es/x.js"], mappings: "AAAA" }))
// c.js:  loads b.js later;  d.js has no map
put("assets/c.js", 'const later=()=>import("./b.js")\n')
put("assets/d.js", "console.log(1)\n")

afterAll(() => rmSync(ROOT, { recursive: true, force: true }))

describe("BundleContents", () => {
  const contents = new SRV.BundleContents(OUT, { root: ROOT, builtAt: OUT })

  test("a file's bytes go to the module each mapping names, from the kit's root", () => {
    const a = contents.of("assets/a.js")
    expect(a.isMapped).toBe(true)
    expect(a.raw).toBe(37)
    expect(a.modules).toEqual([
      { module: "src/a.ts", bytes: 22 },
      { module: "node_modules/lodash-es/x.js", bytes: 15 }
    ])
  })

  test("modules gather by package, or by their first three folders", () => {
    expect(SRV.BundleContents.grouped(contents.of("assets/a.js").modules)).toEqual([
      { module: "src/a.ts", bytes: 22 },
      { module: "lodash-es", bytes: 15 }
    ])
    expect(SRV.BundleContents.groupOf("parser/src/spell/rules/x.ts")).toBe("parser/src/spell")
    expect(SRV.BundleContents.groupOf("node_modules/@solidjs/web/dist/web.js")).toBe("@solidjs/web")
  })

  test("who loads a file:  with it (static) or later (dynamic)", () => {
    expect(contents.of("assets/b.js").importedBy).toEqual([
      { file: "assets/a.js", how: "static" },
      { file: "assets/c.js", how: "dynamic" }
    ])
    expect(contents.of("assets/a.js").importedBy).toEqual([])
  })

  test("a file with no map says so", () => {
    const d = contents.of("assets/d.js")
    expect(d.isMapped).toBe(false)
    expect(d.modules).toEqual([])
  })

  test("a module built into two of the files is named, with each file's bytes", () => {
    expect(contents.duplicates(["assets/a.js", "assets/b.js", "assets/d.js"])).toEqual([
      {
        module: "node_modules/lodash-es/x.js",
        bytes: 32,
        files: [
          { file: "assets/a.js", bytes: 15 },
          { file: "assets/b.js", bytes: 17 }
        ]
      }
    ])
  })
})
