import { describe, expect, it } from "vite-plus/test"

import { foundationCSS } from "spell/ui/styles"

import { Sheets } from "spell/ui/test-helpers/Sheets"

import navCSS from "spell/ui/docs-components/ui-docs-nav/UIDocsNav.css?inline"
import navRaw from "spell/ui/docs-components/ui-docs-nav/UIDocsNav.css?raw"

/**
 * `UIDocsNav.css`:  the sheet's source rules, and its layout on the shadow markup contract.
 * - The look is the widgets' own (`<ui-site-nav>`'s tree), tested in their families;  this sheet only lays them
 *   out, so a stand-in host with the contract's markup is enough.
 */
describe("UIDocsNav.css source", () => {
  it("never uses rem or !important", () => {
    const text = Sheets.withoutComments(navRaw)
    expect(text).not.toMatch(/\d(\.\d+)?rem\b/)
    expect(text).not.toContain("!important")
  })

  it("declares its sublayer order before any rule", () => {
    const text = Sheets.withoutComments(navRaw).trim()
    expect(text.replace(/\s+/g, " ").startsWith(Sheets.layers("docs-nav"))).toBe(true)
  })

  it("declares no public token of its own:  private aliases only", () => {
    const declared = [...Sheets.withoutComments(navRaw).matchAll(/(--ui-docs-nav-[\w-]+)\s*:/g)]
    expect(declared.map((match) => match[1])).toEqual([])
  })
})

describe("UIDocsNav.css layout", () => {
  /** The contract's panel:  a header band over the scrolling list, a tall stand-in for its site nav. */
  const MARKUP = `
    <div class="ui nav" part="nav">
      <div class="masthead" part="header" style="height: 100px">header</div>
      <div class="menu" part="menu">
        <div class="list" style="height: 2000px">list</div>
      </div>
    </div>`

  /** The stand-in host's shadow element matching `selector`. */
  function find(host: Element, selector: string): HTMLElement {
    return host.shadowRoot!.querySelector<HTMLElement>(selector)!
  }

  it("scrolls the list inside the panel, under the header band, at the height asked for", () => {
    const host = Sheets.host(MARKUP, [...foundationCSS, navCSS])
    host.style.setProperty("--ui-docs-nav-height", "300px")
    const panel = find(host, "[part~=nav]")
    const list = find(host, "[part~=menu]")
    expect(panel.getBoundingClientRect().height).toBe(300)
    expect(getComputedStyle(list).overflowY).toBe("auto")
    expect(list.getBoundingClientRect().top).toBe(find(host, "[part~=header]").getBoundingClientRect().bottom)
    expect(list.getBoundingClientRect().bottom).toBeLessThanOrEqual(panel.getBoundingClientRect().bottom)
    expect(list.scrollHeight).toBeGreaterThan(list.clientHeight)
  })

  it("grows with its list when nothing sizes it", () => {
    const host = Sheets.host(MARKUP, [...foundationCSS, navCSS])
    expect(find(host, "[part~=nav]").getBoundingClientRect().height).toBeGreaterThan(2100)
  })

  it("draws a card:  a border, a radius", () => {
    const host = Sheets.host(MARKUP, [...foundationCSS, navCSS])
    const panel = getComputedStyle(find(host, "[part~=nav]"))
    expect(panel.borderTopWidth).toBe("1px")
    expect(parseFloat(panel.borderTopLeftRadius)).toBeGreaterThan(0)
  })

  it("hands its site nav the panel's colours, through the tree's nav tokens", () => {
    const host = Sheets.host(MARKUP.replace("</div>\n    </div>", "<ui-site-nav></ui-site-nav></div>\n    </div>"), [
      ...foundationCSS,
      navCSS
    ])
    const nav = host.shadowRoot!.querySelector("ui-site-nav")!
    const style = getComputedStyle(nav)
    expect(style.getPropertyValue("--ui-tree-nav-band-color").trim()).not.toBe("")
    expect(style.getPropertyValue("--ui-tree-nav-current-background").trim()).not.toBe("")
  })
})
