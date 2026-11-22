import { describe, expect, it } from "vite-plus/test"

import type { SiteDataFile } from "spell/ui/docs-components/docs-components.types"
import { SiteSearchBuilder } from "spell/ui/tools/SiteSearchBuilder"

/**
 * `SiteSearchBuilder`:  a page's entry in a set's `docs/__data/search.json5`, from its page file's markup
 * (Epic UI's, App UI's;  App UI's file is checked current by its `AppUIDataBuilder.test.ts`).
 */
describe("SiteSearchBuilder.page()", () => {
  const PAGE = `<!doctype html>
    <html><head><title>Divider | Spell UI</title><meta name="description" content="Segments content."></head>
    <body><main id="main" data-toc-header="Divider">
      <ui-tabs id="site-tabs">
        <ui-tab value="examples" label="Examples">
          <ui-section id="examples-types" label="Types">
            <ui-section id="examples-types-vertical-divider" label="Vertical   Divider">
              <ui-example><ui-section id="demo" label="Demo"></ui-section></ui-example>
            </ui-section>
          </ui-section>
        </ui-tab>
        <ui-tab value="usage" label="Usage">
          <ui-section id="usage-slots"><span slot="label">The <code>header</code> slot</span></ui-section>
        </ui-tab>
        <ui-tab value="theming" label="Theming">
          <ui-docs-tokens family="ui-section" playground><ui-section id="played" label="Never"></ui-section></ui-docs-tokens>
        </ui-tab>
      </ui-tabs>
      <template><ui-section id="templated" label="Never"></ui-section></template>
    </main></body></html>`

  it("reads the title, summary, tabs and every section with its parent and tab;  never a demo's, nor a playground's", () => {
    expect(SiteSearchBuilder.page("ui-divider.html", PAGE)).toEqual({
      path: "ui-divider.html",
      title: "Divider",
      summary: "Segments content.",
      tag: "ui-divider",
      tabs: { examples: "Examples", usage: "Usage", theming: "Theming" },
      sections: [
        { id: "examples-types", title: "Types", tab: "examples" },
        { id: "examples-types-vertical-divider", title: "Vertical Divider", parent: 0 },
        { id: "usage-slots", title: "The header slot", tab: "usage" }
      ]
    })
  })

  it("lists a page without sections by its headers with ids;  titles from `<title>` without the suffix", () => {
    const page = SiteSearchBuilder.page(
      "index.html",
      `<title>Spell UI | Spell UI</title><main id="main">
        <ui-header level="2" id="design" icon="star">Design <ui-header>Sub header</ui-header></ui-header>
        <h3 id="more">More</h3><ui-header level="5" id="tiny">Too deep</ui-header></main>`
    )
    expect(page).toEqual({
      path: "index.html",
      title: "Spell UI",
      sections: [
        { id: "design", title: "Design" },
        { id: "more", title: "More" }
      ]
    })
  })
})

/**
 * Spell UI's own search file:  its Spell pages as `yarn site:check` drew them (`SiteSearchBuilder.spellSite()`).
 * - The walk itself needs the editor:  `yarn site:check --search`.
 */
describe("SiteSearchBuilder.spellPage()", () => {
  const DRAWN = `<spell-u-i-button-api>
    <ui-header level="1">Button<ui-header>A button indicates a possible user action.</ui-header></ui-header>
    <ui-section label="Tags" id="tags"><ui-docs-api family="ui-button" only="tags"></ui-docs-api></ui-section>
    <ui-section label="Attributes" id="attributes">
      <ui-example><ui-section id="demo" label="Demo"></ui-section></ui-example>
    </ui-section>
    <ui-section label="No id yet"></ui-section>
  </spell-u-i-button-api>`

  it("reads the page's sections, with the ids its contents gave;  its title's sub header as its summary", () => {
    expect(
      SiteSearchBuilder.spellPage({ address: "/button/api", title: "Button › API", html: DRAWN }, "ui-button")
    ).toEqual({
      path: "/button/api",
      title: "Button › API",
      summary: "A button indicates a possible user action.",
      tag: "ui-button",
      sections: [
        { id: "tags", title: "Tags" },
        { id: "attributes", title: "Attributes" }
      ]
    })
  })
})

describe("SiteSearchBuilder.spellTitles()", () => {
  it("names each page by the site navigation, a page under another after its parent's", () => {
    const titles = SiteSearchBuilder.spellTitles([
      { title: "Spell UI", href: "/" },
      { title: "Button", href: "/button", pages: [{ title: "API", href: "/button/api" }] },
      { title: "A group", pages: [{ title: "Inside", href: "/inside" }] },
      "not a page"
    ])
    expect([...titles]).toEqual([
      ["/", "Spell UI"],
      ["/button", "Button"],
      ["/button/api", "Button › API"],
      ["/inside", "A group › Inside"]
    ])
  })
})

describe("SiteSearchBuilder.spellSite()", () => {
  it("names the tag each family's Usage page documents, from the site's data", () => {
    const data = {
      components: [
        { tag: "ui-button", page: true, href: "ui-button.html" },
        { tag: "ui-or", page: false, href: "ui-button.html#ui-or" },
        { tag: "ui-ad", page: true, href: "ui-ad.html" }
      ]
    } as unknown as SiteDataFile
    const file = SiteSearchBuilder.spellSite(
      [
        { address: "/button", title: "Button", html: "<p></p>" },
        { address: "/button/api", title: "Button › API", html: "<p></p>" },
        { address: "/advertisement", title: "Advertisement", html: "<p></p>" }
      ],
      data
    )
    expect(file.pages.map((page) => [page.path, page.tag])).toEqual([
      ["/button", "ui-button"],
      ["/button/api", undefined],
      ["/advertisement", "ui-ad"]
    ])
  })
})
