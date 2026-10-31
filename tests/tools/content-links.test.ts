import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { Layout, fixHref, fixPage, mapPath, type PageReport } from "../../tools/content-links.ts"

/** A made-up kit:  `src/server/`, a child repo, a moved file, the epic repo inside it. */
const kit = realpathSync(mkdtempSync(join(tmpdir(), "content-links-")))
afterAll(() => rmSync(kit, { recursive: true, force: true }))
for (const file of [
  "src/server/Linker.ts",
  "src/element-tools/HotElements.ts",
  "spell-ui/src/components/ui-button/UIButton.tsx",
  "spell-epic/package.json",
  "spell.epics/epics/seo/seo.plan.html",
  "spell.epics/epics/seo/details/q1.html"
]) {
  mkdirSync(join(kit, file, ".."), { recursive: true })
  writeFileSync(join(kit, file), "")
}
// a folder a move left behind, holding only an install
mkdirSync(join(kit, "element", "node_modules"), { recursive: true })
const layout = new Layout(kit, join(kit, "spell.epics"))

describe("mapPath", () => {
  test("by the rename tables;  a moved file by its one namesake;  a path that exists, or nowhere, as is", () => {
    expect(mapPath(layout, "packages/server/src/Linker.ts")).toEqual({ path: "src/server/Linker.ts" })
    expect(mapPath(layout, "packages/ui/components/ui-button/")).toEqual({ path: "spell-ui/src/components/ui-button/" })
    expect(mapPath(layout, "packages/ui/tools/HotElements.ts")).toEqual({
      path: "src/element-tools/HotElements.ts",
      byName: true
    })
    expect(mapPath(layout, "element/")).toEqual(undefined)
    expect(mapPath(layout, "src/server/Linker.ts")).toEqual(undefined)
    expect(mapPath(layout, "packages/ui/notes/gone.md")).toEqual(undefined)
  })
})

describe("fixHref", () => {
  test("a part's link one ../ short;  an old path;  a link out of the kit to a repo inside it", () => {
    const part = { partOf: "epics/seo" }
    expect(fixHref(layout, "../../src/server/Linker.ts", "epics/seo/parts", part)).toMatchObject({
      href: "../../../src/server/Linker.ts",
      why: "part-depth"
    })
    expect(fixHref(layout, "details/q1.html", "epics/seo/parts", part)).toMatchObject({
      href: "../details/q1.html",
      why: "part-depth"
    })
    expect(fixHref(layout, "../../packages/server/src/Linker.ts#L3", "epics/seo")).toEqual({
      href: "../../src/server/Linker.ts#L3",
      target: "src-src-server-linker-ts",
      why: "renamed"
    })
    expect(fixHref(layout, "../../../spell-epic/", "epics/seo")).toMatchObject({
      href: "../../spell-epic/",
      why: "into-kit"
    })
  })

  test("fine already, not a path, or nowhere to point it:  left", () => {
    const left: string[] = []
    for (const href of ["../../src/server/Linker.ts", "#P3", "https://x.dev", "/_epic/assets/a.js", "../../gone.md"])
      expect(fixHref(layout, href, "epics/seo", { left: (each) => left.push(each) })).toBeUndefined()
    expect(left).toEqual(["../../gone.md"])
  })
})

describe("fixPage", () => {
  test("links and path titles only:  words, scripts and code blocks kept;  once", () => {
    const html =
      '<p>See <a href="../../packages/server/src/Linker.ts" target="old"><code title="packages/server/src/Linker.ts">' +
      "packages/server/src/Linker.ts</code></a>.</p>" +
      '<pre><a href="../../packages/server/src/Linker.ts">kept</a></pre><script>"../../packages/server/"</script>'
    const report: PageReport = { counts: {}, left: [] }
    const fixed = fixPage(layout, html, "epics/seo", report)
    expect(fixed).toBe(
      '<p>See <a href="../../src/server/Linker.ts" target="src-src-server-linker-ts"><code title="src/server/Linker.ts">' +
        "packages/server/src/Linker.ts</code></a>.</p>" +
        '<pre><a href="../../packages/server/src/Linker.ts">kept</a></pre><script>"../../packages/server/"</script>'
    )
    expect(report.counts).toEqual({ renamed: 1, title: 1 })
    expect(fixPage(layout, fixed, "epics/seo", { counts: {}, left: [] })).toBe(fixed)
  })
})
