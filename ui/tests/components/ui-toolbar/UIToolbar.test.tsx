import { describe, expect, it } from "vite-plus/test"

import { expectAccessible } from "spell-kit/test-helpers/A11y"
import { ElementFixture } from "spell-kit/test-helpers/ElementFixture"
import type { DOMElement } from "spell-kit/element"
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
    // its room is kept:  the menu starts after it
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
