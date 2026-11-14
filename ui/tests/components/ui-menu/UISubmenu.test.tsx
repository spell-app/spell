import { userEvent } from "vite-plus/test/browser"
import { describe, expect, onTestFinished, test } from "vite-plus/test"

import { A11y } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { Viewport } from "spell/test-helpers/Viewport"
import type { DOMElement } from "spell/element"

import "spell/ui/components/ui-menu"
import "spell/ui/components/ui-icon"

/** A vertical menu:  a plain item, two rows with fly-outs of items written inside, another plain item. */
const NESTED = `
  <ui-menu direction="vertical" aria-label="Edit" style="width: 220px">
    <ui-item appearance="link">Cut</ui-item>
    <ui-submenu label="Theme" icon="paint brush">
      <ui-item value="light">Light</ui-item>
      <ui-item value="dark">Dark</ui-item>
    </ui-submenu>
    <ui-submenu label="Size">
      <ui-item>Small</ui-item>
      <ui-item>Large</ui-item>
    </ui-submenu>
    <ui-item appearance="link">Paste</ui-item>
  </ui-menu>`

/** A vertical menu whose row shows a menu elsewhere on the page, by id. */
const BY_ID = `
  <div>
    <ui-menu direction="vertical" aria-label="File" style="width: 220px">
      <ui-item appearance="link">Open</ui-item>
      <ui-submenu label="More Examples" menu="examples-menu"></ui-submenu>
    </ui-menu>
    <ui-menu id="examples-menu" popover direction="vertical" aria-label="More Examples">
      <ui-item value="solitaire">Solitaire</ui-item>
      <ui-item value="todos">Todos</ui-item>
    </ui-menu>
  </div>`

/** What `A11y.format()` says of no violations. */
const CLEAN = "no accessibility violations"

/**
 * Move the real pointer to the window's corner, off where the next fixture draws:
 * left over a row from the last test, it would open that row's fly-out.
 */
async function parkPointer() {
  const spot = document.createElement("div")
  spot.style.cssText = "position: fixed; right: 0; bottom: 0; width: 4px; height: 4px"
  document.body.append(spot)
  await userEvent.hover(spot)
  spot.remove()
}

/** Render `html`, with the pointer out of the way;  returns the top menu and its `<ui-submenu>`s. */
async function render(html = NESTED) {
  await parkPointer()
  const root = await ElementFixture.render<HTMLElement>(html)
  const menu = (root.localName === "ui-menu" ? root : root.querySelector("ui-menu"))! as DOMElement
  await ElementFixture.settle()
  return { root, menu, submenus: [...menu.querySelectorAll<DOMElement>("ui-submenu")] }
}

/** A `<ui-submenu>`'s (or item's) row:  its `[part~=item]` box. */
function rowOf(element: Element): HTMLElement {
  return element.shadowRoot!.querySelector<HTMLElement>("[part~=item]")!
}

/** The box a `<ui-submenu>` draws round the items inside it. */
function flyoutOf(submenu: Element): HTMLElement {
  return submenu.shadowRoot!.querySelector<HTMLElement>("[part~=flyout]")!
}

/** The fly-out's box is showing, in the top layer. */
function isShowing(box: Element): boolean {
  return box.matches(":popover-open")
}

/** The focused element, through shadow roots. */
function deepActive(): Element | null {
  let active = document.activeElement
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement
  return active
}

/** A synthetic mouse event of `type` on `target`, at its middle unless `at` says where. */
function pointer(type: string, target: Element, at?: { x: number; y: number }) {
  const box = target.getBoundingClientRect()
  const { x, y } = at ?? { x: box.left + box.width / 2, y: box.top + box.height / 2 }
  target.dispatchEvent(
    new PointerEvent(type, { bubbles: true, composed: true, pointerType: "mouse", clientX: x, clientY: y })
  )
}

////////////////
// ## Opening
////////////////

describe("<ui-submenu> opening", () => {
  test("the pointer over its row opens the fly-out of the items written inside, beside the row", async () => {
    const { submenus } = await render()
    await Viewport.resize(1000)
    const [theme] = submenus
    await userEvent.hover(rowOf(theme!))
    await ElementFixture.settle()
    expect(isShowing(flyoutOf(theme!))).toBe(true)
    expect(theme!.matches(":state(open)")).toBe(true)
    const row = rowOf(theme!).getBoundingClientRect()
    const flyout = flyoutOf(theme!).getBoundingClientRect()
    expect(flyout.left).toBeGreaterThanOrEqual(row.right - 2)
    expect(Math.abs(flyout.top - row.top)).toBeLessThan(12)
    // its items draw as a menu's:  in the fly-out, owned by the menu it draws round them
    const light = theme!.querySelector("ui-item")!
    expect(light.matches(":state(in-menu)")).toBe(true)
    expect(rowOf(light).getBoundingClientRect().width).toBeGreaterThan(0)
  })

  test("a click opens it, and leaves it open;  its row chooses nothing", async () => {
    const { menu, submenus } = await render()
    const [theme] = submenus
    const choices: string[] = []
    menu.addEventListener("ui-choosing", (event) => choices.push((event as CustomEvent).detail.value))
    await userEvent.click(rowOf(theme!))
    await userEvent.click(rowOf(theme!))
    await ElementFixture.settle()
    expect(isShowing(flyoutOf(theme!))).toBe(true)
    expect(choices).toEqual([])
  })

  test("only ONE open per menu:  opening another closes the first", async () => {
    const { submenus } = await render()
    const [theme, size] = submenus
    await userEvent.click(rowOf(theme!))
    await ElementFixture.settle()
    await userEvent.click(rowOf(size!))
    await ElementFixture.settle()
    expect(isShowing(flyoutOf(theme!))).toBe(false)
    expect(isShowing(flyoutOf(size!))).toBe(true)
  })

  test("the pointer settling on a plain row closes it", async () => {
    const { menu, submenus } = await render()
    const [theme] = submenus
    await userEvent.hover(rowOf(theme!))
    await ElementFixture.settle()
    await userEvent.hover(rowOf(menu.querySelector("ui-item")!))
    // the aim gives up once the pointer rests off the row and its fly-out
    await expect.poll(() => isShowing(flyoutOf(theme!)), { timeout: 2000 }).toBe(false)
  })

  test("disabled:  neither the pointer nor a click opens it", async () => {
    const { submenus } = await render()
    const [theme] = submenus
    theme!.setAttribute("disabled", "")
    await ElementFixture.settle()
    pointer("pointerover", rowOf(theme!))
    rowOf(theme!).click()
    await ElementFixture.settle()
    expect(isShowing(flyoutOf(theme!))).toBe(false)
  })
})

////////////////
// ## The aim
////////////////

describe("<ui-submenu> and SubMenuAim", () => {
  test("heading for the open fly-out across another row doesn't switch;  resting there does", async () => {
    const { submenus } = await render()
    const [theme, size] = submenus
    await userEvent.hover(rowOf(theme!))
    await ElementFixture.settle()
    expect(isShowing(flyoutOf(theme!))).toBe(true)
    // the pointer crosses the Size row on its way:  Theme's fly-out stays, Size's doesn't open
    pointer("pointerover", rowOf(size!))
    await ElementFixture.settle()
    expect(isShowing(flyoutOf(theme!))).toBe(true)
    expect(isShowing(flyoutOf(size!))).toBe(false)
    // ... and rests there:  the aim gives up, and the row under the pointer opens its own
    pointer("pointermove", rowOf(size!))
    await expect.poll(() => isShowing(flyoutOf(size!)), { timeout: 2000 }).toBe(true)
    expect(isShowing(flyoutOf(theme!))).toBe(false)
  })
})

////////////////
// ## By id
////////////////

describe('<ui-submenu menu="id">', () => {
  test("shows the named menu where it is, beside the row, as a fly-out;  hidden until then", async () => {
    const { root, submenus } = await render(BY_ID)
    await Viewport.resize(1000)
    const named = root.querySelector<DOMElement>("#examples-menu")!
    const box = named.shadowRoot!.querySelector("[part~=menu]")!
    expect(box.checkVisibility()).toBe(false)
    await userEvent.click(rowOf(submenus[0]!))
    await ElementFixture.settle()
    expect(isShowing(named)).toBe(true)
    // not moved:  still the page's own element, where it was written
    expect(named.parentElement).toBe(root)
    expect(box.checkVisibility()).toBe(true)
    expect(box.getAttribute("role")).toBe("menu")
    const row = rowOf(submenus[0]!).getBoundingClientRect()
    const flyout = named.getBoundingClientRect()
    expect(flyout.left).toBeGreaterThanOrEqual(row.right - 2)
    expect(Math.abs(flyout.top - row.top)).toBeLessThan(12)
  })

  test("choosing one of its items is a choice in the row's menu, ONCE, and closes it", async () => {
    const { root, menu, submenus } = await render(BY_ID)
    const named = root.querySelector<DOMElement>("#examples-menu")!
    const choices: string[] = []
    const onChoosing = (event: Event) => choices.push((event as CustomEvent).detail.value)
    document.addEventListener("ui-choosing", onChoosing)
    onTestFinished(() => document.removeEventListener("ui-choosing", onChoosing))
    const inMenu: string[] = []
    menu.addEventListener("ui-choosing", (event) => inMenu.push((event as CustomEvent).detail.value))
    await userEvent.click(rowOf(submenus[0]!))
    await ElementFixture.settle()
    await userEvent.click(rowOf(named.querySelectorAll("ui-item")[1]!))
    await ElementFixture.settle()
    expect(inMenu).toEqual(["todos"])
    expect(choices).toEqual(["todos"])
    expect(isShowing(named)).toBe(false)
  })
})

////////////////
// ## Keyboard
////////////////

describe("<ui-submenu> keyboard", () => {
  test("→ opens it, focus on its first item;  ← closes it, focus back on the row", async () => {
    const { submenus } = await render()
    const [theme] = submenus
    rowOf(theme!).focus()
    await userEvent.keyboard("{ArrowRight}")
    await ElementFixture.settle()
    expect(isShowing(flyoutOf(theme!))).toBe(true)
    expect(deepActive()).toBe(rowOf(theme!.querySelector("ui-item")!))
    // arrows move between its items
    await userEvent.keyboard("{ArrowDown}")
    expect(deepActive()).toBe(rowOf(theme!.querySelectorAll("ui-item")[1]!))
    await userEvent.keyboard("{ArrowLeft}")
    await ElementFixture.settle()
    expect(isShowing(flyoutOf(theme!))).toBe(false)
    expect(deepActive()).toBe(rowOf(theme!))
  })

  test("Enter opens it with focus inside;  Escape closes it, focus back on the row", async () => {
    const { submenus } = await render()
    const [theme] = submenus
    rowOf(theme!).focus()
    await userEvent.keyboard("{Enter}")
    await ElementFixture.settle()
    expect(isShowing(flyoutOf(theme!))).toBe(true)
    expect(deepActive()).toBe(rowOf(theme!.querySelector("ui-item")!))
    await userEvent.keyboard("{Escape}")
    await ElementFixture.settle()
    expect(isShowing(flyoutOf(theme!))).toBe(false)
    expect(deepActive()).toBe(rowOf(theme!))
  })

  test("the pointer opening it leaves focus where it was", async () => {
    const { submenus } = await render()
    const [theme] = submenus
    await userEvent.hover(rowOf(theme!))
    await ElementFixture.settle()
    expect(isShowing(flyoutOf(theme!))).toBe(true)
    expect(theme!.contains(deepActive()) || deepActive() === document.body).toBe(true)
    expect(deepActive()).not.toBe(rowOf(theme!.querySelector("ui-item")!))
  })

  test("a right-to-left page swaps the arrows:  ← opens, → closes", async () => {
    const { root, submenus } = await render(`<div dir="rtl">${NESTED}</div>`)
    const [theme] = submenus
    rowOf(theme!).focus()
    await userEvent.keyboard("{ArrowLeft}")
    await ElementFixture.settle()
    expect(isShowing(flyoutOf(theme!))).toBe(true)
    await userEvent.keyboard("{ArrowRight}")
    await ElementFixture.settle()
    expect(isShowing(flyoutOf(theme!))).toBe(false)
    expect(root.getAttribute("dir")).toBe("rtl")
  })
})

////////////////
// ## Closing
////////////////

describe("<ui-submenu> closing", () => {
  test("choosing an item inside closes every fly-out;  the menu's ui-choosing goes on up ONCE", async () => {
    const { menu, submenus } = await render()
    const [theme] = submenus
    const choices: string[] = []
    menu.addEventListener("ui-choosing", (event) => choices.push((event as CustomEvent).detail.value))
    await userEvent.click(rowOf(theme!))
    await ElementFixture.settle()
    await userEvent.click(rowOf(theme!.querySelectorAll("ui-item")[1]!))
    await ElementFixture.settle()
    expect(choices).toEqual(["dark"])
    expect(isShowing(flyoutOf(theme!))).toBe(false)
  })

  test("its menu closing (hidden) closes the fly-out", async () => {
    const { menu, submenus } = await render()
    const [theme] = submenus
    await userEvent.click(rowOf(theme!))
    await ElementFixture.settle()
    expect(isShowing(flyoutOf(theme!))).toBe(true)
    menu.style.display = "none"
    await expect.poll(() => isShowing(flyoutOf(theme!))).toBe(false)
  })

  test("a click outside closes every fly-out open, one inside another too", async () => {
    const { root, submenus } = await render(
      `<div>${NESTED.replace("<ui-item>Small</ui-item>", '<ui-submenu label="More"><ui-item>Huge</ui-item></ui-submenu>')}<button>Outside</button></div>`
    )
    await Viewport.resize(1000)
    const [theme, size, more] = submenus
    await userEvent.click(rowOf(theme!))
    await ElementFixture.settle()
    await userEvent.click(root.querySelector("button")!)
    await ElementFixture.settle()
    expect(isShowing(flyoutOf(theme!))).toBe(false)
    await userEvent.click(rowOf(size!))
    await ElementFixture.settle()
    await userEvent.click(rowOf(more!))
    await ElementFixture.settle()
    expect(isShowing(flyoutOf(more!))).toBe(true)
    await userEvent.click(root.querySelector("button")!)
    await ElementFixture.settle()
    expect(isShowing(flyoutOf(more!))).toBe(false)
    expect(isShowing(flyoutOf(size!))).toBe(false)
  })

  test("a fly-out inside a fly-out:  ← closes only the inner one", async () => {
    const { submenus } = await render(`
      <ui-menu direction="vertical" aria-label="View" style="width: 220px">
        <ui-submenu label="Panels">
          <ui-item>Tree</ui-item>
          <ui-submenu label="More"><ui-item>Console</ui-item></ui-submenu>
        </ui-submenu>
      </ui-menu>`)
    const [panels, more] = submenus
    rowOf(panels!).focus()
    await userEvent.keyboard("{ArrowRight}")
    await ElementFixture.settle()
    await userEvent.keyboard("{ArrowDown}")
    expect(deepActive()).toBe(rowOf(more!))
    await userEvent.keyboard("{ArrowRight}")
    await ElementFixture.settle()
    expect(isShowing(flyoutOf(more!))).toBe(true)
    expect(deepActive()).toBe(rowOf(more!.querySelector("ui-item")!))
    await userEvent.keyboard("{ArrowLeft}")
    await ElementFixture.settle()
    expect(isShowing(flyoutOf(more!))).toBe(false)
    expect(isShowing(flyoutOf(panels!))).toBe(true)
    expect(deepActive()).toBe(rowOf(more!))
  })
})

////////////////
// ## Accessibility
////////////////

describe("<ui-submenu> semantics", () => {
  test("its row:  a button that has a menu popup, expanded while open;  the fly-out a menu of menu items", async () => {
    const { submenus } = await render()
    const [theme] = submenus
    const row = rowOf(theme!)
    expect(row.localName).toBe("button")
    expect(row.getAttribute("aria-haspopup")).toBe("menu")
    expect(row.getAttribute("aria-expanded")).toBe("false")
    await userEvent.click(row)
    await ElementFixture.settle()
    expect(row.getAttribute("aria-expanded")).toBe("true")
    const inner = flyoutOf(theme!).querySelector("ui-menu")!
    const box = inner.shadowRoot!.querySelector("[part~=menu]")!
    expect(box.getAttribute("role")).toBe("menu")
    expect(box.getAttribute("aria-label")).toBe("Theme")
    expect(rowOf(theme!.querySelector("ui-item")!).getAttribute("role")).toBe("menuitem")
  })

  test("in a menubar its row is a menuitem too", async () => {
    const { submenus } = await render(NESTED.replace('direction="vertical"', 'direction="vertical" interactive'))
    expect(rowOf(submenus[0]!).getAttribute("role")).toBe("menuitem")
  })

  test("axe:  no violations, closed and open, both ways", async () => {
    const nested = await render()
    expect(A11y.format((await A11y.check(nested.root)).violations)).toBe(CLEAN)
    await userEvent.click(rowOf(nested.submenus[0]!))
    await ElementFixture.settle()
    expect(A11y.format((await A11y.check(nested.root)).violations)).toBe(CLEAN)
    const byId = await render(BY_ID)
    await userEvent.click(rowOf(byId.submenus[0]!))
    await ElementFixture.settle()
    expect(A11y.format((await A11y.check(byId.root)).violations)).toBe(CLEAN)
  })
})
