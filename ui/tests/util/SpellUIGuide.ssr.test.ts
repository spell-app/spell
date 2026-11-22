import { describe, expect, it } from "vite-plus/test"

import { SpellUIGuide } from "spell/ui/util/SpellUIGuide"

describe("SpellUIGuide.addressOf()", () => {
  it("takes a site address, a tag or an old components page's name", () => {
    expect(SpellUIGuide.addressOf("/button/api")).toBe("/components/ui/button/api")
    expect(SpellUIGuide.addressOf("ui-button")).toBe("/components/ui/button")
    expect(SpellUIGuide.addressOf("ui-grid.html#ui-column")).toBe("/components/ui/grid#ui-column")
    expect(SpellUIGuide.addressOf("icons.html?q=star&pack=fa7")).toBe("/components/ui/icons?q=star&pack=fa7")
  })

  it("names the pages the Spell UI site calls by what they show", () => {
    expect(SpellUIGuide.addressOf("ui-breadcrumbs.html")).toBe("/components/ui/breadcrumb")
    expect(SpellUIGuide.addressOf("ui-components.html")).toBe("/components/ui/ui-components")
    expect(SpellUIGuide.addressOf("components.html")).toBe("/components/ui/components")
  })

  it("takes the home page for none", () => {
    expect(SpellUIGuide.addressOf("")).toBe("/components/ui/")
    expect(SpellUIGuide.addressOf("index.html")).toBe("/components/ui/")
  })
})

describe("SpellUIGuide.mendedPath()", () => {
  it("mends a link to an old components page, and leaves the rest", () => {
    expect(SpellUIGuide.mendedPath("/components/ui/ui-toc.html#api")).toBe("/components/ui/table-of-contents#api")
    expect(SpellUIGuide.mendedPath("/components/ui/images/x.png")).toBeUndefined()
    expect(SpellUIGuide.mendedPath("/components/ui/button")).toBeUndefined()
    expect(SpellUIGuide.mendedPath("/components/app/spell-viewer.html")).toBeUndefined()
  })
})

describe("SpellUIGuide.setAddressOf() / setMendedPath()", () => {
  it("names Epic UI's and App UI's pages for their tag or component, kebab-cased", () => {
    expect(SpellUIGuide.setAddressOf("epics", "epic-card.html#parts")).toBe("/components/epics/epic-card#parts")
    expect(SpellUIGuide.setAddressOf("app", "CodeMirrorEditor")).toBe("/components/app/code-mirror-editor")
    expect(SpellUIGuide.setAddressOf("app", "index.html")).toBe("/components/app/")
  })

  it("mends a link to one of their old HTML pages, and leaves the rest", () => {
    expect(SpellUIGuide.setMendedPath("/components/app/MenuBar.html")).toBe("/components/app/menu-bar")
    expect(SpellUIGuide.setMendedPath("/components/epics/epic-item.html#3-markup")).toBe(
      "/components/epics/epic-item#3-markup"
    )
    expect(SpellUIGuide.setMendedPath("/components/app/_images/Notice.png")).toBeUndefined()
    expect(SpellUIGuide.setMendedPath("/components/ui/ui-button.html")).toBeUndefined()
  })
})
