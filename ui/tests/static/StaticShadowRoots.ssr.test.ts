/// <reference types="node" />

import { beforeAll, describe, expect, it } from "vite-plus/test"
import { parseHTML } from "linkedom"

import { StaticRender, StaticStylesheet } from "spell/ui/static"
import { UIButton } from "spell/ui/components/ui-button/UIButton"
import { UICard } from "spell/ui/components/ui-card/UICard"
import { UICards } from "spell/ui/components/ui-card/UICards"
import { UIContent } from "spell/ui/components/ui-parts/UIContent"
import { UIHeader } from "spell/ui/components/ui-parts/UIHeader"
import { UISegment } from "spell/ui/components/ui-segment/UISegment"

/**
 * The static render's SHADOW output (epic `solid-2-final` P16):  every element keeps its tag and its children, and
 * gets its view as a declarative shadow root, with the sheets it adopts in a browser linked.
 */
describe('StaticRender.fragment(html, { output: "shadow" })', () => {
  beforeAll(() => {
    StaticRender.define(UIButton, UISegment, UICards, UICard, UIContent, UIHeader)
  })

  /** `html` rendered to the shadow output, parsed:  each template's content is its shadow root's. */
  function render(html: string) {
    const out = StaticRender.fragment(html, { output: "shadow", sheets: { href: "/sheets/" } })
    const { document } = parseHTML(`<!doctype html><html><body>${out}</body></html>`)
    return { out, document }
  }

  it("keeps the element and its children;  its view goes in a template, first", () => {
    const { document } = render(`<ui-button color="primary">Save</ui-button>`)
    const button = document.querySelector("ui-button")!
    expect(button.getAttribute("color")).toBe("primary")
    const template = button.firstElementChild!
    expect(template.localName).toBe("template")
    expect(template.getAttribute("shadowrootmode")).toBe("open")
    expect(template.hasAttribute("shadowrootdelegatesfocus")).toBe(true)
    // the slotted text stays where it was:  the browser's slots take it
    expect(button.lastChild!.textContent).toBe("Save")
    const inner = (template as HTMLTemplateElement).content.querySelector("button")!
    expect(inner.getAttribute("class")).toBe("ui primary button")
    expect(inner.querySelector("slot")).not.toBeNull()
    // the light output's mark for the flattener:  not needed here
    expect(inner.hasAttribute("data-ui-control")).toBe(false)
  })

  it("links the sheets a browser adopts, in its order:  foundation first, the family's own, the same address each time", () => {
    const { document } = render(`<ui-button>One</ui-button><ui-button>Two</ui-button>`)
    const [first, second] = [...document.querySelectorAll("ui-button")].map((button) =>
      [...(button.firstElementChild as HTMLTemplateElement).content.querySelectorAll("link")].map((link) =>
        link.getAttribute("href")
      )
    )
    expect(first).toEqual(second)
    expect(first![0]).toMatch(/^\/sheets\/foundation\.[0-9a-f]{8}\.css$/)
    expect(first!.some((href) => /\/sheets\/button\.[0-9a-f]{8}\.css$/.test(href!))).toBe(true)
    // no CSS copied into the page
    expect(document.querySelector("style")).toBeNull()
  })

  it("every linked file is one of `shadowSheets()`, and the page's own sheet is too", () => {
    const { document } = render(
      `<ui-cards><ui-card><ui-content><ui-header>Hi</ui-header></ui-content></ui-card></ui-cards>`
    )
    const files = StaticStylesheet.shadowSheets()
    const hrefs = [...document.querySelectorAll("template")].flatMap((template) =>
      [...(template as HTMLTemplateElement).content.querySelectorAll("link")].map((link) => link.getAttribute("href")!)
    )
    for (const href of hrefs) expect(files.has(href.replace("/sheets/", ""))).toBe(true)
    expect(files.get(StaticStylesheet.pageFile)).toContain("--ui-page-sheet")
  })

  it("writes an element's custom states as an attribute, which the linked sheets select beside :state()", () => {
    const { document } = render(`<ui-card><ui-content><ui-header>Hi</ui-header></ui-content></ui-card>`)
    expect(document.querySelector("ui-content")!.getAttribute("data-ui-states")).toContain("in-card")
    expect(StaticStylesheet.withServerStates(":host(:state(in-card)) { gap: 0 }")).toBe(
      ':host(:is(:state(in-card), [data-ui-states~="in-card"])) { gap: 0 }'
    )
  })

  it("nests:  an element in another's children gets its own root, and stays a child", () => {
    const { document } = render(`<ui-segment><ui-button>Go</ui-button></ui-segment>`)
    const segment = document.querySelector("ui-segment")!
    expect(segment.firstElementChild!.localName).toBe("template")
    const button = segment.querySelector(":scope > ui-button")!
    expect(button.firstElementChild!.localName).toBe("template")
  })

  it("leaves a page already drawn as it is:  rendering it again adds no second root", () => {
    const once = StaticRender.fragment(`<ui-button>Go</ui-button>`, { output: "shadow" })
    const twice = StaticRender.fragment(once, { output: "shadow" })
    expect(twice.match(/<template/g)?.length).toBe(1)
  })

  it("writes no hydration keys:  each element draws again in its place", () => {
    expect(StaticRender.fragment(`<ui-button>Go</ui-button>`, { output: "shadow" })).not.toContain("_hk")
  })
})
