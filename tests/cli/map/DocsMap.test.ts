import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { DocsMap, nodesNamed } from "spell/cli/map"

/** A made-up epic folder:  an epic page with a part file, and a guide;  plus a repo's README. */
const ROOT = mkdtempSync(join(tmpdir(), "spell-docs-map-"))
afterAll(() => rmSync(ROOT, { recursive: true, force: true }))

write(
  "spell.epics/epics/seo/seo.plan.html",
  [
    "<title>Epic: SEO</title>",
    '<epic-phase id="p1" title="Sitemap" source="parts/p1.html"></epic-phase>',
    '<p>See <a href="../../guides/prefs.html#store">the prefs guide</a>.</p>'
  ].join("\n")
)
write("spell.epics/epics/seo/parts/p1.html", "<p>Reads <code>readJSON5File()</code>, then writes.</p>")
write(
  "spell.epics/guides/prefs.html",
  '<title>Preferences</title>\n<h2 id="store">The store</h2>\n<p><code>PrefStore</code> keeps them.</p>'
)
write(
  "README.md",
  "# The kit\n\n## Helpers\n\nUse `readJSON5File()` and `PrefStore`, as [the guide](spell.epics/guides/prefs.html) says.\n"
)

const PAGES = [
  { path: join(ROOT, "spell.epics/epics/seo/seo.plan.html"), source: "spell.epics/epics/seo/seo.plan.html" },
  { path: join(ROOT, "spell.epics/guides/prefs.html"), source: "spell.epics/guides/prefs.html" },
  { path: join(ROOT, "README.md"), source: "README.md" }
]

describe("DocsMap.read()", () => {
  const graph = new DocsMap(ROOT, [], undefined).read(PAGES)
  const linksOf = (relation: string) =>
    graph.links.filter((each) => each.relation === relation).map((each) => [each.source, each.target])

  test("each page by its title, each heading by its text, an epic page's phases too", () => {
    expect(graph.nodes.filter((node) => node.file_type === "document").map((node) => [node.id, node.label])).toEqual([
      ["page:spell.epics/epics/seo/seo.plan.html", "Epic: SEO"],
      ["page:spell.epics/epics/seo/seo.plan.html#p1", "Sitemap"],
      ["page:spell.epics/guides/prefs.html", "Preferences"],
      ["page:spell.epics/guides/prefs.html#store", "The store"],
      ["page:README.md", "The kit"],
      ["page:README.md#the-kit", "The kit"],
      ["page:README.md#helpers", "Helpers"]
    ])
  })

  test("the code names each section mentions, a phase's from its part file", () => {
    expect(linksOf("mentions")).toEqual([
      ["page:spell.epics/epics/seo/seo.plan.html#p1", "name:readJSON5File"],
      ["page:spell.epics/guides/prefs.html#store", "name:PrefStore"],
      ["page:README.md#helpers", "name:readJSON5File"],
      ["page:README.md#helpers", "name:PrefStore"]
    ])
  })

  test("links between the pages it has, from HTML and Markdown;  a link within a page or to the web is left out", () => {
    expect(linksOf("links_to")).toEqual([
      ["page:spell.epics/epics/seo/seo.plan.html#p1", "page:spell.epics/guides/prefs.html"],
      ["page:README.md#helpers", "page:spell.epics/guides/prefs.html"]
    ])
  })
})

describe("nodesNamed()", () => {
  test("EXACT names, with or without a call's `()`, or an id", () => {
    const map = new DocsMap(ROOT, [], undefined)
    const file = join(ROOT, "docs.json")
    writeFileSync(file, JSON.stringify(map.read(PAGES)))
    expect(nodesNamed(file, "readJSON5File()").map((node) => node.id)).toEqual(["name:readJSON5File"])
    expect(nodesNamed(file, "Pref").map((node) => node.id)).toEqual([])
    expect(nodesNamed(file, "page:README.md").map((node) => node.label)).toEqual(["The kit"])
  })
})

/** Write `text` to `path` under the made-up root. */
function write(path: string, text: string): void {
  mkdirSync(dirname(join(ROOT, path)), { recursive: true })
  writeFileSync(join(ROOT, path), text)
}
