import { userEvent } from "vite-plus/test/browser"
import { describe, expect, it } from "vite-plus/test"

import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"

import "spell-ui/components/ui-menu"
import "spell-ui/components/ui-toolbar"
import "spell-ui/components/ui-label"
import "spell-ui/components/ui-icon"

/**
 * `<ui-menu shrinkable>` and `<ui-toolbar shrinkable>`:  the titles fit the row (`TitleFit`, epic `ui-gaps` P13),
 * whole, cut, icons only, then one overflow button and its menu;  a segmented one becomes a dropdown.
 */

/** Four items of different lengths, one with no icon (its first letter) and one with a count;  the first selected. */
const ITEMS =
  `<ui-item link="#q" icon="question" selected>Questions</ui-item>` +
  `<ui-item link="#i" icon="exclamation">Issues<ui-label slot="badge" appearance="circular" size="mini">2</ui-label></ui-item>` +
  `<ui-item link="#j">Judgement calls made</ui-item>` +
  `<ui-item link="#t" icon="check">Todos</ui-item>`

/** Render a menu (`tag`) in a box `width` px wide;  returns the box, the menu, its row box and its items. */
async function shrinkable(width: number, { tag = "ui-menu", attributes = "", items = ITEMS } = {}) {
  const box = await ElementFixture.render(
    `<div style="width: ${width}px"><${tag} label="Sections" shrinkable ${attributes}>${items}</${tag}></div>`
  )
  const host = box.querySelector<DOMElement>(tag)!
  await settled(host)
  return {
    box,
    host,
    row: host.shadowRoot!.querySelector<HTMLElement>("[part~=menu]")!,
    items: [...host.querySelectorAll<DOMElement>("ui-item")]
  }
}

/** Wait for the fit:  two frames, then a settle. */
async function settled(host: Element) {
  await ElementFixture.settle()
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
  await ElementFixture.settle()
  return host
}

/** The stage the menu's box shows:  `whole`, `cut`, `icons` or `overflow`. */
function stage(row: HTMLElement): string {
  return row.style.getPropertyValue("--_menu-fit")
}

/** An item's box, title box and first-letter icon. */
function partsOf(item: Element) {
  const shadow = item.shadowRoot!
  return {
    box: shadow.querySelector<HTMLElement>("[part~=item]")!,
    title: shadow.querySelector<HTMLElement>("[part~=title]"),
    letter: shadow.querySelector<HTMLElement>(".letter")
  }
}

/** The menu's overflow button and its menu. */
function overflowOf(host: Element) {
  const shadow = host.shadowRoot!
  return {
    button: shadow.querySelector<HTMLButtonElement>("[part~=overflow]")!,
    menu: shadow.querySelector<HTMLElement>("[part~=overflow-menu]")!,
    rows: () => [...shadow.querySelectorAll<HTMLElement>("[part~=overflow-menu] > .row")]
  }
}

/** Is `element` drawn? */
function isShown(element: Element | null | undefined): boolean {
  return !!element && getComputedStyle(element).display !== "none" && element.getClientRects().length > 0
}

/**
 * The widths the stages start at, measured on the menu at 1000px:  the room every title needs whole, and the items'
 * other widths (padding, icon, count).
 */
async function sizes() {
  const { items, box } = await shrinkable(1000)
  const titles = items.map((item) => partsOf(item).title!.scrollWidth)
  const fixed = items.reduce((sum, item) => {
    const { box: itemBox, title } = partsOf(item)
    return sum + itemBox.getBoundingClientRect().width - title!.getBoundingClientRect().width
  }, 0)
  box.remove()
  // + 2:  the menu's border
  return { whole: fixed + titles.reduce((sum, width) => sum + width, 0) + 2, fixed: fixed + 2, titles }
}

describe("<ui-menu shrinkable>", () => {
  it("wide enough:  every title whole, in its title box;  no state", async () => {
    const { host, row, items } = await shrinkable(1000)
    expect(stage(row)).toBe("whole")
    for (const item of items) {
      const { title } = partsOf(item)
      expect(title).not.toBeNull()
      expect(title!.scrollWidth).toBeLessThanOrEqual(title!.clientWidth + 1)
    }
    expect(host.matches(":state(icons-only)")).toBe(false)
    expect(isShown(overflowOf(host).button)).toBe(false)
    // its overflow menu after its box changes nothing around it:  no margin under the last box
    expect(getComputedStyle(row).marginBottom).toBe("0px")
    // the first letter waits for icons only
    expect(isShown(partsOf(items[2]!).letter)).toBe(false)
  })

  it("a little narrower:  the longest title is cut with `…`, the short ones stay whole", async () => {
    const { whole } = await sizes()
    const { row, items } = await shrinkable(Math.floor(whole - 30))
    expect(stage(row)).toBe("cut")
    const longest = partsOf(items[2]!).title!
    expect(longest.scrollWidth).toBeGreaterThan(longest.clientWidth)
    expect(getComputedStyle(longest).textOverflow).toBe("ellipsis")
    const short = partsOf(items[3]!).title!
    expect(short.scrollWidth).toBeLessThanOrEqual(short.clientWidth + 1)
    // the row fits:  the last item ends inside the menu
    const end = partsOf(items[3]!).box.getBoundingClientRect().right
    expect(end).toBeLessThanOrEqual(row.getBoundingClientRect().right + 0.5)
  })

  it("once a title would be cut under 50px:  icons only, each title its tooltip and still its name", async () => {
    const { fixed } = await sizes()
    const { host, row, items } = await shrinkable(Math.floor(fixed + 4 * 40))
    expect(stage(row)).toBe("icons")
    expect(host.matches(":state(icons-only)")).toBe(true)
    for (const item of items) {
      const { box, title } = partsOf(item)
      expect(title!.getBoundingClientRect().width).toBeLessThanOrEqual(1)
      // clipped, not removed:  its words still name the item
      expect(getComputedStyle(title!).display).not.toBe("none")
      const words = title!
        .querySelector("slot")!
        .assignedNodes()
        .map((node) => node.textContent)
        .join("")
      expect(words.trim()).toBe(box.title || words.trim())
      expect(words.trim().length).toBeGreaterThan(0)
    }
    await expect.poll(() => partsOf(items[0]!).box.title).toBe("Questions")
    // the item with no icon shows its first letter instead
    expect(isShown(partsOf(items[2]!).letter)).toBe(true)
    expect(partsOf(items[2]!).letter!.textContent).toBe("J")
    // the count stays
    expect(isShown(items[1]!.shadowRoot!.querySelector("[part~=badge]"))).toBe(true)
    await expectAccessible(host)
  })

  it("a page's own tooltip wins over the title", async () => {
    const { fixed } = await sizes()
    const items = ITEMS.replace(`icon="check">`, `icon="check" tooltip="Things to do">`)
    const { host } = await shrinkable(Math.floor(fixed + 4 * 40), { items })
    const todos = host.querySelectorAll("ui-item")[3]!
    await expect.poll(() => partsOf(todos).box.title).toBe("Things to do")
  })

  it("an empty `title` the page wrote means no tooltip at all", async () => {
    const { fixed } = await sizes()
    const items = ITEMS.replace(`icon="check">`, `icon="check" title="">`)
    const { host } = await shrinkable(Math.floor(fixed + 4 * 40), { items })
    await expect.poll(() => partsOf(host.querySelectorAll("ui-item")[0]!).box.title).toBe("Questions")
    expect(partsOf(host.querySelectorAll("ui-item")[3]!).box.hasAttribute("title")).toBe(false)
  })

  it("narrower still:  every item folds into one `…` button, a dot on it for the count", async () => {
    const { host, row, items } = await shrinkable(120)
    expect(stage(row)).toBe("overflow")
    expect(host.matches(":state(overflow)")).toBe(true)
    expect(host.matches(":state(icons-only)")).toBe(false)
    for (const item of items) expect(isShown(partsOf(item).box)).toBe(false)
    const { button } = overflowOf(host)
    expect(isShown(button)).toBe(true)
    expect(button.getAttribute("aria-label")).toBe("More")
    expect(button.title).toBe("More")
    expect(button.getAttribute("aria-haspopup")).toBe("menu")
    expect(button.getAttribute("aria-expanded")).toBe("false")
    expect(isShown(button.querySelector(".dot"))).toBe(true)
    await expectAccessible(host)
  })

  it("no dot without a count", async () => {
    const items = ITEMS.replace(/<ui-label[^]*?<\/ui-label>/, "")
    const { host } = await shrinkable(120, { items })
    expect(button(host).querySelector(".dot")).toBeNull()
  })

  it("the overflow slot replaces its `…`", async () => {
    const items = `<ui-icon slot="overflow" name="bars"></ui-icon>${ITEMS}`
    const { host } = await shrinkable(120, { items })
    const slot = button(host).querySelector<HTMLSlotElement>("slot[name=overflow]")!
    expect(slot.assignedElements()[0]?.localName).toBe("ui-icon")
  })

  it("follows its box:  a resize refits, each way, never stuck between", async () => {
    const { whole, fixed } = await sizes()
    const { box, row } = await shrinkable(1000)
    for (const [width, expected] of [
      [Math.floor(fixed + 4 * 40), "icons"],
      [120, "overflow"],
      [Math.floor(whole - 30), "cut"],
      [1000, "whole"],
      [120, "overflow"],
      [1000, "whole"]
    ] as const) {
      box.style.width = `${width}px`
      await expect.poll(() => stage(row)).toBe(expected)
    }
  })

  it("an added item refits", async () => {
    const { whole } = await sizes()
    const { host, row } = await shrinkable(Math.ceil(whole + 4))
    expect(stage(row)).toBe("whole")
    host.insertAdjacentHTML("beforeend", `<ui-item link="#p" icon="list">Phases and more</ui-item>`)
    await expect.poll(() => stage(row)).not.toBe("whole")
  })

  it("`--ui-menu-item-min` folds it sooner", async () => {
    const { fixed } = await sizes()
    const width = Math.floor(fixed + 4 * 40)
    const { host, row, box } = await shrinkable(width)
    expect(stage(row)).toBe("icons")
    host.style.setProperty("--ui-menu-item-min", `${Math.ceil(width / 3)}px`)
    box.style.width = `${width - 1}px`
    await expect.poll(() => stage(row)).toBe("overflow")
  })

  it("an item with no words (an icon button) stays in the row, beside the `…`", async () => {
    const items = `${ITEMS}<ui-item link="#b" icon="bullhorn" label="Waiting"></ui-item>`
    const { host } = await shrinkable(140, { items })
    const bullhorn = host.querySelectorAll("ui-item")[4]!
    expect(partsOf(bullhorn).title).toBeNull()
    expect(isShown(partsOf(bullhorn).box)).toBe(true)
    expect(isShown(button(host))).toBe(true)
  })

  it("without `shrinkable`:  no title box, no overflow button", async () => {
    const box = await ElementFixture.render(`<div style="width: 120px"><ui-menu label="Plain">${ITEMS}</ui-menu></div>`)
    const host = box.querySelector("ui-menu")!
    expect(partsOf(host.querySelector("ui-item")!).title).toBeNull()
    expect(host.shadowRoot!.querySelector("[part~=overflow]")).toBeNull()
  })
})

/** The overflow button. */
function button(host: Element): HTMLButtonElement {
  return overflowOf(host).button
}

describe("<ui-menu shrinkable> overflow menu", () => {
  it("opens on a click, a row per item, the selected one ticked and focused", async () => {
    const { host } = await shrinkable(120)
    const { button: more, menu, rows } = overflowOf(host)
    more.click()
    await expect.poll(() => menu.matches(":popover-open")).toBe(true)
    expect(more.getAttribute("aria-expanded")).toBe("true")
    expect(menu.getAttribute("role")).toBe("menu")
    expect(rows().map((row) => row.querySelector(".title")!.textContent)).toEqual([
      "Questions",
      "Issues",
      "Judgement calls made",
      "Todos"
    ])
    expect(rows().map((row) => row.getAttribute("role"))).toEqual(["menuitemradio", "menuitem", "menuitem", "menuitem"])
    expect(rows()[0]!.getAttribute("aria-checked")).toBe("true")
    // its icon, its first letter, its count
    expect(rows()[0]!.querySelector(".icon svg")).not.toBeNull()
    expect(rows()[2]!.querySelector(".letter")!.textContent).toBe("J")
    expect(rows()[1]!.querySelector(".badge ui-label")!.textContent).toBe("2")
    await expect.poll(() => host.shadowRoot!.activeElement).toBe(rows()[0])
    await expectAccessible(host)
  })

  it("its keys:  ↓ opens it, ↓ ↑ Home End move, Escape closes it and focus goes back to the button", async () => {
    const { host } = await shrinkable(120)
    const { button: more, menu, rows } = overflowOf(host)
    const focused = () => host.shadowRoot!.activeElement
    more.focus()
    await userEvent.keyboard("{ArrowDown}")
    await expect.poll(() => menu.matches(":popover-open")).toBe(true)
    await expect.poll(focused).toBe(rows()[0])
    await userEvent.keyboard("{ArrowDown}")
    expect(focused()).toBe(rows()[1])
    await userEvent.keyboard("{End}")
    expect(focused()).toBe(rows()[3])
    await userEvent.keyboard("{ArrowDown}")
    expect(focused()).toBe(rows()[0])
    await userEvent.keyboard("{ArrowUp}")
    expect(focused()).toBe(rows()[3])
    await userEvent.keyboard("{Home}")
    expect(focused()).toBe(rows()[0])
    await userEvent.keyboard("{Escape}")
    await expect.poll(() => menu.matches(":popover-open")).toBe(false)
    expect(focused()).toBe(more)
    expect(more.getAttribute("aria-expanded")).toBe("false")
  })

  it("Enter and Space on the button open it;  Tab closes it", async () => {
    const { host } = await shrinkable(120)
    const { button: more, menu } = overflowOf(host)
    more.focus()
    await userEvent.keyboard("{Enter}")
    await expect.poll(() => menu.matches(":popover-open")).toBe(true)
    await userEvent.keyboard("{Tab}")
    await expect.poll(() => menu.matches(":popover-open")).toBe(false)
    more.focus()
    await userEvent.keyboard(" ")
    await expect.poll(() => menu.matches(":popover-open")).toBe(true)
  })

  it("picking a row clicks the real item:  the page's own listeners run, and the menu closes", async () => {
    const { host, items } = await shrinkable(120)
    const { button: more, menu, rows } = overflowOf(host)
    const clicked: string[] = []
    items[2]!.addEventListener("click", () => clicked.push("judgement"))
    const chosen: string[] = []
    host.addEventListener("ui-choosing", (event) => chosen.push((event as CustomEvent<{ value: string }>).detail.value))
    more.click()
    await expect.poll(() => rows().length).toBe(4)
    await expect.poll(() => host.shadowRoot!.activeElement).toBe(rows()[0])
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}")
    await expect.poll(() => clicked).toEqual(["judgement"])
    expect(chosen).toEqual(["Judgement calls made"])
    await expect.poll(() => menu.matches(":popover-open")).toBe(false)
    expect(host.shadowRoot!.activeElement).toBe(more)
  })

  it("a click outside closes it", async () => {
    const { host } = await shrinkable(120)
    const { button: more, menu } = overflowOf(host)
    more.click()
    await expect.poll(() => menu.matches(":popover-open")).toBe(true)
    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true }))
    document.body.click()
    await expect.poll(() => menu.matches(":popover-open")).toBe(false)
  })

  it("widening closes it, and the items come back", async () => {
    const { host, box, row, items } = await shrinkable(120)
    const { button: more, menu } = overflowOf(host)
    more.click()
    await expect.poll(() => menu.matches(":popover-open")).toBe(true)
    box.style.width = "1000px"
    await expect.poll(() => stage(row)).toBe("whole")
    await expect.poll(() => menu.matches(":popover-open")).toBe(false)
    for (const item of items) expect(isShown(partsOf(item).box)).toBe(true)
  })
})

describe("<ui-menu shrinkable appearance=segmented>", () => {
  /** Three choices, the second chosen. */
  const CHOICES =
    `<ui-item icon="list">List view</ui-item>` +
    `<ui-item icon="th" selected>Grid view</ui-item>` +
    `<ui-item icon="calendar">Calendar view</ui-item>`

  it("wide:  the segmented control, its thumb, every label whole", async () => {
    const { host, row } = await shrinkable(800, { attributes: 'appearance="segmented link"', items: CHOICES })
    expect(stage(row)).toBe("whole")
    expect(host.matches(":state(dropdown)")).toBe(false)
    await expect.poll(() => row.classList.contains("thumbed")).toBe(true)
  })

  it("too narrow:  a dropdown, its button the chosen item and a caret;  never cut, never icons only", async () => {
    const { host, row, items } = await shrinkable(200, { attributes: 'appearance="segmented link"', items: CHOICES })
    expect(stage(row)).toBe("overflow")
    expect(host.matches(":state(dropdown)")).toBe(true)
    expect(host.matches(":state(overflow)")).toBe(false)
    expect(host.matches(":state(icons-only)")).toBe(false)
    for (const item of items) expect(isShown(partsOf(item).box)).toBe(false)
    const more = button(host)
    expect(isShown(more)).toBe(true)
    await expect.poll(() => more.querySelector(".title")?.textContent).toBe("Grid view")
    await expect.poll(() => more.querySelector(".caret svg")).not.toBeNull()
    expect(more.title).toBe("Grid view")
    await expectAccessible(host)
  })

  it("picking another choice selects it, and the button shows it;  wide again, the control is back", async () => {
    const { host, box, row, items } = await shrinkable(200, {
      attributes: 'appearance="segmented link"',
      items: CHOICES
    })
    const { button: more, rows } = overflowOf(host)
    more.click()
    await expect.poll(() => rows().length).toBe(3)
    rows()[2]!.click()
    await expect.poll(() => items[2]!.hasAttribute("selected")).toBe(true)
    expect(items[1]!.hasAttribute("selected")).toBe(false)
    await expect.poll(() => more.querySelector(".title")?.textContent).toBe("Calendar view")
    box.style.width = "800px"
    await expect.poll(() => stage(row)).toBe("whole")
    expect(host.matches(":state(dropdown)")).toBe(false)
    for (const item of items) expect(isShown(partsOf(item).box)).toBe(true)
  })
})

describe("<ui-toolbar shrinkable>", () => {
  /** Ten link items:  more than a narrow toolbar holds. */
  const MANY = Array.from({ length: 10 }, (_, index) => `<ui-item link="#i${index}">Item ${index}</ui-item>`).join("")

  it("fits instead of scrolling:  no `‹` / `›`, never overflowing", async () => {
    const { host, row } = await shrinkable(300, { tag: "ui-toolbar", items: MANY })
    expect(["cut", "icons", "overflow"]).toContain(stage(row))
    expect(host.matches(":state(overflowing)")).toBe(false)
    const shadow = host.shadowRoot!
    expect(isShown(shadow.querySelector("[part~=scroll-end]"))).toBe(false)
    expect(isShown(shadow.querySelector("[part~=scroll-start]"))).toBe(false)
  })

  it("the four stages, as the menu's", async () => {
    const { box, row } = await shrinkable(1000, { tag: "ui-toolbar" })
    expect(stage(row)).toBe("whole")
    box.style.width = "120px"
    await expect.poll(() => stage(row)).toBe("overflow")
  })

  it("a toolbar that isn't shrinkable still scrolls with `‹` / `›`", async () => {
    const box = await ElementFixture.render(
      `<div style="width: 300px"><ui-toolbar label="Plain">${MANY}</ui-toolbar></div>`
    )
    const host = box.querySelector<DOMElement>("ui-toolbar")!
    await expect.poll(() => host.matches(":state(overflowing)")).toBe(true)
    expect(isShown(host.shadowRoot!.querySelector("[part~=scroll-end]"))).toBe(true)
  })
})
