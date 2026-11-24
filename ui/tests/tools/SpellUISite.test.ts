import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

import { describe, expect, test } from "vite-plus/test"

import { SpellUISite } from "spell/ui/tools/SpellUISite"

/** A site file with two components, as the Spell UI site writes them. */
const SITE = `spell ui is a site
	it has a home page at "/", named "Spell UI"
	it has a button usage page at "/button", named "Button", tab "Usage"
		it has a button examples page at "/button/examples", named "Examples"
	it has a tree usage page at "/tree", named "Tree", tab "Usage"
`

/** A components page with two tabs. */
const PAGE = `<!doctype html><html><body><main>
  <ui-header level="1" class="site-title">Graph<ui-header>A graph draws nodes.</ui-header></ui-header>
  <ui-tabs>
    <ui-tab value="examples"><ui-section id="examples-types" label="Types"></ui-section></ui-tab>
    <ui-tab value="usage"><ui-section id="usage-using-it" label="Using it"></ui-section></ui-tab>
  </ui-tabs>
</main></body></html>`

/** A site folder of its own, with `SITE` and an empty project. */
function siteFolder(): string {
  const folder = mkdtempSync(path.join(tmpdir(), "spell-ui-site-"))
  writeFileSync(path.join(folder, "SpellUI.spell"), SITE)
  writeFileSync(
    path.join(folder, "__project.json5"),
    JSON.stringify({
      imports: [
        { path: "/Tree/Usage.spell", active: true },
        { path: "/SpellUI.spell", active: true }
      ]
    })
  )
  return folder
}

describe("SpellUISite", () => {
  test("a component's folder and name, from its title", () => {
    expect(SpellUISite.folderFor("App menu")).toBe("AppMenu")
    expect(SpellUISite.nameFor("App menu")).toBe("app-menu")
  })

  test("addressFor():  by title, else by its tag's name", () => {
    const site = new SpellUISite(siteFolder())
    expect(site.addressFor("ui-button", "Button")).toBe("/button")
    expect(site.addressFor("ui-tree", undefined)).toBe("/tree")
    expect(site.addressFor("ui-nothing", "Nothing")).toBeUndefined()
  })

  test("writeComponent():  a page per tab, its lines A to Z in the site, its files in the project", () => {
    const folder = siteFolder()
    const site = new SpellUISite(folder)
    const { files } = site.writeComponent(PAGE, {
      tag: "ui-graph",
      title: "Graph",
      summary: "",
      topics: ["Data display"],
      fomantic: "",
      page: "/components/ui/ui-graph.html"
    })
    expect(files.map((file) => path.relative(folder, file))).toEqual([
      "Graph/Usage.spell",
      "Graph/Examples.spell",
      "SpellUI.spell",
      "__project.json5"
    ])
    expect(readFileSync(path.join(folder, "Graph/Usage.spell"), "utf8")).toBe(
      [
        `"graph usage" is a notebook page`,
        `\t<header level="1">`,
        `\t\tGraph`,
        `\t\t<header>A graph draws nodes.</>`,
        `\t</>`,
        ``,
        `\t<section label="Using it">`,
        `\t</>`,
        ``
      ].join("\n")
    )
    const lines = readFileSync(path.join(folder, "SpellUI.spell"), "utf8").split("\n")
    expect(lines.slice(4, 7)).toEqual([
      `\tit has a graph usage page at "/graph", named "Graph", tab "Usage", tagged "Data display", thumbnail "snapshots/graph.jpg"`,
      `\t\tit has a graph examples page at "/graph/examples", named "Examples", thumbnail "snapshots/graph-examples.jpg"`,
      `\tit has a tree usage page at "/tree", named "Tree", tab "Usage"`
    ])
    const project = JSON.parse(readFileSync(path.join(folder, "__project.json5"), "utf8"))
    expect(project.imports.map((entry: { path: string }) => entry.path)).toEqual([
      "/Graph/Usage.spell",
      "/Graph/Examples.spell",
      "/Tree/Usage.spell",
      "/SpellUI.spell"
    ])
  })
})
