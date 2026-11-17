import { describe, expect, it } from "vite-plus/test"

import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"
import type { UIToolbar } from "spell/ui/components/ui-toolbar"
import { UIMenu } from "spell/ui/components/ui-menu"

import "spell/ui/components/ui-toolbar"

/** Element-markup examples, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/ui-toolbar/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** Ten link items:  more than a narrow toolbar holds. */
const MANY = Array.from({ length: 10 }, (_, index) => `<ui-item link="#i${index}">Item number ${index}</ui-item>`).join(
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
    const { host, back, on } = await toolbar(800, `<ui-item link="#a">A</ui-item><ui-item link="#b">B</ui-item>`)
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
      'appearance="segmented link"'
    )
    await expect.poll(() => menu.classList.contains("thumbed")).toBe(true)
  })

  it("`segmented header`:  no track, 13px, its items hugging their words;  the chosen one no heavier", async () => {
    const items = `<ui-item selected>Views</ui-item><ui-item>Things</ui-item>`
    const { host, menu } = await toolbar(400, items, 'appearance="segmented link header"')
    expect(menu.className).toContain("header")
    const style = getComputedStyle(menu)
    expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)")
    expect(style.fontSize).toBe("13px")
    const boxes = [...host.querySelectorAll("ui-item")].map((item) => item.shadowRoot!.querySelector("[part~=item]")!)
    await expect.poll(() => boxes[0].getBoundingClientRect().width).toBeGreaterThan(0)
    expect(boxes[0].getBoundingClientRect().width).toBeLessThan(boxes[1].getBoundingClientRect().width)
    expect(getComputedStyle(boxes[0]).fontWeight).toBe(getComputedStyle(boxes[1]).fontWeight)
    expect(menu.getBoundingClientRect().width).toBeLessThan(400)
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
    '<ui-item link="#a">A</ui-item><ui-item link="#b">B</ui-item><button slot="right">?</button>'

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

  describe("scroll-first", () => {
    /** Five long items:  a segmented `shrinkable` row of them, `width` wide. */
    const FILES = ["Card.spell", "Deck.spell", "Pile.spell", "Solitaire.spell", "styles.css"]
      .map((name, index) => `<ui-item ${index ? "" : "selected"}>${name}</ui-item>`)
      .join("")
    const LOOK = 'appearance="segmented link header" shrinkable'

    it("too many for the row:  it scrolls, with its keys, rather than become the dropdown", async () => {
      const { host } = await toolbar(300, FILES, `${LOOK} scroll-first`)
      await expect.poll(() => host.matches(":state(overflowing)")).toBe(true)
      expect(host.matches(":state(dropdown)")).toBe(false)
    })

    it("too narrow to scroll in:  the dropdown", async () => {
      const { host } = await toolbar(150, FILES, `${LOOK} scroll-first`)
      await expect.poll(() => host.matches(":state(dropdown)")).toBe(true)
      expect(host.matches(":state(overflowing)")).toBe(false)
    })

    it("with `max-visible`, at every width round the scroll room:  one look, never taking turns (epic `editor` I189)", async () => {
      // the list's button shows while the row scrolls, and hides in the dropdown:  each look's room chose the other
      for (const width of [190, 200, 210, 220, 230, 240, 250, 260]) {
        const { host } = await toolbar(width, FILES, `${LOOK} scroll-first max-visible all-items-icon="file outline"`)
        await ElementFixture.settle()
        await new Promise((done) => setTimeout(done, 300))
        const looks: string[] = []
        await new Promise<void>((done) => {
          const end = performance.now() + 600
          const frame = () => {
            const look = host.matches(":state(dropdown)") ? "dropdown" : "row"
            if (looks.at(-1) !== look) looks.push(look)
            if (performance.now() < end) requestAnimationFrame(frame)
            else done()
          }
          requestAnimationFrame(frame)
        })
        expect({ width, looks }).toEqual({ width, looks: [looks[0]] })
      }
    })

    it("without it, a shrinkable segmented row goes straight to the dropdown", async () => {
      const { host } = await toolbar(300, FILES, LOOK)
      await expect.poll(() => host.matches(":state(dropdown)")).toBe(true)
    })
  })

  describe("max-visible", () => {
    /** `count` items, the first chosen:  a segmented row that chooses as it's clicked. */
    const items = (count: number) =>
      Array.from({ length: count }, (_, index) => `<ui-item ${index ? "" : "selected"}>F${index}</ui-item>`).join("")
    const LOOK = 'appearance="segmented link header"'

    /** The titles the row shows, in order. */
    const shown = (host: Element) =>
      [...host.querySelectorAll<HTMLElement>("ui-item")].filter((each) => !each.hidden).map((each) => each.textContent)

    /** The button that lists every item, while it's there. */
    const listButton = (host: Element) => host.shadowRoot!.querySelector<HTMLButtonElement>("[part~=all-items]")

    /** The list's rows. */
    const rows = (host: Element) => [
      ...host.shadowRoot!.querySelectorAll<HTMLButtonElement>("[part~=overflow-menu] .row")
    ]

    it("no more items than that:  all of them, and no button", async () => {
      const { host } = await toolbar(900, items(3), `${LOOK} max-visible="3"`)
      await ElementFixture.settle()
      expect(shown(host)).toEqual(["F0", "F1", "F2"])
      expect(listButton(host)).toBeNull()
    })

    it("more:  only what's been chosen, and a button listing every item", async () => {
      const { host } = await toolbar(900, items(5), `${LOOK} max-visible="3"`)
      await expect.poll(() => host.matches(":state(limited)")).toBe(true)
      await ElementFixture.settle()
      expect(shown(host)).toEqual(["F0"])
      listButton(host)!.click()
      await ElementFixture.settle()
      expect(rows(host).map((row) => row.querySelector(".title")!.textContent)).toEqual(["F0", "F1", "F2", "F3", "F4"])
    })

    it("an item put away goes at once, never animated out;  back in the row, it moves as any (epic `mockup` I38)", async () => {
      const { host } = await toolbar(900, items(5), `${LOOK} max-visible="2"`)
      await expect.poll(() => host.matches(":state(limited)")).toBe(true)
      await ElementFixture.settle()
      const away = [...host.querySelectorAll<HTMLElement>("ui-item")].filter((each) => each.hidden)
      expect(away).toHaveLength(4)
      for (const item of away) {
        // still taking its room while it faded, it threw the row's measures off:  the thumb, the titles, the scroll
        expect(item.style.getPropertyValue("--ui-motion")).toBe("none")
        expect(item.matches(":state(hiding)")).toBe(false)
      }
      listButton(host)!.click()
      await ElementFixture.settle()
      rows(host)[3]!.click()
      await ElementFixture.settle()
      const back = host.querySelectorAll<HTMLElement>("ui-item")[3]!
      await expect.poll(() => back.hidden).toBe(false)
      expect(back.style.getPropertyValue("--ui-motion")).toBe("")
    })

    it("a pick joins the row, in the page's order, and the one chosen longest ago leaves", async () => {
      const { host } = await toolbar(900, items(5), `${LOOK} max-visible="2"`)
      await expect.poll(() => host.matches(":state(limited)")).toBe(true)
      for (const index of [3, 1]) {
        listButton(host)!.click()
        await ElementFixture.settle()
        rows(host)[index]!.click()
        await ElementFixture.settle()
      }
      await expect.poll(() => shown(host)).toEqual(["F1", "F3"])
    })

    it("`all-items-icon`:  its icon before the button's caret", async () => {
      const { host } = await toolbar(900, items(5), `${LOOK} max-visible="3" all-items-icon="file outline"`)
      await expect.poll(() => listButton(host)?.querySelectorAll("svg").length).toBe(2)
    })

    it("`all-items-at-end`:  the button at the bar's far end, however few items show", async () => {
      const { host } = await toolbar(600, items(5), `${LOOK} max-visible="2" all-items-at-end`)
      await expect.poll(() => listButton(host)).not.toBeNull()
      const bar = host.shadowRoot!.querySelector("[part~=toolbar]")!.getBoundingClientRect()
      expect(Math.round(listButton(host)!.getBoundingClientRect().right)).toBe(Math.round(bar.right))
      // without it:  right after the last item
      const plain = await toolbar(600, items(5), `${LOOK} max-visible="2"`)
      await expect.poll(() => listButton(plain.host)).not.toBeNull()
      const plainBar = plain.host.shadowRoot!.querySelector("[part~=toolbar]")!.getBoundingClientRect()
      expect(listButton(plain.host)!.getBoundingClientRect().right).toBeLessThan(plainBar.right - 100)
    })

    it("every item in view:  no button;  some scrolled out of the row:  the button (epic `editor` T83)", async () => {
      const attributes = `${LOOK} max-visible all-items-icon="file outline" all-items-at-end`
      const { host } = await toolbar(600, items(2), attributes)
      await ElementFixture.settle()
      expect(host.matches(":state(limited)")).toBe(false)
      expect(listButton(host)).toBeNull()
      const narrow = await toolbar(120, items(6), attributes)
      await expect.poll(() => listButton(narrow.host)?.querySelectorAll("svg").length).toBe(2)
      expect(narrow.host.matches(":state(limited)")).toBe(false)
      const bar = narrow.host.shadowRoot!.querySelector("[part~=toolbar]")!.getBoundingClientRect()
      expect(Math.round(listButton(narrow.host)!.getBoundingClientRect().right)).toBe(Math.round(bar.right))
      listButton(narrow.host)!.click()
      await ElementFixture.settle()
      expect(rows(narrow.host)).toHaveLength(6)
    })

    it("widened till every item fits but for the button's own room:  the button goes, once, and stays gone (epic `editor` I235)", async () => {
      const attributes = `${LOOK} max-visible all-items-icon="file outline" all-items-at-end`
      const { host, menu } = await toolbar(120, items(6), attributes)
      await expect.poll(() => listButton(host)).not.toBeNull()
      await ElementFixture.settle()
      const button = listButton(host)!
      const room =
        button.getBoundingClientRect().width + (parseFloat(getComputedStyle(button.parentElement!).columnGap) || 0)
      // the row short by half the button's room:  it overflowed only because the button was there
      const width = 120 + menu.scrollWidth - menu.clientWidth - room / 2
      // each time the button comes or goes
      const changes: string[] = []
      new MutationObserver((records) => {
        for (const record of records) {
          for (const node of record.removedNodes)
            if (node === button || (node as Element).part?.contains("all-items")) changes.push("gone")
          for (const node of record.addedNodes) if ((node as Element).part?.contains("all-items")) changes.push("back")
        }
      }).observe(button.parentElement!, { childList: true })
      host.parentElement!.style.width = `${width}px`
      await expect.poll(() => listButton(host)).toBeNull()
      await new Promise((done) => setTimeout(done, 300))
      await ElementFixture.settle()
      expect(listButton(host)).toBeNull()
      expect(changes).toEqual(["gone"])
      expect(menu.scrollWidth - menu.clientWidth).toBeLessThanOrEqual(1)
      // narrowed again past that room:  it's back
      host.parentElement!.style.width = `${width - room}px`
      await expect.poll(() => listButton(host)).not.toBeNull()
    })

    it("the list's chosen row is ticked FIRST, as every ticked menu's:  tick, icon, title (epic `editor` I243)", async () => {
      const files = Array.from(
        { length: 6 },
        (_, index) => `<ui-item icon="file outline" ${index === 2 ? "selected" : ""}>File-${index}.spell</ui-item>`
      ).join("")
      const { host } = await toolbar(160, files, `${LOOK} max-visible all-items-icon="file outline"`)
      await expect.poll(() => listButton(host)).not.toBeNull()
      listButton(host)!.click()
      await expect.poll(() => rows(host).length).toBe(6)
      await ElementFixture.settle()
      for (const [index, row] of rows(host).entries()) {
        // every row keeps the tick's gutter, so the icons line up;  only the chosen one's shows
        const [tick, icon, title] = [...row.children] as HTMLElement[]
        expect(tick!.className).toBe("tick")
        expect(icon!.className).toContain("icon")
        expect(title!.className).toBe("title")
        expect(getComputedStyle(tick!).visibility).toBe(index === 2 ? "visible" : "hidden")
        expect(tick!.getBoundingClientRect().right).toBeLessThanOrEqual(icon!.getBoundingClientRect().left)
        expect(getComputedStyle(row, "::after").content).toBe("none")
      }
      const lefts = rows(host).map((row) => Math.round(row.querySelector(".icon")!.getBoundingClientRect().left))
      expect(new Set(lefts).size).toBe(1)
    })

    it("many put away:  the few tabs left stay a row, never the dropdown (epic `editor` I188)", async () => {
      // a site's files, as the editor's file tabs have them:  an icon and a longer name each
      const files = Array.from(
        { length: 60 },
        (_, index) => `<ui-item icon="file outline" ${index ? "" : "selected"}>page-number-${index}.spell</ui-item>`
      ).join("")
      const { host } = await toolbar(600, files, `${LOOK} tabs shrinkable scroll-first max-visible="2"`)
      await expect.poll(() => host.matches(":state(limited)")).toBe(true)
      await ElementFixture.settle()
      expect(host.matches(":state(dropdown)")).toBe(false)
      expect(listButton(host)).not.toBeNull()
    })

    it("a list too long for the window:  its rows in columns, top to bottom, the chosen one ticked (epic `editor` T84)", async () => {
      const { host } = await toolbar(600, items(120), `${LOOK} max-visible="3"`)
      await expect.poll(() => listButton(host)).not.toBeNull()
      listButton(host)!.click()
      await ElementFixture.settle()
      const menu = host.shadowRoot!.querySelector<HTMLElement>("[part~=overflow-menu]")!
      await expect.poll(() => Number(menu.dataset.columns)).toBeGreaterThan(1)
      const all = rows(host)
      expect(all).toHaveLength(120)
      // the second row under the first, the next column's first beside it
      const perColumn = Number(getComputedStyle(menu).getPropertyValue("--_ui-menu-overflow-rows"))
      const [first, second, nextColumn] = [all[0]!, all[1]!, all[perColumn]!].map((row) => row.getBoundingClientRect())
      expect(second!.left).toBe(first!.left)
      expect(second!.top).toBeGreaterThan(first!.top)
      expect(nextColumn!.left).toBeGreaterThan(first!.left)
      expect(Math.round(nextColumn!.top)).toBe(Math.round(first!.top))
      expect(menu.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight)
      expect(all.filter((row) => row.classList.contains("selected"))).toHaveLength(1)
    })

    it("bare, it means 8", async () => {
      const { host } = await toolbar(900, items(8), `${LOOK} max-visible`)
      await ElementFixture.settle()
      expect(host.matches(":state(limited)")).toBe(false)
      host.append(Object.assign(document.createElement("ui-item"), { textContent: "F8" }))
      await expect.poll(() => host.matches(":state(limited)")).toBe(true)
    })

    it("`remember`:  a new row of the same name starts with the same items", async () => {
      localStorage.removeItem("ui-toolbar-open-items")
      const first = await toolbar(900, items(5), `${LOOK} max-visible="2" remember="test-row"`)
      await expect.poll(() => first.host.matches(":state(limited)")).toBe(true)
      listButton(first.host)!.click()
      await ElementFixture.settle()
      rows(first.host)[3]!.click()
      await expect.poll(() => shown(first.host)).toEqual(["F0", "F3"])
      const second = await toolbar(900, items(5), `${LOOK} max-visible="2" remember="test-row"`)
      await expect.poll(() => shown(second.host)).toEqual(["F0", "F3"])
    })

    describe("closeItem()", () => {
      /** A row of 5, at most 3:  F0 chosen, then F2 and F4 picked from the list, so the row shows F0, F2, F4. */
      async function rowOfThree(attributes = "") {
        const made = await toolbar(900, items(5), `${LOOK} max-visible="3" ${attributes}`)
        const { host } = made
        await expect.poll(() => host.matches(":state(limited)")).toBe(true)
        for (const index of [2, 4, 0]) {
          listButton(host)!.click()
          await ElementFixture.settle()
          rows(host)[index]!.click()
          await ElementFixture.settle()
        }
        await expect.poll(() => shown(host)).toEqual(["F0", "F2", "F4"])
        return {
          ...made,
          item: (title: string) => [...host.querySelectorAll("ui-item")].find((each) => each.textContent === title)!
        }
      }

      /** Click `item`'s box, as a person does:  the row chooses it. */
      const press = (item: Element) => item.shadowRoot!.querySelector<HTMLElement>("[part~=item]")!.click()

      it("an item not chosen leaves the row, but stays in the list;  picked there, it's back", async () => {
        const { host, item } = await rowOfThree()
        expect(host.component.closeItem(item("F2"))).toBeUndefined()
        await expect.poll(() => shown(host)).toEqual(["F0", "F4"])
        listButton(host)!.click()
        await ElementFixture.settle()
        expect(rows(host).map((row) => row.querySelector(".title")!.textContent)).toEqual([
          "F0",
          "F1",
          "F2",
          "F3",
          "F4"
        ])
        rows(host)[2]!.click()
        await expect.poll(() => shown(host)).toEqual(["F0", "F2", "F4"])
      })

      it("the chosen one:  answers its neighbour to choose, after it, else before;  it stays out once that's chosen", async () => {
        const { host, item } = await rowOfThree()
        const next = host.component.closeItem(item("F0"))
        expect(next).toBe(item("F2"))
        press(next!)
        await expect.poll(() => next!.hasAttribute("selected")).toBe(true)
        await expect.poll(() => shown(host)).toEqual(["F2", "F4"])
        // the last one's neighbour is before it
        press(item("F4"))
        await expect.poll(() => item("F4").hasAttribute("selected")).toBe(true)
        expect(shown(host)).toEqual(["F2", "F4"])
        expect(host.component.closeItem(item("F4"))).toBe(item("F2"))
      })

      it("never the row's last item, nor while every item shows", async () => {
        const { host, item } = await rowOfThree()
        host.component.closeItem(item("F2"))
        host.component.closeItem(item("F4"))
        await expect.poll(() => shown(host)).toEqual(["F0"])
        expect(host.component.closeItem(item("F0"))).toBeUndefined()
        await ElementFixture.settle()
        expect(shown(host)).toEqual(["F0"])

        const all = await toolbar(900, items(3), `${LOOK} max-visible="3"`)
        await ElementFixture.settle()
        all.host.component.closeItem(all.host.querySelectorAll("ui-item")[1]!)
        await ElementFixture.settle()
        expect(shown(all.host)).toEqual(["F0", "F1", "F2"])
      })

      it("`remember`:  a closed item stays closed after a reload", async () => {
        localStorage.removeItem("ui-toolbar-open-items")
        const { host, item } = await rowOfThree('remember="closing-row"')
        host.component.closeItem(item("F2"))
        await expect.poll(() => shown(host)).toEqual(["F0", "F4"])
        const again = await toolbar(900, items(5), `${LOOK} max-visible="3" remember="closing-row"`)
        await expect.poll(() => shown(again.host)).toEqual(["F0", "F4"])
      })
    })

    it("no `max-visible`:  every item, however many", async () => {
      const { host } = await toolbar(300, items(20), LOOK)
      await ElementFixture.settle()
      expect(shown(host)).toHaveLength(20)
    })
  })

  it("`tabs`:  a tablist of tabs, the chosen one selected, one Tab stop", async () => {
    const items = "<ui-item selected>One</ui-item><ui-item>Two</ui-item>"
    const { host, menu } = await toolbar(400, items, 'appearance="segmented link header" tabs')
    await ElementFixture.settle()
    expect(menu.getAttribute("role")).toBe("tablist")
    const boxes = [...host.querySelectorAll("ui-item")].map((item) => item.shadowRoot!.querySelector("[part~=item]")!)
    expect(boxes.map((box) => box.getAttribute("role"))).toEqual(["tab", "tab"])
    expect(boxes.map((box) => box.getAttribute("aria-selected"))).toEqual(["true", "false"])
    expect(boxes.map((box) => box.getAttribute("tabindex"))).toEqual(["0", "-1"])
    expect(boxes[0]!.hasAttribute("aria-current")).toBe(false)
  })
})
