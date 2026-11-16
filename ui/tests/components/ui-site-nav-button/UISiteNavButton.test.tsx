import { describe, expect, test, vi } from "vite-plus/test"

import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { ShadowTree } from "spell/ui/test-helpers/ShadowTree"
import { UISiteNavButton } from "spell/ui/components/ui-site-nav-button"
import type { DOMPageLayoutElement } from "spell/ui/components/ui-page-layout"

import "spell/ui/components/ui-app-menu"
import "spell/ui/components/ui-page-layout"
import "spell/ui/components/ui-site-nav"

/** A wide page layout, its button in its app menu's start, a navigation in its drawer. */
async function layoutWithButton() {
  const layout = await ElementFixture.render<DOMPageLayoutElement>(
    `<ui-page-layout style="width: 900px">
      <ui-app-menu slot="menu"><ui-site-nav-button slot="start"></ui-site-nav-button></ui-app-menu>
      <ui-site-nav slot="drawer" current="/a" pages='[{ "title": "A", "href": "/a", "icon": "home" }]'></ui-site-nav>
      <p>The page</p>
    </ui-page-layout>`
  )
  await ShadowTree.settle(layout)
  const button = layout.querySelector("ui-site-nav-button")!
  await ShadowTree.settle(button)
  return { layout, button, box: () => button.shadowRoot!.querySelector<HTMLElement>('[part~="item"]')! }
}

describe("<ui-site-nav-button>", () => {
  test("defines its tag", () => {
    expect(UISiteNavButton.describe().tag).toBe("ui-site-nav-button")
  })

  test("in an app menu, it's one of its items:  a button with the `columns` icon, named by its words", async () => {
    const { box, button } = await layoutWithButton()
    expect(box().localName).toBe("button")
    expect(box().getAttribute("aria-label")).toBe("Show or hide the side bar")
    expect(box().getAttribute("title")).toBe("Show or hide the side bar")
    expect(box().querySelector('[part~="icon"]')).not.toBeNull()
    await expectAccessible(button)
  })

  test("a click finds the layout around it and toggles its drawer;  `aria-expanded` follows it", async () => {
    const { layout, button, box } = await layoutWithButton()
    const toggled = vi.fn()
    layout.addEventListener("ui-toggle", toggled)
    expect(box().getAttribute("aria-expanded")).toBe("true")
    box().click()
    await ShadowTree.settle(button)
    expect(layout.getAttribute("drawer")).toBe("compact")
    expect(toggled).toHaveBeenCalledOnce()
    expect(box().getAttribute("aria-expanded")).toBe("false")
    // back to all of it a frame later:  the column widens from where it was (`toggleDrawer()`)
    box().click()
    await new Promise(requestAnimationFrame)
    await ShadowTree.settle(button)
    expect(layout.hasAttribute("drawer")).toBe(false)
    expect(box().getAttribute("aria-expanded")).toBe("true")
  })

  test("with one inside it, the layout draws no menu button of its own", async () => {
    const { layout } = await layoutWithButton()
    expect(layout.shadowRoot!.querySelector('[part~="menu-button"]')).toBeNull()
  })

  test("outside a menu, it's a small basic button doing the same", async () => {
    const layout = await ElementFixture.render<DOMPageLayoutElement>(
      `<ui-page-layout style="width: 900px">
        <ui-site-nav-button slot="menu"></ui-site-nav-button>
        <ui-site-nav slot="drawer" pages='[{ "title": "A", "href": "/a" }]'></ui-site-nav>
      </ui-page-layout>`
    )
    const button = layout.querySelector("ui-site-nav-button")!
    await ShadowTree.settle(button)
    const inner = button.shadowRoot!.querySelector("ui-button")!
    expect(inner.getAttribute("icon")).toBe("columns")
    expect(inner.getAttribute("appearance")).toBe("basic")
    ;(inner as HTMLElement).click()
    await ShadowTree.settle(layout)
    expect(layout.getAttribute("drawer")).toBe("compact")
  })
})
