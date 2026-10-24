import { describe, expect, it } from "vite-plus/test"

import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"
import type { UIToolbar } from "spell-ui/components/ui-toolbar"
import { UIMenu } from "spell-ui/components/ui-menu"

import "spell-ui/components/ui-toolbar"

/** Element-markup examples, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/ui-toolbar/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** Ten link items:  more than a narrow toolbar holds. */
const MANY = Array.from({ length: 10 }, (_, index) => `<ui-item href="#i${index}">Item number ${index}</ui-item>`).join(
  ""
)

/** Render one `<ui-toolbar>` in a box `width` px wide;  returns it, its parts and its items. */
async function toolbar(width: number, items = MANY, attributes = "secondary") {
  const box = await ElementFixture.render(
    `<div style="width: ${width}px"><ui-toolbar aria-label="Test" ${attributes}>${items}</ui-toolbar></div>`
  )
  const host = box.querySelector<DOMElement & { component: UIToolbar }>("ui-toolbar")!
  const shadow = host.shadowRoot!
  return {
    host,
    menu: shadow.querySelector<HTMLElement>("[part~=menu]")!,
    back: shadow.querySelector<HTMLButtonElement>("[part~=scroll-start]")!,
    on: shadow.querySelector<HTMLButtonElement>("[part~=scroll-end]")!
  }
}

/** Is `button` drawn and seen? */
function isShown(button: HTMLElement): boolean {
  const style = getComputedStyle(button)
  return style.display !== "none" && style.visibility !== "hidden"
}

describe("<ui-toolbar>", () => {
  it("is a menu:  its component extends `UIMenu`, its box the menu's", async () => {
    const { host, menu } = await toolbar(600)
    expect(host.component).toBeInstanceOf(UIMenu)
    expect(menu.localName).toBe("nav")
    expect(menu.className).toContain("menu")
  })

  it("items that don't fit scroll sideways on one line, and `›` shows;  `‹` waits until it has scrolled", async () => {
    const { host, menu, back, on } = await toolbar(300)
    await expect.poll(() => host.matches(":state(overflowing)")).toBe(true)
    expect(menu.scrollWidth).toBeGreaterThan(menu.clientWidth)
    const tops = [...host.querySelectorAll("ui-item")].map((item) => Math.round(item.getBoundingClientRect().top))
    expect(new Set(tops).size).toBe(1)
    expect(isShown(on)).toBe(true)
    expect(isShown(back)).toBe(false)
    // hidden, not removed:  it waits over the row's start, taking no room in it
    expect(getComputedStyle(back).display).not.toBe("none")
  })

  it("`›` scrolls on by most of the box, and `‹` then shows;  at the end `›` hides", async () => {
    const { host, menu, back, on } = await toolbar(300)
    await expect.poll(() => isShown(on)).toBe(true)
    host.component.scrollByPage(1)
    await expect.poll(() => menu.scrollLeft).toBeGreaterThan(menu.clientWidth * 0.5)
    await expect.poll(() => isShown(back)).toBe(true)
    menu.scrollLeft = menu.scrollWidth
    await expect.poll(() => isShown(on)).toBe(false)
  })

  it("everything fits:  no buttons at all, not overflowing", async () => {
    const { host, back, on } = await toolbar(800, `<ui-item href="#a">A</ui-item><ui-item href="#b">B</ui-item>`)
    await ElementFixture.settle()
    expect(host.matches(":state(overflowing)")).toBe(false)
    expect(getComputedStyle(back).display).toBe("none")
    expect(getComputedStyle(on).display).toBe("none")
  })

  it("names its buttons, and keeps them out of the Tab order", async () => {
    const { on } = await toolbar(300)
    expect(on.getAttribute("aria-label")).toBe("Scroll on")
    expect(on.title).toBe("Scroll on")
    expect(on.tabIndex).toBe(-1)
  })

  it("a segmented toolbar slides its thumb too", async () => {
    const { menu } = await toolbar(
      300,
      `<ui-item selected>One</ui-item><ui-item>Two</ui-item><ui-item>Three</ui-item>`,
      'appearance="segmented" link'
    )
    await expect.poll(() => menu.classList.contains("thumbed")).toBe(true)
  })

  it("its examples are accessible", async () => {
    for (const markup of Object.values(EXAMPLES)) {
      const box = await ElementFixture.render(markup)
      await expectAccessible(box)
    }
  })
})

describe("<ui-toolbar> bar slots", () => {
  /** A 600px bar:  icon, title, center and right around three items. */
  const BAR =
    '<button slot="icon">=</button><b slot="title">Title</b><span slot="center">links</span>' +
    '<ui-item href="#a">A</ui-item><ui-item href="#b">B</ui-item><button slot="right">?</button>'

  it("draws a box per filled slot, in order:  icon, title, center, the items, right at the end", async () => {
    const { host, menu } = await toolbar(600, BAR)
    const shadow = host.shadowRoot!
    const box = (name: string) => shadow.querySelector<HTMLElement>(`[part~=${name}]`)!
    const left = (element: Element) => element.getBoundingClientRect().left
    expect(left(box("icon"))).toBeLessThan(left(box("title")))
    expect(left(box("title"))).toBeLessThan(left(box("center")))
    expect(left(box("center"))).toBeLessThan(left(menu))
    const bar = box("toolbar").getBoundingClientRect()
    expect(Math.round(box("right").getBoundingClientRect().right)).toBe(Math.round(bar.right))
  })

  it("an empty slot draws no box;  with no items, the menu's box takes no room and right still ends the bar", async () => {
    const { host, menu } = await toolbar(600, '<b slot="title">Title</b><button slot="right">?</button>')
    const shadow = host.shadowRoot!
    expect(shadow.querySelector("[part~=icon]")).toBeNull()
    expect(shadow.querySelector("[part~=center]")).toBeNull()
    expect(getComputedStyle(menu).display).toBe("none")
    const bar = shadow.querySelector("[part~=toolbar]")!.getBoundingClientRect()
    const right = shadow.querySelector("[part~=right]")!.getBoundingClientRect()
    expect(Math.round(right.right)).toBe(Math.round(bar.right))
  })
})
