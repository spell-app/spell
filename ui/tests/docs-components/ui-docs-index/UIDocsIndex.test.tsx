import { flush } from "solid-js"
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"

import { Fixture } from "spell/test-helpers/Fixture"
import { SiteData } from "spell/ui/docs-components"

import "spell/ui/docs-components/ui-docs-index"

/** A data file that says nothing. */
const NO_DATA = URL.createObjectURL(
  new Blob([JSON.stringify({ topics: [{ id: "b", title: "Basic" }], components: [], docs: [], families: {} })])
)

const PAGES = [
  { title: "Forms Thing", href: "#a", tags: ["Forms"] },
  { title: "Both", href: "#b", tags: ["Basic", "Forms"] }
]

/** What `element` draws, each group's label and its cards' headings. */
function drawn(element: Element) {
  return [...element.shadowRoot!.querySelectorAll("ui-section")].map((section) => [
    section.getAttribute("label"),
    [...section.querySelectorAll("ui-card")].map((card) => card.getAttribute("heading"))
  ])
}

describe("<ui-docs-index>", () => {
  beforeEach(() => {
    SiteData.url = NO_DATA
  })
  afterEach(() => Fixture.cleanup())

  it("draws a card per page, under each of its tags, the docs site's topics first", async () => {
    const element = Fixture.render(`<ui-docs-index pages='${JSON.stringify(PAGES)}'></ui-docs-index>`)
    await (element as unknown as { ready: Promise<void> }).ready
    await SiteData.load()
    await new Promise((resolve) => setTimeout(resolve))
    flush()
    expect(drawn(element)).toEqual([
      ["Basic", ["Both"]],
      ["Forms", ["Forms Thing", "Both"]]
    ])
  })

  it("with no `pages`, reads the <ui-site-nav> on the page", async () => {
    const holder = Fixture.render(
      `<div><ui-site-nav pages='${JSON.stringify(PAGES)}'></ui-site-nav><ui-docs-index></ui-docs-index></div>`
    )
    const element = holder.querySelector("ui-docs-index")!
    await (element as unknown as { ready: Promise<void> }).ready
    await SiteData.load()
    await new Promise((resolve) => setTimeout(resolve))
    flush()
    expect(drawn(element).map(([label]) => label)).toEqual(["Basic", "Forms"])
  })
})
