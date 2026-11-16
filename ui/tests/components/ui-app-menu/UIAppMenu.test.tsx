import { describe, expect, it } from "vite-plus/test"

import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"
import type { UIAppMenu } from "spell/ui/components/ui-app-menu"
import { UIMenu } from "spell/ui/components/ui-menu"

import "spell/ui/components/ui-app-menu"

/** Element-markup examples, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/ui-app-menu/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** A bar of three sections, in a box `width` px wide:  two items at the start, one in the middle, one at the end. */
const BAR = `
  <ui-item slot="start" class="name">My App</ui-item>
  <ui-item slot="start">File</ui-item>
  <ui-item class="mode">Edit</ui-item>
  <ui-item slot="end" class="settings">Settings</ui-item>`

/** Render one `<ui-app-menu>` in a box `width` px wide;  returns it and its section boxes. */
async function appMenu(width: number, items = BAR) {
  const box = await ElementFixture.render(
    `<div style="width: ${width}px"><ui-app-menu aria-label="Test">${items}</ui-app-menu></div>`
  )
  const host = box.querySelector<DOMElement & { component: UIAppMenu }>("ui-app-menu")!
  const shadow = host.shadowRoot!
  const part = (name: string) => shadow.querySelector<HTMLElement>(`[part~=${name}]`)!
  return { box, host, menu: part("menu"), start: part("start"), middle: part("middle"), end: part("end") }
}

/** The box `item` draws (its `item` part). */
function itemBox(host: Element, selector: string): DOMRect {
  const item = host.querySelector(selector)!
  return item.shadowRoot!.querySelector("[part~=item]")!.getBoundingClientRect()
}

describe("<ui-app-menu>", () => {
  it("is a menu drawn as the window bar:  its component extends `UIMenu`, its box `ui header menu`", async () => {
    const { host, menu } = await appMenu(800)
    expect(host.component).toBeInstanceOf(UIMenu)
    expect(menu.localName).toBe("nav")
    expect(menu.className).toBe("ui header menu")
  })

  it("puts each item in its section:  `start`, the middle (no slot), `end`", async () => {
    const { start, middle, end } = await appMenu(800)
    const slotted = (section: HTMLElement) =>
      section
        .querySelector("slot")!
        .assignedElements()
        .map((element) => element.textContent)
    expect(slotted(start)).toEqual(["My App", "File"])
    expect(slotted(middle)).toEqual(["Edit"])
    expect(slotted(end)).toEqual(["Settings"])
  })

  it("keeps the middle on the bar's centre, and the end's items at the bar's end", async () => {
    const { host, menu } = await appMenu(800)
    const bar = menu.getBoundingClientRect()
    const mode = itemBox(host, ".mode")
    expect(Math.abs(mode.left + mode.width / 2 - (bar.left + bar.width / 2))).toBeLessThan(1)
    expect(Math.abs(itemBox(host, ".settings").right - bar.right)).toBeLessThan(1)
    expect(Math.abs(itemBox(host, ".name").left - bar.left)).toBeLessThan(1)
  })

  // epic `mockup` I27 (Owen:  "Space to the right of avatar")
  it("ends in what isn't an item (a button, an avatar):  an item's room after it, as the start's first item's icon has", async () => {
    const { host, menu } = await appMenu(
      800,
      `<ui-item slot="start" icon="bars" class="first"></ui-item><span slot="end" class="bare">Me</span>`
    )
    const bar = menu.getBoundingClientRect()
    const icon = host.querySelector(".first")!.shadowRoot!.querySelector("[part~=icon]")!.getBoundingClientRect()
    const room = icon.left - bar.left
    expect(room).toBeGreaterThan(10)
    expect(bar.right - host.querySelector(".bare")!.getBoundingClientRect().right).toBeCloseTo(room, 0)
  })

  it("fills its box's width, its items the bar's height", async () => {
    const { host, menu } = await appMenu(800)
    expect(Math.round(menu.getBoundingClientRect().width)).toBe(800)
    const bar = menu.getBoundingClientRect()
    const name = itemBox(host, ".name")
    // the bar's hairline under its items
    expect(Math.abs(name.height - (bar.height - 1))).toBeLessThan(1)
  })

  it("scrolls sideways when too narrow, its sections never overlapping", async () => {
    const { menu, start, middle, end } = await appMenu(200)
    expect(menu.scrollWidth).toBeGreaterThan(menu.clientWidth)
    expect(start.getBoundingClientRect().right).toBeLessThanOrEqual(middle.getBoundingClientRect().left + 0.5)
    expect(middle.getBoundingClientRect().right).toBeLessThanOrEqual(end.getBoundingClientRect().left + 0.5)
  })

  it("holds a sub-menu in a section, whose items are the bar's", async () => {
    const { host, start } = await appMenu(
      800,
      `<ui-menu slot="start"><ui-item class="name">My App</ui-item><ui-item>File</ui-item></ui-menu>`
    )
    expect(start.querySelector("slot")!.assignedElements()[0]!.localName).toBe("ui-menu")
    expect(host.querySelector("ui-menu")!.shadowRoot!.querySelector("[part~=menu]")!.className).not.toContain("ui")
  })

  it("passes axe on its examples", async () => {
    for (const html of Object.values(EXAMPLES)) {
      const box = await ElementFixture.render(html)
      await expectAccessible(box)
    }
  })
})
