import { describe, expect, test, vi } from "vite-plus/test"

import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { ShadowTree } from "spell/ui/test-helpers/ShadowTree"
import { UIPageLayout, type DOMPageLayoutElement } from "spell/ui/components/ui-page-layout"

import "spell/ui/components/ui-site-nav"

/** A navigation for the drawer. */
const NAV = `<ui-site-nav slot="drawer" current="/a" pages='[{ "title": "A", "href": "/a", "icon": "home" }, { "title": "B", "href": "/b", "icon": "film" }]'></ui-site-nav>`

/** A page layout of `width` pixels holding `inner`, drawn. */
async function pageLayout(inner: string, { width = 900, drawer }: { width?: number; drawer?: string } = {}) {
  const attribute = drawer ? ` drawer="${drawer}"` : ""
  const layout = await ElementFixture.render<DOMPageLayoutElement>(
    `<ui-page-layout${attribute} style="width: ${width}px; height: 400px">${inner}</ui-page-layout>`
  )
  await ShadowTree.settle(layout)
  await ElementFixture.tick()
  return layout
}

/** Its box `part`, or `null` when it isn't drawn. */
function box(layout: Element, part: string): HTMLElement | null {
  return layout.shadowRoot!.querySelector<HTMLElement>(`[part~="${part}"]`)
}

describe("<ui-page-layout>", () => {
  test("defines its tag", () => {
    expect(UIPageLayout.describe().tag).toBe("ui-page-layout")
  })

  test("draws a region only while its slot has content:  an empty one takes no room", async () => {
    const layout = await pageLayout(`<p>The page</p>`)
    for (const part of ["drawer", "menu", "page-menu", "left", "right", "footer"]) expect(box(layout, part)).toBeNull()
    expect(box(layout, "page")!.getBoundingClientRect().width).toBeCloseTo(900, 0)
    layout.insertAdjacentHTML("beforeend", `<div slot="footer">Footer</div><div slot="left">Left</div>`)
    await ShadowTree.settle(layout)
    expect(box(layout, "footer")).not.toBeNull()
    expect(box(layout, "left")).not.toBeNull()
    await expectAccessible(layout)
  })

  test("the drawer is a column the whole height at the start;  the page a font size in, the menu flush against it", async () => {
    const layout = await pageLayout(`<div slot="menu">Menu</div>${NAV}<p>The page</p>`)
    const drawer = box(layout, "drawer")!.getBoundingClientRect()
    const host = layout.getBoundingClientRect()
    expect(drawer.left).toBeCloseTo(host.left, 0)
    expect(drawer.height).toBeCloseTo(host.height, 0)
    expect(drawer.width).toBeGreaterThanOrEqual(160)
    expect(drawer.width).toBeLessThanOrEqual(257)
    expect(box(layout, "menu")!.getBoundingClientRect().left).toBeCloseTo(drawer.right, 0)
    const underMenu = box(layout, "page")!.parentElement!.parentElement!
    expect(parseFloat(getComputedStyle(underMenu).paddingInlineStart)).toBeGreaterThan(0)
  })

  test("the menu and the drawer read as one surface:  the menu on the drawer's fill;  the page's side a box under it, a soft shadow round it, no line (I32)", async () => {
    const layout = await pageLayout(`<div slot="menu">Menu</div>${NAV}<p>The page</p>`)
    const drawer = box(layout, "drawer")!
    const menu = box(layout, "menu")!
    const underMenu = box(layout, "page")!.parentElement!.parentElement!
    expect(getComputedStyle(drawer).borderInlineEndWidth).toBe("0px")
    expect(getComputedStyle(underMenu).borderInlineStartWidth).toBe("0px")
    expect(getComputedStyle(underMenu).boxShadow).not.toBe("none")
    expect(parseFloat(getComputedStyle(underMenu).borderTopLeftRadius)).toBeGreaterThan(0)
    expect(getComputedStyle(menu).getPropertyValue("--ui-menu-header-bar-border").trim()).toBe("none")
    // a shadow in a theme whose own shadows are none and whose lines are ink, as Mockup's (Owen:  "even in mockup")
    layout.style.cssText += ";  --ui-shadow-raised: none;  --ui-shadow-floating: none;  --ui-border-color: black"
    expect(getComputedStyle(underMenu).boxShadow).not.toBe("none")
    expect(underMenu.getBoundingClientRect().top).toBeCloseTo(menu.getBoundingClientRect().bottom, 0)
    expect(getComputedStyle(menu).getPropertyValue("--ui-menu-header-bar-background").trim()).not.toBe("")
  })

  test('`drawer="compact"` sets `collapsed` on the navigation in it, and takes it off again', async () => {
    const layout = await pageLayout(NAV, { drawer: "compact" })
    const nav = layout.querySelector("ui-site-nav")!
    expect(nav.hasAttribute("collapsed")).toBe(true)
    expect(layout.matches(":state(compact)")).toBe(true)
    layout.removeAttribute("drawer")
    await ShadowTree.settle(layout)
    expect(nav.hasAttribute("collapsed")).toBe(false)
  })

  test("wide, `toggleDrawer()` switches `drawer` and sends `ui-toggle`", async () => {
    const layout = await pageLayout(NAV)
    const toggled = vi.fn()
    layout.addEventListener("ui-toggle", toggled)
    // to its icons a frame later:  the width they take is measured first
    layout.toggleDrawer()
    await new Promise(requestAnimationFrame)
    await ShadowTree.settle(layout)
    expect(layout.getAttribute("drawer")).toBe("compact")
    // all of it while the column narrows, clipped;  its icons only once it's narrow (I32)
    await expect.poll(() => layout.querySelector("ui-site-nav")!.hasAttribute("collapsed")).toBe(true)
    expect((toggled.mock.calls[0]![0] as CustomEvent).detail).toEqual({ newState: "compact", oldState: "full" })
    // From its icons to all of it, the switch waits a frame:  the column holds its width first, to widen from
    layout.toggleDrawer()
    expect(layout.getAttribute("drawer")).toBe("compact")
    await new Promise(requestAnimationFrame)
    await ShadowTree.settle(layout)
    expect(layout.hasAttribute("drawer")).toBe(false)
    expect((toggled.mock.calls[1]![0] as CustomEvent).detail).toEqual({ newState: "full", oldState: "compact" })
  })

  // epic `mockup` I26 (Owen:  "Delay in hover animation on sidebar slide out takes too long, feels like an error")
  test("compact, the pointer resting on the drawer a moment opens it over the page, not the page's hover delay;  the page staying put", async () => {
    const layout = await pageLayout(`${NAV}<p>The page</p>`, { drawer: "compact" })
    layout.style.setProperty("--ui-hover-delay", "5s")
    const page = box(layout, "page")!
    const before = page.getBoundingClientRect().left
    const drawer = box(layout, "drawer")!
    drawer.dispatchEvent(new PointerEvent("pointerenter", { pointerType: "mouse" }))
    await ElementFixture.tick()
    expect(layout.matches(":state(open)")).toBe(false)
    await expect.poll(() => layout.matches(":state(open)"), { timeout: 400 }).toBe(true)
    await ShadowTree.settle(layout)
    expect(layout.querySelector("ui-site-nav")!.hasAttribute("collapsed")).toBe(false)
    expect(page.getBoundingClientRect().left).toBeCloseTo(before, 0)
    expect(box(layout, "drawer-box")!.getBoundingClientRect().width).toBeGreaterThan(
      drawer.getBoundingClientRect().width
    )
    // a slip off its edge and back keeps it open;  off it, it closes a moment later
    drawer.dispatchEvent(new PointerEvent("pointerleave", { pointerType: "mouse" }))
    drawer.dispatchEvent(new PointerEvent("pointerenter", { pointerType: "mouse" }))
    await new Promise((done) => setTimeout(done, 250))
    expect(layout.matches(":state(open)")).toBe(true)
    drawer.dispatchEvent(new PointerEvent("pointerleave", { pointerType: "mouse" }))
    await ShadowTree.settle(layout)
    expect(layout.matches(":state(open)")).toBe(true)
    await expect.poll(() => layout.matches(":state(open)")).toBe(false)
    await ShadowTree.settle(layout)
    expect(layout.querySelector("ui-site-nav")!.hasAttribute("collapsed")).toBe(true)
  })

  test("narrow (below 40em of its own box), one column:  `toggleDrawer()` slides the drawer in, Escape closes it", async () => {
    const layout = await pageLayout(`${NAV}<p>The page</p>`, { width: 400 })
    await expect.poll(() => layout.matches(":state(narrow)")).toBe(true)
    const drawer = box(layout, "drawer")!
    expect(getComputedStyle(drawer).position).toBe("absolute")
    expect(getComputedStyle(drawer).visibility).toBe("hidden")
    expect(box(layout, "page")!.getBoundingClientRect().left).toBeCloseTo(layout.getBoundingClientRect().left, 0)
    const toggled = vi.fn()
    layout.addEventListener("ui-toggle", toggled)
    layout.toggleDrawer()
    await ShadowTree.settle(layout)
    expect(layout.matches(":state(open)")).toBe(true)
    expect(layout.hasAttribute("drawer")).toBe(false)
    expect(toggled).not.toHaveBeenCalled()
    layout
      .querySelector("ui-site-nav")!
      .dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true }))
    await ShadowTree.settle(layout)
    expect(layout.matches(":state(open)")).toBe(false)
  })

  test("narrow, going to a page from the drawer closes it", async () => {
    const layout = await pageLayout(`${NAV}<p>The page</p>`, { width: 400 })
    await expect.poll(() => layout.matches(":state(narrow)")).toBe(true)
    layout.toggleDrawer()
    await ShadowTree.settle(layout)
    const nav = layout.querySelector("ui-site-nav")!
    nav.dispatchEvent(new CustomEvent("ui-navigating", { bubbles: true, composed: true, detail: { href: "/b" } }))
    await ShadowTree.settle(layout)
    expect(layout.matches(":state(open)")).toBe(false)
  })

  test("with a drawer and no `<ui-site-nav-button>`, its own menu button shows at a narrow width only, and slides the drawer in", async () => {
    const wide = await pageLayout(`${NAV}<p>The page</p>`)
    expect(getComputedStyle(box(wide, "menu-button")!).display).toBe("none")
    const narrow = await pageLayout(`${NAV}<p>The page</p>`, { width: 400 })
    await expect.poll(() => narrow.matches(":state(narrow)")).toBe(true)
    const button = box(narrow, "menu-button")!
    expect(getComputedStyle(button).display).not.toBe("none")
    expect(button.getAttribute("icon")).toBe("bars")
    button.click()
    await ShadowTree.settle(narrow)
    expect(narrow.matches(":state(open)")).toBe(true)
    expect(button.getAttribute("aria-expanded")).toBe("true")
    const none = await pageLayout(`<p>No drawer</p>`, { width: 400 })
    expect(box(none, "menu-button")).toBeNull()
  })
})
