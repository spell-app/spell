import { userEvent } from "vite-plus/test/browser"
import { describe, expect, onTestFinished, test, vi } from "vite-plus/test"

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

/** The mouse leaving `box` for `to` (`pointerleave`, which neither bubbles nor crosses a shadow root). */
function leave(box: Element, to: Element) {
  box.dispatchEvent(new PointerEvent("pointerleave", { pointerType: "mouse", relatedTarget: to }))
}

/** How long a fly-out waits after the pointer leaves it, ms (`LEAVE_SECONDS`). */
const LEAVE_MS = 300

/** Fake the timers from here to the test's end:  the fly-out's close-on-leave is one. */
function fakeTimers() {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
  onTestFinished(() => void vi.useRealTimers())
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

  test("→ focuses its chosen item, when one is", async () => {
    const { submenus } = await render(BOXES)
    const view = submenus[2]!
    view.querySelector("ui-item")!.removeAttribute("selected")
    view.querySelectorAll("ui-item")[1]!.setAttribute("selected", "")
    await ElementFixture.settle()
    rowOf(view).focus()
    await userEvent.keyboard("{ArrowRight}")
    await ElementFixture.settle()
    expect(deepActive()).toBe(rowOf(view.querySelectorAll("ui-item")[1]!))
  })

  test("→ hands focus to rich content that knows its chosen row (`focusChosen()`), before the items after it", async () => {
    const { submenus } = await render(
      NESTED.replace('<ui-item value="light">Light</ui-item>', '<div class="rich"><button>Chosen</button></div>')
    )
    const theme = submenus[0]!
    const rich = theme.querySelector<HTMLElement>(".rich")!
    const chosen = rich.querySelector("button")!
    Object.assign(rich, { component: { focusChosen: () => chosen.focus() } })
    rowOf(theme).focus()
    await userEvent.keyboard("{ArrowRight}")
    await ElementFixture.settle()
    expect(document.activeElement).toBe(chosen)
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

  test("the mouse leaving the fly-out for anywhere but its menu closes it, 0.3s later", async () => {
    const { submenus } = await render(`<div>${NESTED}<button>Outside</button></div>`)
    const [theme] = submenus
    await userEvent.hover(rowOf(theme!))
    await ElementFixture.settle()
    const box = flyoutOf(theme!)
    expect(isShowing(box)).toBe(true)
    fakeTimers()
    leave(box, document.querySelector("button")!)
    // not at once:  a pointer that slips off the edge has 0.3s to come back
    vi.advanceTimersByTime(LEAVE_MS - 10)
    await ElementFixture.settle()
    expect(isShowing(box)).toBe(true)
    vi.advanceTimersByTime(10)
    await ElementFixture.settle()
    expect(isShowing(box)).toBe(false)
  })

  test("coming back into the fly-out before then keeps it open;  leaving onto its menu leaves it to the menu's rows", async () => {
    const { menu, submenus } = await render(`<div>${NESTED}<button>Outside</button></div>`)
    const [theme] = submenus
    await userEvent.hover(rowOf(theme!))
    await ElementFixture.settle()
    const box = flyoutOf(theme!)
    fakeTimers()
    leave(box, document.querySelector("button")!)
    vi.advanceTimersByTime(LEAVE_MS / 2)
    box.dispatchEvent(new PointerEvent("pointerenter", { pointerType: "mouse" }))
    vi.advanceTimersByTime(LEAVE_MS * 2)
    await ElementFixture.settle()
    expect(isShowing(box)).toBe(true)
    // onto its own menu (the row it came from, a row beside it):  no timer;  the rows decide
    leave(box, menu)
    vi.advanceTimersByTime(LEAVE_MS * 2)
    await ElementFixture.settle()
    expect(isShowing(box)).toBe(true)
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
// ## The fly-out's box
////////////////

/** A menu with no ticks:  a fly-out of short items, one of long ones, one of on-or-off items, one of plain ones. */
const BOXES = `
  <ui-menu direction="vertical" aria-label="Menu" style="width: 220px">
    <ui-submenu label="Short">
      <ui-item>Light</ui-item>
      <ui-item>Dark</ui-item>
    </ui-submenu>
    <ui-submenu label="Long">
      <ui-item>A row far too long for a vertical menu's fifteen em</ui-item>
    </ui-submenu>
    <ui-submenu label="View">
      <ui-item selected>Code</ui-item>
      <ui-item selected="false">Line Numbers</ui-item>
    </ui-submenu>
    <ui-submenu label="Run">
      <ui-item>Restart</ui-item>
      <ui-item>Clear Console</ui-item>
    </ui-submenu>
  </ui-menu>`

/** The menu a `<ui-submenu>` draws round the items inside. */
function innerMenuOf(submenu: Element): HTMLElement {
  return flyoutOf(submenu).querySelector<HTMLElement>("ui-menu")!
}

/** Open `submenu`'s fly-out by a click on its row. */
async function openByClick(submenu: Element) {
  await userEvent.click(rowOf(submenu))
  await ElementFixture.settle()
}

describe("<ui-submenu> fly-out box", () => {
  test("as wide as its widest item:  narrower than 15em for short ones, wider for a long one, never cut", async () => {
    const { submenus } = await render(BOXES)
    await Viewport.resize(1200)
    const [short, long] = submenus
    await openByClick(short!)
    expect(flyoutOf(short!).getBoundingClientRect().width).toBeLessThan(15 * 16)
    await openByClick(long!)
    const box = flyoutOf(long!).getBoundingClientRect()
    const item = rowOf(long!.querySelector("ui-item")!)
    expect(box.width).toBeGreaterThan(15 * 16)
    expect(item.scrollWidth).toBeLessThanOrEqual(item.clientWidth + 1)
    expect(item.getBoundingClientRect().right).toBeLessThanOrEqual(box.right)
  })

  test("never wider than the window, nor taller:  it scrolls inside", async () => {
    const many = Array.from({ length: 40 }, (_, index) => `<ui-item>Row ${index + 1}</ui-item>`).join("")
    const { submenus } = await render(BOXES.replace("<ui-item>Light</ui-item>", many))
    await Viewport.resize(800, 400)
    await openByClick(submenus[0]!)
    const flyout = flyoutOf(submenus[0]!)
    const box = flyout.getBoundingClientRect()
    // its negative margin lines its first item up with the row:  a few px over the top, by design
    expect(box.top).toBeGreaterThanOrEqual(-8)
    expect(box.bottom).toBeLessThanOrEqual(window.innerHeight + 1)
    expect(flyout.scrollHeight).toBeGreaterThan(flyout.clientHeight)
  })

  test("a page styles it through ::part(flyout):  background, padding, min-width, blur", async () => {
    const style = document.createElement("style")
    style.textContent = `ui-submenu::part(flyout) {
      background: rgb(1, 2, 3); padding: 7px; min-width: 300px; backdrop-filter: blur(4px);
    }`
    document.head.append(style)
    onTestFinished(() => style.remove())
    const { submenus } = await render(BOXES)
    await Viewport.resize(1200)
    await openByClick(submenus[0]!)
    const flyout = flyoutOf(submenus[0]!)
    const looks = getComputedStyle(flyout)
    expect(looks.backgroundColor).toBe("rgb(1, 2, 3)")
    expect(looks.paddingTop).toBe("7px")
    expect(looks.backdropFilter).toBe("blur(4px)")
    expect(flyout.getBoundingClientRect().width).toBeGreaterThanOrEqual(300)
    // the menu inside fills it
    const menuBox = innerMenuOf(submenus[0]!).shadowRoot!.querySelector("[part~=menu]")!
    expect(menuBox.getBoundingClientRect().width).toBeGreaterThanOrEqual(300 - 2 * 7 - 2)
  })

  test("inside a popup:  the popup's background (`--ui-popup-background`)", async () => {
    const { root, submenus } = await render(`<div style="--ui-popup-background: rgb(9, 8, 7)">${BOXES}</div>`)
    expect(root.localName).toBe("div")
    await openByClick(submenus[0]!)
    expect(getComputedStyle(flyoutOf(submenus[0]!)).backgroundColor).toBe("rgb(9, 8, 7)")
  })
})

describe("<ui-submenu> fly-out ticks", () => {
  test("an item that says whether it's on or off ticks the fly-out, in a menu without ticks", async () => {
    const { submenus } = await render(BOXES)
    const [, , view, run] = submenus
    await openByClick(view!)
    expect(innerMenuOf(view!).hasAttribute("ticks")).toBe(true)
    const [code, lines] = view!.querySelectorAll("ui-item")
    expect(code!.matches(":state(in-ticks)")).toBe(true)
    expect(lines!.matches(":state(in-ticks)")).toBe(true)
    expect(rowOf(code!).getAttribute("aria-checked")).toBe("true")
    expect(rowOf(lines!).getAttribute("aria-checked")).toBe("false")
    // plain items:  no ticks
    expect(innerMenuOf(run!).hasAttribute("ticks")).toBe(false)
    expect(run!.querySelector("ui-item")!.matches(":state(in-ticks)")).toBe(false)
  })

  test("an item ticked later gives its fly-out ticks then", async () => {
    const { submenus } = await render(BOXES)
    const run = submenus[3]!
    expect(innerMenuOf(run).hasAttribute("ticks")).toBe(false)
    run.querySelector("ui-item")!.setAttribute("selected", "")
    await ElementFixture.settle()
    expect(innerMenuOf(run).hasAttribute("ticks")).toBe(true)
  })

  test("a menu with ticks still ticks every fly-out", async () => {
    const { submenus } = await render(BOXES.replace('aria-label="Menu"', 'aria-label="Menu" ticks'))
    expect(innerMenuOf(submenus[3]!).hasAttribute("ticks")).toBe(true)
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
