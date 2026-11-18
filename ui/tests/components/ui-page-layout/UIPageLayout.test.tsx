import { describe, expect, test, vi } from "vite-plus/test"

import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { ShadowTree } from "spell/ui/test-helpers/ShadowTree"
import { UIPageLayout, type DOMPageLayoutElement } from "spell/ui/components/ui-page-layout"

import "spell/ui/components/ui-app-menu"
import "spell/ui/components/ui-button"
import "spell/ui/components/ui-site-nav"
import "spell/ui/components/ui-site-nav-button"

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
    expect(getComputedStyle(menu).getPropertyValue("--ui-menu-header-bar-shadow").trim()).toBe("none")
    // a shadow in a theme whose own shadows are none and whose lines are ink, as Mockup's (Owen:  "even in mockup")
    layout.style.cssText += ";  --ui-shadow-raised: none;  --ui-shadow-floating: none;  --ui-border-color: black"
    expect(getComputedStyle(underMenu).boxShadow).not.toBe("none")
    expect(underMenu.getBoundingClientRect().top).toBeCloseTo(menu.getBoundingClientRect().bottom, 0)
    expect(getComputedStyle(menu).getPropertyValue("--ui-menu-header-bar-background").trim()).not.toBe("")
  })

  // epic `mockup` I36 (Owen:  "Menus and other components should be multiples of 4.  Use shadows rather than bottom
  // borders so we don't have to worry about borders taking up space.  Top bar should have a shadow matching the side
  // border")
  describe("on the 4px grid, its edges shadows (I36)", () => {
    /** A site's frame:  an app menu with the drawer's button, breadcrumbs and a tertiary button, a drawer, a page. */
    const SITE =
      `<ui-app-menu slot="menu"><ui-site-nav-button slot="start"></ui-site-nav-button>` +
      `<ui-button slot="end" icon="bell" appearance="tertiary" size="small" title="Notices"></ui-button></ui-app-menu>` +
      `<ui-site-nav slot="drawer" appearance="nav" current="/a" pages='[{ "title": "A", "href": "/a", "icon": "house" },` +
      ` { "title": "B", "href": "/b", "icon": "film" }, { "title": "C", "href": "/c", "icon": "star" }]'></ui-site-nav>` +
      `<p>The page</p>`

    /** Is `pixels` a multiple of 4, to a hundredth? */
    const onGrid = (pixels: number) => Math.abs(pixels / 4 - Math.round(pixels / 4)) < 0.01

    /** The layout's boxes that should land on the grid:  their tops (from the layout's) and heights, by name. */
    async function measured(layout: DOMPageLayoutElement) {
      const nav = layout.querySelector("ui-site-nav")!
      const menuBar = layout.querySelector("ui-app-menu")!.shadowRoot!.querySelector<HTMLElement>(".ui.header.menu")!
      const button = layout.querySelector('ui-button[slot="end"]')!.shadowRoot!.querySelector("button")!
      await ShadowTree.settle(nav)
      await expect.poll(() => nav.shadowRoot!.querySelectorAll("ui-tree-item").length).toBe(3)
      // the menu's height reaches the navigation once the layout has measured it
      await expect.poll(() => getComputedStyle(nav).getPropertyValue("--ui-site-nav-bar-height")).toBe("40px")
      await ShadowTree.settle(nav)
      const top = layout.getBoundingClientRect().top
      const boxes: Record<string, Element> = { menu: box(layout, "menu")!, "menu bar": menuBar, "bar button": button }
      for (const [index, item] of [...nav.shadowRoot!.querySelectorAll("ui-tree-item")].entries())
        boxes[`row ${index + 1}`] = item.shadowRoot!.querySelector('[part~="row"]')!
      boxes["under the menu"] = box(layout, "page")!.parentElement!.parentElement!
      return Object.entries(boxes).map(([name, element]) => {
        const rect = element.getBoundingClientRect()
        return { name, top: +(rect.top - top).toFixed(2), height: +rect.height.toFixed(2) }
      })
    }

    test.each([
      ["the default font size", ""],
      ["a 17px font size (Mockup's)", "--ui-font-size: 17px; font-size: 17px"],
      ["a 15px font size", "--ui-font-size: 15px; font-size: 15px"]
    ])(
      "the menu 40px tall, its button 32px, the drawer's rows and the page side on the grid:  %s",
      async (_, style) => {
        const layout = await pageLayout(SITE)
        layout.style.cssText += `; ${style}`
        await ShadowTree.settle(layout)
        const boxes = await measured(layout)
        const named = Object.fromEntries(boxes.map((each) => [each.name, each]))
        expect(named.menu!.height).toBe(40)
        expect(named["menu bar"]!.height).toBe(40)
        expect(named["bar button"]!.height).toBe(32)
        expect(named["under the menu"]!.top).toBe(40)
        // every row:  where it starts and how tall it is, both on the grid (the current page's highlight too)
        for (const each of boxes.filter((one) => one.name.startsWith("row "))) {
          expect(onGrid(each.top), `${each.name} starts at ${each.top}`).toBe(true)
          expect(onGrid(each.height), `${each.name} is ${each.height} tall`).toBe(true)
        }
      }
    )

    test("the top bar's edge is the page side's own shadow, no line under it, in every arrangement", async () => {
      for (const [inner, width] of [
        [SITE, 900],
        [`<ui-app-menu slot="menu"></ui-app-menu><p>The page</p>`, 900],
        [SITE, 400]
      ] as const) {
        const layout = await pageLayout(inner, { width })
        const menu = box(layout, "menu")!
        const underMenu = box(layout, "page")!.parentElement!.parentElement!
        const bar = layout.querySelector("ui-app-menu")!.shadowRoot!.querySelector<HTMLElement>(".ui.header.menu")!
        expect(getComputedStyle(bar).borderBottomWidth).toBe("0px")
        expect(getComputedStyle(bar).boxShadow).toBe("none")
        const besideDrawer = !!layout.querySelector("ui-site-nav") && width > 600
        if (besideDrawer) {
          // the page side drawn over the bar, its shadow round its top as down its side
          expect(getComputedStyle(underMenu).position).toBe("relative")
          expect(getComputedStyle(underMenu).boxShadow).not.toBe("none")
          expect(getComputedStyle(menu).boxShadow).toBe("none")
        } else {
          // the menu's own, the same token, cast down over what's under it alone
          expect(getComputedStyle(menu).boxShadow).not.toBe("none")
          expect(getComputedStyle(menu).clipPath).toMatch(/inset\(0px 0px -/)
          expect(Number(getComputedStyle(menu).zIndex)).toBeGreaterThan(0)
        }
        layout.remove()
      }
    })
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
    expect((toggled.mock.calls[0]![0] as CustomEvent).detail).toEqual({
      region: "drawer",
      newState: "compact",
      oldState: "full"
    })
    // From its icons to all of it, the switch waits a frame:  the column holds its width first, to widen from
    layout.toggleDrawer()
    expect(layout.getAttribute("drawer")).toBe("compact")
    await new Promise(requestAnimationFrame)
    await ShadowTree.settle(layout)
    expect(layout.hasAttribute("drawer")).toBe(false)
    expect((toggled.mock.calls[1]![0] as CustomEvent).detail).toEqual({
      region: "drawer",
      newState: "full",
      oldState: "compact"
    })
  })

  // epic `mockup` T55 (Owen:  "Make a button in the app bar to hide it")
  test("`drawer-hides`:  wide, `toggleDrawer()` hides the whole drawer and shows it again, never its icons", async () => {
    const layout = await pageLayout(`${NAV}<p>The page</p>`)
    layout.setAttribute("drawer-hides", "")
    await ShadowTree.settle(layout)
    const toggled = vi.fn()
    layout.addEventListener("ui-toggle", toggled)
    layout.toggleDrawer()
    await ShadowTree.settle(layout)
    expect(layout.getAttribute("drawer")).toBe("hidden")
    expect(layout.matches(":state(drawer-hidden)")).toBe(true)
    expect((toggled.mock.calls[0]![0] as CustomEvent).detail).toEqual({
      region: "drawer",
      newState: "hidden",
      oldState: "full"
    })
    expect(layout.querySelector("ui-site-nav")!.hasAttribute("collapsed")).toBe(false)
    // the column narrows to nothing, and the page takes the room
    await expect.poll(() => box(layout, "drawer")!.getBoundingClientRect().width).toBeLessThan(1)
    await expect.poll(() => getComputedStyle(box(layout, "drawer")!).visibility).toBe("hidden")
    layout.toggleDrawer()
    await ShadowTree.settle(layout)
    expect(layout.hasAttribute("drawer")).toBe(false)
    expect((toggled.mock.calls[1]![0] as CustomEvent).detail).toEqual({
      region: "drawer",
      newState: "full",
      oldState: "hidden"
    })
    await expect.poll(() => box(layout, "drawer")!.getBoundingClientRect().width).toBeGreaterThan(160)
  })

  describe("the side bars close (T55)", () => {
    /** A right side bar, and a button for it in the menu. */
    const RIGHT =
      `<ui-app-menu slot="menu"><ui-site-nav-button slot="end" toggles="right"></ui-site-nav-button></ui-app-menu>` +
      `<div slot="right">Contents</div><p>The page</p>`

    test('wide, `toggleSidebar("right")` hides it (`right="hidden"`) and shows it again;  its button says so', async () => {
      const layout = await pageLayout(RIGHT)
      const button = layout.querySelector("ui-site-nav-button")!
      await ShadowTree.settle(button)
      const toggled = vi.fn()
      layout.addEventListener("ui-toggle", toggled)
      expect(box(layout, "right")!.getBoundingClientRect().width).toBeGreaterThan(0)
      const inner = () => button.shadowRoot!.querySelector('[part~="item"]')!
      expect(inner().getAttribute("aria-expanded")).toBe("true")
      expect(inner().getAttribute("aria-label")).toBe("Show or hide the right side bar")
      ;(inner() as HTMLElement).click()
      await ShadowTree.settle(layout)
      expect(layout.getAttribute("right")).toBe("hidden")
      expect(box(layout, "right")!.getBoundingClientRect().width).toBe(0)
      expect((toggled.mock.calls[0]![0] as CustomEvent).detail).toEqual({
        region: "right",
        newState: "hidden",
        oldState: "shown"
      })
      await ShadowTree.settle(button)
      expect(inner().getAttribute("aria-expanded")).toBe("false")
      layout.toggleSidebar("right")
      await ShadowTree.settle(layout)
      expect(layout.hasAttribute("right")).toBe(false)
      expect(box(layout, "right")!.getBoundingClientRect().width).toBeGreaterThan(0)
    })

    test("narrow, a side bar with its button hides behind it, and slides over the page while open;  Escape closes it", async () => {
      const layout = await pageLayout(RIGHT, { width: 360 })
      await expect.poll(() => layout.matches(":state(narrow)")).toBe(true)
      expect(layout.matches(":state(right-closable)")).toBe(true)
      expect(getComputedStyle(box(layout, "right")!).visibility).toBe("hidden")
      expect(getComputedStyle(box(layout, "right")!).position).toBe("absolute")
      layout.toggleSidebar("right")
      await ShadowTree.settle(layout)
      expect(layout.matches(":state(right-open)")).toBe(true)
      expect(layout.hasAttribute("right")).toBe(false)
      await expect.poll(() => getComputedStyle(box(layout, "right")!).visibility).toBe("visible")
      layout.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
      await ShadowTree.settle(layout)
      expect(layout.matches(":state(right-open)")).toBe(false)
    })

    test("narrow, a side bar with no button stays in the row", async () => {
      const layout = await pageLayout(`<div slot="right">Contents</div><p>The page</p>`, { width: 360 })
      await expect.poll(() => layout.matches(":state(narrow)")).toBe(true)
      expect(layout.matches(":state(right-closable)")).toBe(false)
      expect(getComputedStyle(box(layout, "right")!).position).toBe("static")
      expect(getComputedStyle(box(layout, "right")!).visibility).toBe("visible")
    })
  })

  describe("`floating` (T55):  the drawer and the side bars cards over the page's ground", () => {
    test("each a rounded card with a shadow, room round it;  the page's side no box of its own", async () => {
      const layout = await pageLayout(
        `<div slot="menu">Menu</div>${NAV}<div slot="right">Contents</div><p>The page</p>`
      )
      layout.setAttribute("floating", "")
      await ShadowTree.settle(layout)
      expect(layout.matches(":state(floating)")).toBe(true)
      const host = layout.getBoundingClientRect()
      const drawerBox = box(layout, "drawer-box")!
      const right = box(layout, "right")!
      for (const card of [drawerBox, right]) {
        const style = getComputedStyle(card)
        expect(style.boxShadow).not.toBe("none")
        expect(parseFloat(style.borderTopLeftRadius)).toBeGreaterThan(0)
      }
      expect(drawerBox.getBoundingClientRect().left - host.left).toBeCloseTo(12, 0)
      expect(drawerBox.getBoundingClientRect().top - host.top).toBeCloseTo(12, 0)
      expect(host.right - right.getBoundingClientRect().right).toBeCloseTo(12, 0)
      // the menu as far down as the drawer's card
      expect(box(layout, "menu")!.getBoundingClientRect().top - host.top).toBeCloseTo(12, 0)
      const underMenu = box(layout, "page")!.parentElement!.parentElement!
      expect(getComputedStyle(underMenu).boxShadow).toBe("none")
      expect(getComputedStyle(underMenu).backgroundColor).toBe("rgba(0, 0, 0, 0)")
    })
  })

  // epic `mockup` I26 (Owen:  "Delay in hover animation on sidebar slide out takes too long, feels like an error"),
  // then C1 on J161 (Owen:  "Change to a 1/2 second hover to open.  Close timing is fine.")
  test("compact, the pointer resting on the drawer half a second opens it over the page, not the page's hover delay;  the page staying put", async () => {
    const layout = await pageLayout(`${NAV}<p>The page</p>`, { drawer: "compact" })
    layout.style.setProperty("--ui-hover-delay", "5s")
    const page = box(layout, "page")!
    const before = page.getBoundingClientRect().left
    const drawer = box(layout, "drawer")!
    const rested = performance.now()
    drawer.dispatchEvent(new PointerEvent("pointerenter", { pointerType: "mouse" }))
    await new Promise((done) => setTimeout(done, 350))
    expect(layout.matches(":state(open)")).toBe(false)
    await expect.poll(() => layout.matches(":state(open)"), { timeout: 1000, interval: 10 }).toBe(true)
    expect(performance.now() - rested).toBeGreaterThanOrEqual(490)
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

  // epic `mockup` J144:  the keyboard's focus opens it at once
  test("compact, the keyboard's focus coming into the drawer opens it at once", async () => {
    const layout = await pageLayout(`${NAV}<p>The page</p>`, { drawer: "compact" })
    box(layout, "drawer")!.dispatchEvent(new FocusEvent("focusin", { bubbles: true, composed: true }))
    await ShadowTree.settle(layout)
    expect(layout.matches(":state(open)")).toBe(true)
  })

  // epic `mockup` C1 on J161 (Owen:  "The fixed icons (home, person, etc) should not move when the drawer opens")
  test("compact, its icons stay where they are as it opens over the page", async () => {
    const layout = await pageLayout(`${NAV}<p>The page</p>`, { drawer: "compact" })
    const nav = layout.querySelector("ui-site-nav")!
    /** Each row's icon's middle, as drawn:  `<ui-icon>`'s own box takes no room. */
    const middles = () =>
      [...nav.shadowRoot!.querySelectorAll("ui-tree-item")].map((item) => {
        const host = item.querySelector('[slot="icon"]') ?? item.shadowRoot!.querySelector(".icon")!
        const icon = (host.shadowRoot?.querySelector(".icon") ?? host).getBoundingClientRect()
        return +(icon.left + icon.width / 2).toFixed(1)
      })
    const closed = middles()
    expect(closed.length).toBe(2)
    box(layout, "drawer")!.dispatchEvent(new PointerEvent("pointerenter", { pointerType: "mouse" }))
    await expect.poll(() => layout.matches(":state(open)"), { timeout: 1500 }).toBe(true)
    await expect.poll(() => layout.matches(":state(moving)")).toBe(false)
    expect(nav.hasAttribute("collapsed")).toBe(false)
    middles().forEach((middle, index) => expect(middle).toBeCloseTo(closed[index]!, 0))
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
