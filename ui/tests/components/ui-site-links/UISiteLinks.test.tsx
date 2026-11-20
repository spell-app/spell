import { describe, expect, test } from "vite-plus/test"

import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { ShadowTree } from "spell/ui/test-helpers/ShadowTree"
import { UISiteLinks, type SiteLinksPage } from "spell/ui/components/ui-site-links"

import "spell/ui/components/ui-site-nav"

/** A site:  a component's family with its original page, a group, and a page of Spell UI's own with none. */
const PAGES: SiteLinksPage[] = [
  {
    title: "Elements",
    id: "group:Elements",
    band: "group",
    pages: [
      {
        title: "Button",
        href: "/button",
        live: "https://fomantic-ui.com/elements/button.html",
        pages: [{ title: "API", href: "/button/api" }]
      },
      { title: "Dial", href: "/dial" }
    ]
  }
]

/** Where its report link goes, the family's title in it. */
const REPORT = "https://github.com/spell-app/spell-ui/issues/new?title={title}"

/** Site links in the page, showing `current`. */
async function siteLinks(current: string, report = REPORT) {
  const host = await ElementFixture.render(`<ui-site-links current="${current}" report="${report}"></ui-site-links>`)
  host.setAttribute("pages", JSON.stringify(PAGES))
  await ShadowTree.settle(host)
  return host
}

/** Its links:  each one's part and where it goes. */
function links(host: Element): { part: string | null; link: string | null; target: string | null }[] {
  return [...host.shadowRoot!.querySelectorAll("ui-button")].map((button) => ({
    part: button.getAttribute("part"),
    link: button.getAttribute("link"),
    target: button.getAttribute("target")
  }))
}

// epic `mockup` T55 (Owen, 2026-11-17:  "the page's links (report a bug, the original Fomantic page, the theme
// picker) go at the app bar's right end")
describe("<ui-site-links>", () => {
  test("defines its tag", () => {
    expect(UISiteLinks.describe().tag).toBe("ui-site-links")
  })

  test("the page shown's original, its own `live` else the nearest above it;  a report link naming its family", async () => {
    const host = await siteLinks("/button/api")
    expect(links(host)).toEqual([
      { part: "original", link: "https://fomantic-ui.com/elements/button.html", target: "_blank" },
      { part: "report", link: "https://github.com/spell-app/spell-ui/issues/new?title=Button", target: "_blank" }
    ])
    const original = host.shadowRoot!.querySelector('[part~="original"]')!
    expect(original.getAttribute("aria-label")).toBe("The original page")
    expect(original.getAttribute("title")).toBe("The original page")
    await expectAccessible(host)
  })

  test("a page with no original:  the report link alone;  no `report` either:  nothing, no room", async () => {
    const host = await siteLinks("/dial")
    expect(links(host).map((link) => link.part)).toEqual(["report"])
    host.removeAttribute("report")
    await ShadowTree.settle(host)
    expect(links(host)).toEqual([])
    expect(host.matches(":state(empty)")).toBe(true)
    expect(host.getBoundingClientRect().width).toBe(0)
  })

  test("with no `pages`, it follows the site navigation around it", async () => {
    const box = await ElementFixture.render(
      `<div><ui-site-nav current="/button"></ui-site-nav><ui-site-links></ui-site-links></div>`
    )
    box.querySelector("ui-site-nav")!.setAttribute("pages", JSON.stringify(PAGES))
    const host = box.querySelector("ui-site-links")!
    await ShadowTree.settle(host)
    await expect
      .poll(() => links(host).map((link) => link.link))
      .toEqual(["https://fomantic-ui.com/elements/button.html"])
  })
})
