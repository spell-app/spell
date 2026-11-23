import { OBSERVE } from "solid-js"
import { describe, expect, it, vi } from "vite-plus/test"
import { userEvent } from "vite-plus/test/browser"

import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { UITree, UITreeItem, type TreeItemData } from "spell/ui/components/ui-tree"

/** A subclass that classes its rows from `items` by `which`:  `<x-classed-tree>`. */
class ClassedTree extends UITree {
  override rowClass(item: TreeItemData) {
    return item.which ? `has-which  ${item.which}` : undefined
  }
}
ClassedTree.define("x-classed-tree")

/** A tree in the page:  a (b, c (d)), e;  a open, c closed. */
async function tree(attributes = "") {
  const host = (await ElementFixture.render(
    `<ui-tree ${attributes} label="Files" style="width: 300px">
      <ui-tree-item label="a" open>
        <ui-tree-item label="b"></ui-tree-item>
        <ui-tree-item label="c">
          <ui-tree-item label="d" which="deep"></ui-tree-item>
        </ui-tree-item>
      </ui-tree-item>
      <ui-tree-item label="e"></ui-tree-item>
    </ui-tree>`
  )) as HTMLElement
  await ElementFixture.settle()
  return host
}

/** The row labelled `label`. */
function row(host: Element, label: string): HTMLElement {
  return host.querySelector<HTMLElement>(`[label="${label}"]`)!
}

/** The labels of the rows on screen, in order. */
function onScreen(host: Element): string[] {
  return [...host.querySelectorAll<HTMLElement>("ui-tree-item")]
    .filter((item) => item.checkVisibility())
    .map((item) => item.getAttribute("label")!)
}

/** The labels of the selected rows, in order. */
function selected(host: Element): string[] {
  return [...host.querySelectorAll("ui-tree-item[selected]")].map((item) => item.getAttribute("label")!)
}

/** A click on `label`'s row, with `keys` held. */
function click(host: Element, label: string, keys: MouseEventInit = {}) {
  const box = row(host, label).shadowRoot!.querySelector<HTMLElement>('[part~="label"]')!
  box.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, ...keys }))
}

/** Two frames, then a settle:  a size measured, a scroll read. */
async function nextPaint() {
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
  await ElementFixture.settle()
}

/** The path line's words, as it shows them;  empty while it doesn't. */
function pathWords(host: Element): string[] {
  return [...host.shadowRoot!.querySelectorAll('[part~="path-row"]')].map((each) => each.textContent!)
}

/** A click on the path line's `index`th name. */
async function clickPath(host: Element, index: number) {
  host.shadowRoot!.querySelectorAll<HTMLElement>('[part~="path-row"]')[index]!.click()
  await nextPaint()
}

/** A pointer moved onto `box`, inside the tree. */
async function pointAt(box: Element) {
  box.dispatchEvent(new PointerEvent("pointerover", { bubbles: true, composed: true }))
  await ElementFixture.settle()
}

/** Drag `line` by `distance` px, holding Option (Alt) with `isEvery`. */
async function dragLine(line: HTMLElement, distance: number, { isEvery = false } = {}) {
  const box = line.getBoundingClientRect()
  const at = { clientX: box.left + 3, clientY: box.top + 20, pointerId: 1, button: 0, bubbles: true, composed: true }
  line.dispatchEvent(new PointerEvent("pointerdown", { ...at, altKey: isEvery }))
  window.dispatchEvent(new PointerEvent("pointermove", { ...at, clientX: at.clientX + distance }))
  window.dispatchEvent(new PointerEvent("pointerup", { ...at, clientX: at.clientX + distance }))
  // a drag swallows the click its let-go makes, until the next task:  let that pass
  await new Promise((done) => setTimeout(done, 0))
  await ElementFixture.settle()
}

/** `key` pressed on what has the focus. */
async function press(key: string) {
  const target = document.activeElement as HTMLElement
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, composed: true, cancelable: true }))
  await ElementFixture.settle()
}

describe("<ui-tree>", () => {
  it("defines its tags", () => {
    expect(UITree.describe().tag).toBe("ui-tree")
    expect(UITreeItem.describe().tag).toBe("ui-tree-item")
  })

  it("shows the rows of what's open, and only those", async () => {
    const host = await tree()
    expect(onScreen(host)).toEqual(["a", "b", "c", "e"])
  })

  it("draws a closed row's rows only in a side navigation:  shut, inert and hidden there", async () => {
    const plain = await tree()
    expect(row(plain, "c").shadowRoot!.querySelector(".rows")).toBeNull()

    const nav = await tree(`appearance="nav"`)
    const rows = row(nav, "c").shadowRoot!.querySelector<HTMLElement>(".rows")!
    const folded = rows.querySelector<HTMLElement>(".folded")!
    expect(rows.classList.contains("shut")).toBe(true)
    expect(rows.hasAttribute("inert")).toBe(true)
    expect(rows.getBoundingClientRect().height).toBe(0)
    expect(getComputedStyle(folded).visibility).toBe("hidden")

    const open = row(nav, "a").shadowRoot!.querySelector<HTMLElement>(".rows")!
    expect(open.classList.contains("shut")).toBe(false)
    expect(open.getBoundingClientRect().height).toBeGreaterThan(0)
  })

  it("indents a row by how deep it is, the row still the tree's full width", async () => {
    const host = await tree()
    const rowOf = (label: string) => row(host, label).shadowRoot!.querySelector<HTMLElement>('[part~="row"]')!
    expect(rowOf("b").getBoundingClientRect().width).toBe(rowOf("a").getBoundingClientRect().width)
    const paddingOf = (label: string) => parseFloat(getComputedStyle(rowOf(label)).paddingInlineStart)
    expect(paddingOf("b") - paddingOf("a")).toBe(12)
  })

  it("opens and closes on its triangle, with its events, selecting nothing", async () => {
    const host = await tree()
    const opening = vi.fn()
    host.addEventListener("ui-opening", opening)
    row(host, "c").shadowRoot!.querySelector<HTMLElement>('[part~="toggle"]')!.click()
    await ElementFixture.settle()
    expect(opening).toHaveBeenCalledOnce()
    expect(onScreen(host)).toEqual(["a", "b", "c", "d", "e"])
    expect(selected(host)).toEqual([])
  })

  it("draws no triangle on a row with nothing inside, unless it's `expandable`", async () => {
    const host = await tree()
    const toggle = (label: string) => row(host, label).shadowRoot!.querySelector('[part~="toggle"]')!
    expect(getComputedStyle(toggle("e"), "::before").content).toBe("none")
    expect(getComputedStyle(toggle("c"), "::before").content).not.toBe("none")
    row(host, "e").setAttribute("expandable", "")
    await ElementFixture.settle()
    expect(getComputedStyle(toggle("e"), "::before").content).not.toBe("none")
  })

  it("selects one row by default, and says so", async () => {
    const host = await tree()
    const changed = vi.fn()
    host.addEventListener("ui-changed", changed)
    click(host, "b")
    click(host, "e", { metaKey: true })
    expect(selected(host)).toEqual(["e"])
    expect(changed.mock.calls.at(-1)![0].detail).toMatchObject({ value: "e", values: ["e"] })
  })

  it('selects many with `choose="many"`:  Command adds and takes away, Shift takes a range on screen', async () => {
    const host = await tree('choose="many"')
    click(host, "a")
    click(host, "e", { shiftKey: true })
    expect(selected(host)).toEqual(["a", "b", "c", "e"])
    click(host, "b", { metaKey: true })
    expect(selected(host)).toEqual(["a", "c", "e"])
    click(host, "b", { ctrlKey: true })
    expect(selected(host)).toEqual(["a", "b", "c", "e"])
    click(host, "c")
    expect(selected(host)).toEqual(["c"])
  })

  it('in `choose="many"`, a second Shift swaps the run;  what Command added outside it stays', async () => {
    const host = await tree('choose="many"')
    click(host, "a")
    click(host, "e", { metaKey: true })
    expect(selected(host)).toEqual(["a", "e"])
    click(host, "c", { shiftKey: true })
    expect(selected(host)).toEqual(["a", "c", "e"])
    click(host, "e", { shiftKey: true })
    expect(selected(host)).toEqual(["a", "e"])
  })

  it("asks first:  cancelling `ui-selecting` leaves the choice to the page", async () => {
    const host = await tree()
    host.addEventListener("ui-selecting", (event) => event.preventDefault())
    click(host, "b")
    expect(selected(host)).toEqual([])
  })

  it("a `group` row opens and closes on a click, and is never selected", async () => {
    const host = await tree()
    row(host, "c").setAttribute("group", "")
    click(host, "c")
    await ElementFixture.settle()
    expect(onScreen(host)).toContain("d")
    expect(selected(host)).toEqual([])
  })

  it("leaves a click on a row's button to the button", async () => {
    const host = await tree()
    const button = document.createElement("button")
    button.slot = "actions"
    row(host, "e").append(button)
    await ElementFixture.settle()
    button.click()
    expect(selected(host)).toEqual([])
  })

  it("moves with the tree's keys:  arrows, Home, End;  right opens then goes in;  left closes then goes out", async () => {
    const host = await tree()
    row(host, "a").focus()
    await press("ArrowDown")
    expect(document.activeElement).toBe(row(host, "b"))
    await press("ArrowDown")
    expect(document.activeElement).toBe(row(host, "c"))
    await press("ArrowRight")
    expect(onScreen(host)).toContain("d")
    await press("ArrowRight")
    expect(document.activeElement).toBe(row(host, "d"))
    await press("ArrowLeft")
    expect(document.activeElement).toBe(row(host, "c"))
    await press("ArrowLeft")
    expect(onScreen(host)).not.toContain("d")
    await press("End")
    expect(document.activeElement).toBe(row(host, "e"))
    await press("Home")
    expect(document.activeElement).toBe(row(host, "a"))
  })

  it("Enter and Space select, with the keys held", async () => {
    const host = await tree('choose="many"')
    row(host, "b").focus()
    await press("Enter")
    expect(selected(host)).toEqual(["b"])
    row(host, "e").focus()
    await press(" ")
    expect(selected(host)).toEqual(["e"])
  })

  it("is one tab stop", async () => {
    const host = await tree()
    expect(host.querySelectorAll('ui-tree-item[tabindex="0"]').length).toBe(1)
  })

  it("filters:  matches keep the rows they're inside, opened, and clearing it puts the tree back", async () => {
    const host = await tree()
    host.setAttribute("filter", "DEEP")
    await ElementFixture.settle()
    expect(onScreen(host)).toEqual(["a", "c", "d"])
    expect(row(host, "c").hasAttribute("open")).toBe(false)
    host.removeAttribute("filter")
    await ElementFixture.settle()
    expect(onScreen(host)).toEqual(["a", "b", "c", "e"])
  })

  it("says when nothing matches, and finds rows that come later", async () => {
    const host = await tree()
    host.setAttribute("filter", "zebra")
    await ElementFixture.settle()
    expect(onScreen(host)).toEqual([])
    expect(host.shadowRoot!.querySelector('[part~="empty"]')!.textContent).toBe("Nothing matches")
    const late = document.createElement("ui-tree-item")
    late.setAttribute("label", "zebra")
    host.append(late)
    await ElementFixture.settle()
    expect(onScreen(host)).toEqual(["zebra"])
  })

  it("filters 600 rows fast", async () => {
    const rows = Array.from({ length: 600 }, (_, index) => `<ui-tree-item label="row ${index}"></ui-tree-item>`)
    const host = (await ElementFixture.render(`<ui-tree>${rows.join("")}</ui-tree>`)) as HTMLElement
    await ElementFixture.settle()
    const started = performance.now()
    host.setAttribute("filter", "row 59")
    await ElementFixture.settle()
    expect(performance.now() - started).toBeLessThan(100)
    expect(onScreen(host).length).toBe(11)
  })

  it("is accessible", async () => {
    await expectAccessible(await tree('choose="many"'))
  })
})

describe("<ui-tree sticky-path>", () => {
  /** A tree in a 120px box that scrolls:  Solitaire (Grid (StockPile (card 1 ... card 30)), Moves). */
  async function deepTree() {
    const cards = Array.from({ length: 30 }, (_, at) => `<ui-tree-item label="card ${at + 1}"></ui-tree-item>`)
    const box = (await ElementFixture.render(
      `<div style="height: 120px; overflow-y: auto; width: 300px">
        <ui-tree sticky-path label="Views">
          <ui-tree-item label="Solitaire" open>
            <ui-tree-item label="Grid" open>
              <ui-tree-item label="StockPile" open>${cards.join("")}</ui-tree-item>
            </ui-tree-item>
            <ui-tree-item label="Moves"></ui-tree-item>
          </ui-tree-item>
        </ui-tree>
      </div>`
    )) as HTMLElement
    await ElementFixture.settle()
    return { box, host: box.querySelector("ui-tree")! }
  }

  /** The path's words, as it shows them;  empty while it doesn't. */
  async function path(host: Element): Promise<string[]> {
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
    await ElementFixture.settle()
    return [...host.shadowRoot!.querySelectorAll('[part~="path-row"]')].map((each) => each.textContent!)
  }

  it("shows nothing at the top, and the rows around the first one in view once they scroll away", async () => {
    const { box, host } = await deepTree()
    expect(await path(host)).toEqual([])
    box.scrollTop = 22 * 12
    box.dispatchEvent(new Event("scroll"))
    expect(await path(host)).toEqual(["Solitaire", "Grid", "StockPile"])
    const line = host.shadowRoot!.querySelector<HTMLElement>('[part~="path"]')!
    expect(line.getAttribute("aria-hidden")).toBe("true")
    expect(line.getBoundingClientRect().top).toBe(box.getBoundingClientRect().top)
  })

  it("scrolls to a row its path names, selecting nothing", async () => {
    const { box, host } = await deepTree()
    box.scrollTop = 22 * 12
    box.dispatchEvent(new Event("scroll"))
    await path(host)
    const grid = [...host.shadowRoot!.querySelectorAll<HTMLElement>('[part~="path-row"]')][1]!
    grid.click()
    const gridRow = row(host, "Grid").shadowRoot!.querySelector('[part~="row"]')!
    // a line down, where the path was:  Solitaire, all that was around it, is in view again, so the path goes
    expect(Math.round(gridRow.getBoundingClientRect().top)).toBe(Math.round(box.getBoundingClientRect().top) + 22)
    expect(selected(host)).toEqual([])
    expect(await path(host)).toEqual([])
  })
})

describe('<ui-tree appearance="columns">', () => {
  /** A column view:  Acme (Menu (menu.pdf, photos (loaf.jpg)), Site), Books (Catalogue);  nothing open. */
  async function columns(attributes = "", extraRows = "") {
    const host = (await ElementFixture.render(
      `<ui-tree appearance="columns" ${attributes} label="Work" style="height: 200px; width: 900px">
        <ui-tree-item label="Acme">
          <ui-tree-item label="Menu">
            <ui-tree-item label="menu.pdf"></ui-tree-item>
            <ui-tree-item label="photos">
              <ui-tree-item label="loaf.jpg"></ui-tree-item>
            </ui-tree-item>
          </ui-tree-item>
          <ui-tree-item label="Site"></ui-tree-item>
        </ui-tree-item>
        <ui-tree-item label="Books">
          <ui-tree-item label="Catalogue"></ui-tree-item>
        </ui-tree-item>
        ${extraRows}
      </ui-tree>`
    )) as HTMLElement
    await ElementFixture.settle()
    return host
  }

  /** The open rows, outermost first:  each column's pick. */
  function chain(host: Element): string[] {
    return [...host.querySelectorAll("ui-tree-item[open]")].map((item) => item.getAttribute("label")!)
  }

  /** Where `label`'s row starts, from the tree's own left edge. */
  function leftOf(host: Element, label: string): number {
    const line = row(host, label).shadowRoot!.querySelector('[part~="row"]')!
    return Math.round(line.getBoundingClientRect().left - host.getBoundingClientRect().left)
  }

  /** Every column title on screen, from left to right. */
  function titleBoxes(host: Element): HTMLElement[] {
    const first = [...host.shadowRoot!.querySelectorAll<HTMLElement>(".column-title")]
    const deeper = [...host.querySelectorAll("ui-tree-item")].flatMap((item) => [
      ...item.shadowRoot!.querySelectorAll<HTMLElement>(".rows > .column-title")
    ])
    return [...first, ...deeper]
      .filter((title) => title.checkVisibility())
      .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left)
  }

  /** The titles over the columns on screen, in order. */
  function titles(host: Element): string[] {
    return titleBoxes(host).map((title) => title.textContent!)
  }

  /** The line after column `index`, which sizes it. */
  function edge(host: Element, index: number): HTMLElement {
    return host.shadowRoot!.querySelectorAll<HTMLElement>(".column-edge")[index]!
  }

  /** Column `index`'s box:  the top rows', else the rows of the pick before it. */
  function columnBox(host: Element, index: number): HTMLElement {
    if (index === 0) return host.shadowRoot!.querySelector<HTMLElement>(".column")!
    const pick = [...host.querySelectorAll("ui-tree-item[open]")][index - 1]!
    return pick.shadowRoot!.querySelector<HTMLElement>(".rows")!
  }

  it("picking a row selects it and shows its rows in the next column, beside the first", async () => {
    const host = await columns()
    expect(onScreen(host)).toEqual(["Acme", "Books"])
    click(host, "Acme")
    await ElementFixture.settle()
    expect(selected(host)).toEqual(["Acme"])
    expect(onScreen(host)).toEqual(["Acme", "Menu", "Site", "Books"])
    expect(leftOf(host, "Books")).toBe(leftOf(host, "Acme"))
    expect(leftOf(host, "Menu") - leftOf(host, "Acme")).toBeGreaterThan(100)
    // the next column starts at the top, beside the first, not under Acme
    expect(row(host, "Menu").getBoundingClientRect().top).toBe(row(host, "Acme").getBoundingClientRect().top)
  })

  it("picking deeper keeps the chain;  picking earlier closes the columns after it", async () => {
    const host = await columns()
    click(host, "Acme")
    await ElementFixture.settle()
    click(host, "Menu")
    await ElementFixture.settle()
    click(host, "photos")
    await ElementFixture.settle()
    expect(chain(host)).toEqual(["Acme", "Menu", "photos"])
    expect(selected(host)).toEqual(["photos"])
    expect(leftOf(host, "loaf.jpg")).toBeGreaterThan(leftOf(host, "menu.pdf"))
    click(host, "Books")
    await ElementFixture.settle()
    expect(chain(host)).toEqual(["Books"])
    expect(onScreen(host)).toEqual(["Acme", "Books", "Catalogue"])
  })

  it("a picked row with nothing inside is marked a pick, and opens no column", async () => {
    const host = await columns()
    click(host, "Acme")
    await ElementFixture.settle()
    click(host, "Site")
    await ElementFixture.settle()
    expect(chain(host)).toEqual(["Acme", "Site"])
    expect(selected(host)).toEqual(["Site"])
    expect(row(host, "Site").shadowRoot!.querySelector(".rows")).toBeNull()
    expect(host.shadowRoot!.querySelectorAll(".column-edge").length).toBe(2)
  })

  it("a cancelled `ui-selecting` neither selects nor opens", async () => {
    const host = await columns()
    host.addEventListener("ui-selecting", (event) => event.preventDefault())
    click(host, "Acme")
    await ElementFixture.settle()
    expect(chain(host)).toEqual([])
    expect(selected(host)).toEqual([])
  })

  it("keys select as they move, as the Finder's do:  up and down in a column, right and left between them", async () => {
    const host = await columns()
    row(host, "Acme").focus()
    await press("ArrowDown")
    expect(document.activeElement).toBe(row(host, "Books"))
    expect(selected(host)).toEqual(["Books"])
    expect(chain(host)).toEqual(["Books"])
    await press("ArrowUp")
    expect(selected(host)).toEqual(["Acme"])
    expect(chain(host)).toEqual(["Acme"])
    await press("ArrowRight")
    expect(document.activeElement).toBe(row(host, "Menu"))
    expect(selected(host)).toEqual(["Menu"])
    expect(chain(host)).toEqual(["Acme", "Menu"])
    // down stays in Menu's column:  never into Books, the next row of the first
    await press("ArrowDown")
    expect(document.activeElement).toBe(row(host, "Site"))
    await press("ArrowDown")
    expect(document.activeElement).toBe(row(host, "Site"))
    await press("Home")
    expect(document.activeElement).toBe(row(host, "Menu"))
    await press("ArrowRight")
    expect(selected(host)).toEqual(["menu.pdf"])
    await press("ArrowDown")
    expect(chain(host)).toEqual(["Acme", "Menu", "photos"])
    // back out:  Menu selected again, the columns after it kept, photos still its column's pick
    await press("ArrowLeft")
    expect(document.activeElement).toBe(row(host, "Menu"))
    expect(selected(host)).toEqual(["Menu"])
    expect(chain(host)).toEqual(["Acme", "Menu", "photos"])
    // and in again, onto the row picked there before
    await press("ArrowRight")
    expect(document.activeElement).toBe(row(host, "photos"))
    expect(host.querySelectorAll('ui-tree-item[tabindex="0"]').length).toBe(1)
  })

  it("titles each column by level, the last title repeating for deeper ones", async () => {
    const host = await columns('column-titles="Clients, Projects"')
    expect(titles(host)).toEqual(["Clients"])
    click(host, "Acme")
    await ElementFixture.settle()
    click(host, "Menu")
    await ElementFixture.settle()
    click(host, "photos")
    await ElementFixture.settle()
    expect(titles(host)).toEqual(["Clients", "Projects", "Projects", "Projects"])
    // one row of headers:  every title at the same height
    expect(new Set(titleBoxes(host).map((title) => title.getBoundingClientRect().top)).size).toBe(1)
  })

  it("draws no titles without `column-titles`", async () => {
    const host = await columns()
    click(host, "Acme")
    await ElementFixture.settle()
    expect(titles(host)).toEqual([])
  })

  it("keeps each column's title at its top while the column scrolls", async () => {
    const many = Array.from({ length: 40 }, (_, at) => `<ui-tree-item label="row ${at}"></ui-tree-item>`).join("")
    const host = await columns('column-titles="Clients"', many)
    const column = columnBox(host, 0)
    const [title] = titleBoxes(host)
    const top = title!.getBoundingClientRect().top
    column.scrollTop = 300
    await ElementFixture.settle()
    expect(column.scrollTop).toBe(300)
    expect(title!.getBoundingClientRect().top).toBe(top)
    // opaque:  the rows slide under it, unseen
    expect(getComputedStyle(title!).backgroundColor).not.toMatch(/rgba\(.*, 0\)|transparent/)
  })

  /** Column `index`'s width on screen, rounded. */
  function widthOf(host: Element, index: number): number {
    return Math.round(columnBox(host, index).getBoundingClientRect().width)
  }

  it("the line after a column resizes it:  a drag, the arrow keys, a double-click to fit its rows", async () => {
    const host = await columns()
    click(host, "Acme")
    await ElementFixture.settle()
    const start = columnBox(host, 0).getBoundingClientRect().width
    const line = edge(host, 0)
    await dragLine(line, 60)
    expect(widthOf(host, 0)).toBe(Math.round(start + 60))
    // the next column moved with it
    expect(leftOf(host, "Menu") - leftOf(host, "Acme")).toBe(Math.round(start + 60))
    line.focus()
    line.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, composed: true }))
    await ElementFixture.settle()
    expect(widthOf(host, 0)).toBe(Math.round(start + 44))
    // as the Finder's:  fits its longest row, "Books" and its chevron, at least 80px
    line.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, composed: true }))
    await ElementFixture.settle()
    expect(widthOf(host, 0)).toBeLessThan(start)
    expect(widthOf(host, 0)).toBeGreaterThanOrEqual(80)
    expect(row(host, "Books").shadowRoot!.querySelector(".label")!.scrollWidth).toBeLessThanOrEqual(
      row(host, "Books").shadowRoot!.querySelector<HTMLElement>(".label")!.clientWidth
    )
  })

  it("Option-dragging a line sizes every column the same, deeper ones as they come", async () => {
    const host = await columns()
    click(host, "Acme")
    await ElementFixture.settle()
    click(host, "Menu")
    await ElementFixture.settle()
    const start = widthOf(host, 1)
    await dragLine(edge(host, 1), -50, { isEvery: true })
    expect([widthOf(host, 0), widthOf(host, 1), widthOf(host, 2)]).toEqual([start - 50, start - 50, start - 50])
    click(host, "photos")
    await ElementFixture.settle()
    expect(widthOf(host, 3)).toBe(start - 50)
  })

  it("`size` sizes the columns by level, the last for every deeper one:  px, em, a percent, `*`", async () => {
    const host = await columns('size="150, 10em, 20%, *"')
    for (const label of ["Acme", "Menu", "photos"]) {
      click(host, label)
      await ElementFixture.settle()
    }
    const em = parseFloat(getComputedStyle(host.shadowRoot!.querySelector(".columns")!).fontSize)
    expect([widthOf(host, 0), widthOf(host, 1), widthOf(host, 2)]).toEqual([150, Math.round(10 * em), 180])
    expect(widthOf(host, 3)).toBe(Math.round(columnProbeWidth(host)))
    // a column a person sizes keeps that width instead
    await dragLine(edge(host, 0), 30)
    expect(widthOf(host, 0)).toBe(180)
  })

  it('`size="auto"` fits each column to the rows it shows', async () => {
    const host = await columns(
      'size="auto"',
      '<ui-tree-item label="A row with a much longer label than the rest"></ui-tree-item>'
    )
    click(host, "Acme")
    await ElementFixture.settle()
    await nextPaint()
    await nextPaint()
    const label = row(host, "A row with a much longer label than the rest").shadowRoot!.querySelector<HTMLElement>(
      ".label"
    )!
    // the long row shows whole;  the next column, of short rows, is narrower than the token's width
    expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth)
    expect(widthOf(host, 0)).toBeGreaterThan(widthOf(host, 1))
    expect(widthOf(host, 1)).toBeLessThan(Math.round(columnProbeWidth(host)))
  })

  /** What an unsized column's width comes to, px. */
  function columnProbeWidth(host: Element): number {
    return host.shadowRoot!.querySelector(".column-probe")!.getBoundingClientRect().width
  }

  it("remembers the widths under its `id`, by level;  a tree without one doesn't keep them", async () => {
    localStorage.removeItem("ui-tree:widths:work")
    const host = await columns('id="work"')
    edge(host, 0).dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, composed: true }))
    await ElementFixture.settle()
    expect(JSON.parse(localStorage.getItem("ui-tree:widths:work")!)).toEqual({ columns: [expect.any(Number)] })
    const width = columnBox(host, 0).getBoundingClientRect().width
    const again = await columns('id="work"')
    expect(columnBox(again, 0).getBoundingClientRect().width).toBe(width)
    localStorage.removeItem("ui-tree:widths:work")

    const keys = Object.keys(localStorage).length
    const plain = await columns()
    edge(plain, 0).dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, composed: true }))
    await ElementFixture.settle()
    expect(Object.keys(localStorage).length).toBe(keys)
  })

  it("moves widths kept under the old store over, once", async () => {
    localStorage.removeItem("ui-tree:widths:moved")
    localStorage.setItem("ui-tree-column-widths:moved", "[250]")
    const host = await columns('id="moved"')
    expect(widthOf(host, 0)).toBe(250)
    expect(localStorage.getItem("ui-tree-column-widths:moved")).toBeNull()
    expect(JSON.parse(localStorage.getItem("ui-tree:widths:moved")!)).toEqual({ columns: [250] })
    localStorage.removeItem("ui-tree:widths:moved")
  })

  it("is accessible", async () => {
    const host = await columns('column-titles="Clients, Projects, Files"')
    click(host, "Acme")
    await ElementFixture.settle()
    await expectAccessible(host)
  })

  it("`path` names each column's pick as people pick, and the events carry it", async () => {
    const host = (await columns()) as HTMLElement & { path?: string[] }
    const changed = vi.fn()
    host.addEventListener("ui-changed", (event) => changed((event as CustomEvent).detail))
    click(host, "Acme")
    await ElementFixture.settle()
    click(host, "Menu")
    await ElementFixture.settle()
    expect(host.path).toEqual(["Acme", "Menu"])
    expect(changed).toHaveBeenLastCalledWith(
      expect.objectContaining({ path: ["Acme", "Menu"], item: row(host, "Menu") })
    )
  })

  it("a page that sets `path` opens its rows, and selects the last", async () => {
    const host = (await columns()) as HTMLElement & { path?: string[] }
    host.path = ["Acme", "Menu", "photos"]
    await ElementFixture.settle()
    expect(chain(host)).toEqual(["Acme", "Menu", "photos"])
    expect(selected(host)).toEqual(["photos"])
    host.path = ["Books"]
    await ElementFixture.settle()
    expect(chain(host)).toEqual(["Books"])
  })

  it("`filter` filters the last column on screen as it starts, and leaves the others alone", async () => {
    const host = await columns()
    click(host, "Acme")
    await ElementFixture.settle()
    host.setAttribute("filter", "men")
    await ElementFixture.settle()
    expect(onScreen(host)).toEqual(["Acme", "Menu", "Books"])
    host.setAttribute("filter", "zzz")
    await ElementFixture.settle()
    expect(row(host, "Acme").shadowRoot!.querySelector(".empty")?.textContent).toBe("Nothing matches")
    host.removeAttribute("filter")
    await ElementFixture.settle()
    expect(onScreen(host)).toEqual(["Acme", "Menu", "Site", "Books"])
  })

  it("`show` picks a row's parts:  a count of its rows, no chevron", async () => {
    const host = await columns('show="icon count"')
    const count = row(host, "Acme").shadowRoot!.querySelector(".row-count")
    expect(count?.textContent).toBe("2")
    expect(row(host, "Acme").shadowRoot!.querySelector(".toggle")).toBeNull()
    expect(row(host, "Site").shadowRoot!.querySelector(".row-count")).toBeNull()
  })

  it("an `expandable` row picked before its rows come shows a spinner in its column", async () => {
    const host = await columns("", '<ui-tree-item label="Later" expandable></ui-tree-item>')
    click(host, "Later")
    await ElementFixture.settle()
    expect(row(host, "Later").shadowRoot!.querySelector(".rows ui-loader")).not.toBeNull()
    row(host, "Later").append(Object.assign(document.createElement("ui-tree-item"), { label: "came" }))
    await ElementFixture.settle()
    expect(row(host, "Later").shadowRoot!.querySelector(".rows ui-loader")).toBeNull()
  })

  it("sends `ui-settled` once what's selected stays put", async () => {
    const host = await columns()
    const settled = vi.fn()
    host.addEventListener("ui-settled", (event) => settled((event as CustomEvent).detail.value))
    row(host, "Acme").focus()
    await press("ArrowDown")
    await press("ArrowUp")
    await press("ArrowDown")
    expect(settled).not.toHaveBeenCalled()
    await vi.waitFor(() => expect(settled).toHaveBeenCalledTimes(1), { timeout: 2000 })
    expect(settled).toHaveBeenCalledWith("Books")
  })

  /** Every pick down to loaf.jpg, in a tree `width` px wide:  four columns of 224px. */
  async function deepColumns(attributes = "", width = 600) {
    const host = await columns(attributes)
    host.style.width = `${width}px`
    for (const label of ["Acme", "Menu", "photos", "loaf.jpg"]) {
      click(host, label)
      await ElementFixture.settle()
    }
    await nextPaint()
    return host
  }

  /** Which columns, by level, are drawn narrow. */
  function narrowColumns(host: Element): number[] {
    return [0, 1, 2, 3].filter((index) => columnBox(host, index).classList.contains("narrow"))
  }

  it("narrows the first columns while they don't fit, as few as it takes, each showing only its pick", async () => {
    const host = await deepColumns()
    // 4 x 224 = 896 > 600:  the first narrows (704), then the second (512)
    expect(narrowColumns(host)).toEqual([0, 1])
    expect(Math.round(columnBox(host, 0).getBoundingClientRect().width)).toBe(32)
    expect(row(host, "Acme").checkVisibility()).toBe(true)
    expect(row(host, "Books").checkVisibility()).toBe(false)
    expect(row(host, "Acme").matches(":state(in-narrow)")).toBe(true)
    expect(row(host, "photos").matches(":state(in-narrow)")).toBe(false)
    // the `narrow-column` part:  the tree's first column, and each deeper one on its row's `group`
    expect(columnBox(host, 0).getAttribute("part")).toBe("narrow-column")
    expect(columnBox(host, 1).getAttribute("part")).toBe("group narrow-column")
    expect(columnBox(host, 2).getAttribute("part")).toBe("group")
    // the columns after a narrow one move along
    expect(leftOf(host, "menu.pdf")).toBeLessThan(2 * 224)
  })

  it("while even the strips don't make room, the full columns share what they leave", async () => {
    const host = await deepColumns("", 300)
    expect(narrowColumns(host)).toEqual([0, 1])
    const box = host.shadowRoot!.querySelector<HTMLElement>(".columns")!
    expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth)
    expect(widthOf(host, 2)).toBe(widthOf(host, 3))
  })

  it("narrows nothing while the columns fit, and never the last `narrow-before`", async () => {
    // the box's width is measured as it changes:  under load, a paint or two late
    const wide = await deepColumns("", 900)
    await vi.waitFor(() => expect(narrowColumns(wide)).toEqual([]))
    const kept = await deepColumns('narrow-before="3"')
    await vi.waitFor(() => expect(narrowColumns(kept)).toEqual([0]))
  })

  it("widens a narrow column under the pointer OVER the columns after it, and narrows it again once the pointer leaves", async () => {
    const host = await deepColumns()
    const menuLeft = leftOf(host, "menu.pdf")
    await pointAt(row(host, "Acme"))
    expect(narrowColumns(host)).toEqual([1])
    expect(widthOf(host, 0)).toBe(Math.round(columnProbeWidth(host)))
    // the columns after it stay where they are
    expect(leftOf(host, "menu.pdf")).toBe(menuLeft)
    host.dispatchEvent(new PointerEvent("pointerleave"))
    await ElementFixture.settle()
    expect(narrowColumns(host)).toEqual([0, 1])
  })

  it("`sticky-path` names each column's pick above the columns;  a click picks it again, the columns after it kept", async () => {
    const host = await deepColumns("sticky-path")
    expect(pathWords(host)).toEqual(["Acme", "Menu", "photos", "loaf.jpg"])
    const line = host.shadowRoot!.querySelector<HTMLElement>('[part~="path"]')!
    expect(line.getAttribute("aria-hidden")).toBe("true")
    expect(line.getBoundingClientRect().bottom).toBeLessThanOrEqual(columnBox(host, 0).getBoundingClientRect().top)
    const changed = vi.fn()
    host.addEventListener("ui-changed", (event) => changed((event as CustomEvent).detail.value))
    await clickPath(host, 1)
    expect(changed).toHaveBeenCalledWith("Menu")
    expect(selected(host)).toEqual(["Menu"])
    expect(chain(host)).toEqual(["Acme", "Menu", "photos", "loaf.jpg"])
    // the picked column is the selected row's, so it widens
    expect(narrowColumns(host)).toEqual([0])
    expect(document.activeElement).toBe(row(host, "Menu"))
  })

  it("a click on a name in the path line scrolls the box of columns to show that pick's column", async () => {
    // no strips (`narrow-before="4"`):  four columns at their narrowest, 80px, overflow a 260px tree
    const host = await deepColumns('sticky-path narrow-before="4"', 260)
    expect(pathWords(host)).toEqual(["Acme", "Menu", "photos", "loaf.jpg"])
    const box = host.shadowRoot!.querySelector<HTMLElement>(".columns")!
    expect(box.scrollWidth).toBeGreaterThan(box.clientWidth)
    box.scrollTo({ left: box.scrollWidth, behavior: "instant" })
    expect(box.scrollLeft).toBeGreaterThan(0)
    await clickPath(host, 0)
    await vi.waitFor(() => expect(box.scrollLeft).toBe(0), { timeout: 2000 })
  })

  it("folds the path line's outer names that would show fewer than 3 letters into one `…`, naming them", async () => {
    const host = await deepColumns('sticky-path narrow-before="4"', 300)
    host.style.width = "150px"
    await vi.waitFor(() => expect(pathWords(host)[0]).toBe("…"))
    const [folded] = host.shadowRoot!.querySelectorAll<HTMLElement>('[part~="path-row"]')
    expect(folded!.title).toContain("Acme")
    expect(pathWords(host).at(-1)).toBe("loaf.jpg")
    host.style.width = "900px"
    await vi.waitFor(() => expect(pathWords(host)).toEqual(["Acme", "Menu", "photos", "loaf.jpg"]))
  })

  it("shows no path line without `sticky-path`, nor before anything is picked", async () => {
    expect(pathWords(await deepColumns())).toEqual([])
    expect(pathWords(await columns("sticky-path"))).toEqual([])
  })

  it("`column-min-width`:  while even the strips don't make room, the full columns keep it, and scroll sideways", async () => {
    const host = await deepColumns('column-min-width="200"', 300)
    expect(narrowColumns(host)).toEqual([0, 1])
    expect([widthOf(host, 2), widthOf(host, 3)]).toEqual([200, 200])
    const box = host.shadowRoot!.querySelector<HTMLElement>(".columns")!
    expect(box.scrollWidth).toBeGreaterThan(box.clientWidth)
    expect(edge(host, 2).getAttribute("aria-valuemin")).toBe("200")
  })

  it("`column-min-width` and `column-max-width` hold every column between them:  `size`, a drag, the keys", async () => {
    const host = await columns('size="300, 60" column-min-width="120" column-max-width="250"')
    click(host, "Acme")
    await ElementFixture.settle()
    expect([widthOf(host, 0), widthOf(host, 1)]).toEqual([250, 120])
    expect(edge(host, 0).getAttribute("aria-valuemax")).toBe("250")
    await dragLine(edge(host, 0), -200)
    expect(widthOf(host, 0)).toBe(120)
    await dragLine(edge(host, 0), 400)
    expect(widthOf(host, 0)).toBe(250)
    // narrower than the least:  the least;  in em
    host.setAttribute("column-min-width", "10em")
    await ElementFixture.settle()
    const em = parseFloat(getComputedStyle(host.shadowRoot!.querySelector(".columns")!).fontSize)
    expect(widthOf(host, 1)).toBe(Math.round(10 * em))
  })

  it('`size="auto"` fits a column up to `column-max-width`, never under `column-min-width`', async () => {
    const host = await columns(
      'size="auto" column-min-width="150" column-max-width="180"',
      '<ui-tree-item label="A row with a much longer label than the rest, longer than any column here"></ui-tree-item>'
    )
    click(host, "Acme")
    await ElementFixture.settle()
    await nextPaint()
    await nextPaint()
    expect(widthOf(host, 0)).toBe(180)
    // Acme's column, "Menu" and "Site", needs far less
    expect(widthOf(host, 1)).toBe(150)
  })
})

describe('<ui-tree appearance="columns"> from `items`', () => {
  type TreeHost = HTMLElement & { items?: TreeItemData[]; path?: string[] }

  /** Made from `children` functions, counted:  how many times each one ran. */
  const runs: Record<string, number> = {}

  /** The folders:  Acme (Menu (menu.pdf, photos (loaf.jpg)), Site), Books (Catalogue), Empty (nothing, once run). */
  function folders(): TreeItemData[] {
    const made = (id: string, list: TreeItemData[]) => () => {
      runs[id] = (runs[id] ?? 0) + 1
      return list
    }
    return [
      {
        id: "acme",
        label: "Acme",
        icon: "building outline",
        which: "bakery",
        children: made("acme", [
          {
            id: "menu",
            label: "Menu",
            children: [
              { id: "menu.pdf", label: "menu.pdf" },
              { id: "photos", label: "photos", children: [{ id: "loaf.jpg", label: "loaf.jpg" }] }
            ]
          },
          { id: "site", label: "Site" }
        ])
      },
      { id: "books", label: "Books", children: [{ id: "catalogue", label: "Catalogue" }] },
      { id: "empty", label: "Empty", children: made("empty", []) }
    ]
  }

  async function dataTree(attributes = "", tag = "ui-tree"): Promise<TreeHost> {
    for (const key of Object.keys(runs)) delete runs[key]
    const host = (await ElementFixture.render(
      `<${tag} appearance="columns" ${attributes} label="Work" style="height: 200px; width: 900px"></${tag}>`
    )) as TreeHost
    host.items = folders()
    await ElementFixture.settle()
    return host
  }

  /** The rows of each column, by label. */
  function columnLabels(host: Element): string[][] {
    return [...host.shadowRoot!.querySelectorAll("ul.column")].map((column) =>
      [...column.querySelectorAll(".column-row .words")].map((words) => words.textContent!)
    )
  }

  /** The row of id `id`. */
  function dataRow(host: Element, id: string): HTMLElement {
    return host.shadowRoot!.querySelector<HTMLElement>(`.column-row[data-id="${CSS.escape(id)}"]`)!
  }

  /** A click on the row of id `id`. */
  async function pick(host: Element, id: string) {
    dataRow(host, id).click()
    await ElementFixture.settle()
  }

  it("draws the top items as the first column, and a pick's children as the next", async () => {
    const host = await dataTree()
    expect(columnLabels(host)).toEqual([["Acme", "Books", "Empty"]])
    await pick(host, "acme")
    expect(columnLabels(host)).toEqual([
      ["Acme", "Books", "Empty"],
      ["Menu", "Site"]
    ])
    await pick(host, "menu")
    expect(host.path).toEqual(["acme", "menu"])
    expect(dataRow(host, "acme").classList).toContain("on-path")
    expect(dataRow(host, "menu").classList).toContain("selected")
    // as wide as the line after it says:  one per column
    expect(host.shadowRoot!.querySelectorAll(".column-edge").length).toBe(3)
  })

  it("runs a `children` function once, the first time its item opens", async () => {
    const host = await dataTree()
    expect(runs.acme).toBeUndefined()
    await pick(host, "acme")
    await pick(host, "books")
    await pick(host, "acme")
    expect(runs.acme).toBe(1)
  })

  it("a `children` function that makes nothing loses its chevron, and opens no column", async () => {
    const host = await dataTree()
    expect(dataRow(host, "empty").querySelector(".chevron")).not.toBeNull()
    await pick(host, "empty")
    expect(columnLabels(host).length).toBe(1)
    expect(dataRow(host, "empty").querySelector(".chevron")).toBeNull()
    expect(dataRow(host, "empty").classList).toContain("selected")
  })

  it("runs a `children` function inside the path line's work with no reactive write there", async () => {
    // Solid's dev build reports a write inside a computation as `REACTIVE_WRITE_IN_OWNED_SCOPE`
    const capture = OBSERVE!.diagnostics.capture()
    const host = await dataTree("sticky-path")
    await pick(host, "acme")
    await pick(host, "empty")
    const codes = capture.stop().map((event) => event.code)
    expect(codes).not.toContain("REACTIVE_WRITE_IN_OWNED_SCOPE")
    expect(dataRow(host, "empty").querySelector(".chevron")).toBeNull()
    await pick(host, "acme")
    expect(columnLabels(host)[1]).toEqual(["Menu", "Site"])
  })

  it("shows a spinner, and no empty line, while a promised list comes", async () => {
    const host = await dataTree()
    let arrive: (list: TreeItemData[]) => void = () => {}
    host.items = [
      { id: "slow", label: "Slow", children: () => new Promise<TreeItemData[]>((resolve) => (arrive = resolve)) }
    ]
    await ElementFixture.settle()
    await pick(host, "slow")
    const column = host.shadowRoot!.querySelectorAll("ul.column")[1]!
    expect(column.querySelector("ui-loader")).not.toBeNull()
    expect(column.querySelector(".empty")).toBeNull()
    arrive([{ id: "came", label: "came" }])
    await vi.waitFor(() => expect(columnLabels(host)[1]).toEqual(["came"]))
    expect(host.shadowRoot!.querySelector("ul.column ui-loader")).toBeNull()
  })

  it("a page that sets `path` opens it", async () => {
    const host = await dataTree()
    host.path = ["acme", "menu", "photos"]
    await ElementFixture.settle()
    expect(columnLabels(host).at(-1)).toEqual(["loaf.jpg"])
    expect(dataRow(host, "photos").classList).toContain("selected")
  })

  it("asks first, and the events carry the item and its path", async () => {
    const host = await dataTree()
    const changed = vi.fn()
    host.addEventListener("ui-changed", (event) => changed((event as CustomEvent).detail))
    const refuse = (event: Event) => event.preventDefault()
    host.addEventListener("ui-selecting", refuse)
    await pick(host, "acme")
    expect(host.path ?? []).toEqual([])
    expect(changed).not.toHaveBeenCalled()
    host.removeEventListener("ui-selecting", refuse)
    await pick(host, "acme")
    expect(changed).toHaveBeenCalledWith(expect.objectContaining({ value: "acme", path: ["acme"] }))
    expect(changed.mock.calls[0]![0].item.label).toBe("Acme")
  })

  it("keys select as they move:  up and down in a column, right goes in, left comes back keeping the columns after", async () => {
    const host = await dataTree()
    /** `key` pressed on the row that has the focus, in the tree's shadow root. */
    const press = async (key: string) => {
      const target = host.shadowRoot!.activeElement as HTMLElement
      target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, composed: true, cancelable: true }))
      await ElementFixture.settle()
    }
    dataRow(host, "acme").focus()
    await press("ArrowDown")
    expect(host.path).toEqual(["books"])
    expect(host.shadowRoot!.activeElement).toBe(dataRow(host, "books"))
    await press("ArrowUp")
    await press("ArrowRight")
    expect(host.path).toEqual(["acme", "menu"])
    expect(host.shadowRoot!.activeElement).toBe(dataRow(host, "menu"))
    await press("ArrowRight")
    await press("ArrowDown")
    expect(host.path).toEqual(["acme", "menu", "photos"])
    await press("ArrowLeft")
    expect(host.shadowRoot!.activeElement).toBe(dataRow(host, "menu"))
    expect(dataRow(host, "menu").classList).toContain("selected")
    expect(dataRow(host, "photos").classList).toContain("on-path")
    expect(columnLabels(host).length).toBe(4)
    await press("ArrowRight")
    expect(host.shadowRoot!.activeElement).toBe(dataRow(host, "photos"))
    expect(host.shadowRoot!.querySelectorAll('.column-row[tabindex="0"]').length).toBe(1)
  })

  it("`filter` filters the last column on screen as it starts", async () => {
    const host = await dataTree()
    await pick(host, "acme")
    host.setAttribute("filter", "sit")
    await ElementFixture.settle()
    expect(columnLabels(host)).toEqual([["Acme", "Books", "Empty"], ["Site"]])
    host.setAttribute("filter", "zzz")
    await ElementFixture.settle()
    expect(host.shadowRoot!.querySelector("ul.column .empty")?.textContent).toBe("Nothing matches")
  })

  it("titles each column, and lines its rows' parts up as `show` says", async () => {
    const host = await dataTree('column-titles="Clients, Projects" show="icon which count"')
    await pick(host, "acme")
    expect([...host.shadowRoot!.querySelectorAll(".column-title")].map((title) => title.textContent)).toEqual([
      "Clients",
      "Projects"
    ])
    expect(dataRow(host, "acme").querySelector(".chevron")).toBeNull()
    expect(dataRow(host, "acme").querySelector(".which")?.textContent).toBe("bakery")
    expect(dataRow(host, "books").querySelector(".count")?.textContent).toBe("1")
    // the label starts at the same place on a row with an icon and one without
    const words = (id: string) => dataRow(host, id).querySelector(".words")!.getBoundingClientRect().left
    expect(words("books")).toBe(words("acme"))
  })

  it("a subclass's `rowClass(item)` adds classes to its rows", async () => {
    const host = await dataTree("", "x-classed-tree")
    expect([...dataRow(host, "acme").classList]).toEqual(expect.arrayContaining(["column-row", "has-which", "bakery"]))
    expect([...dataRow(host, "books").classList]).not.toContain("has-which")
  })

  it("narrows the first columns while they don't fit, each showing only its pick, until the pointer is on one", async () => {
    const host = await dataTree("sticky-path")
    host.style.width = "600px"
    host.path = ["acme", "menu", "photos", "loaf.jpg"]
    await nextPaint()
    const narrow = () =>
      [...host.shadowRoot!.querySelectorAll<HTMLElement>("ul.column")].flatMap((column, index) =>
        column.classList.contains("narrow") ? [index] : []
      )
    expect(narrow()).toEqual([0, 1])
    const first = host.shadowRoot!.querySelector<HTMLElement>('ul.column[data-depth="0"]')!
    expect(first.getAttribute("part")).toContain("narrow-column")
    expect(dataRow(host, "acme").checkVisibility()).toBe(true)
    expect(dataRow(host, "books").checkVisibility()).toBe(false)
    await pointAt(dataRow(host, "acme"))
    expect(narrow()).toEqual([1])
    host.dispatchEvent(new PointerEvent("pointerleave"))
    await ElementFixture.settle()
    // the path line names each pick;  a click on one selects it, keeping the columns after it, and widens its column
    expect(pathWords(host)).toEqual(["Acme", "Menu", "photos", "loaf.jpg"])
    await clickPath(host, 1)
    expect(host.path).toEqual(["acme", "menu", "photos", "loaf.jpg"])
    expect(dataRow(host, "menu").classList).toContain("selected")
    expect(narrow()).toEqual([0])
  })

  it("is accessible", async () => {
    const host = await dataTree('column-titles="Clients, Projects"')
    await pick(host, "acme")
    await expectAccessible(host)
  })
})

describe('<ui-tree appearance="columns"> remembered path and `detail` pane', () => {
  type TreeHost = HTMLElement & { items?: TreeItemData[]; path?: string[] }
  type DetailHost = HTMLElement & { item?: unknown }

  /** Acme (Menu (menu.pdf), Site), Books. */
  function folders(): TreeItemData[] {
    return [
      {
        id: "acme",
        label: "Acme",
        children: [
          { id: "menu", label: "Menu", children: [{ id: "menu.pdf", label: "menu.pdf" }] },
          { id: "site", label: "Site" }
        ]
      },
      { id: "books", label: "Books" }
    ]
  }

  /** A tree from `items`, 900px wide, with `inside` as its children. */
  async function dataTree(attributes = "", inside = ""): Promise<TreeHost> {
    const host = (await ElementFixture.render(
      `<ui-tree appearance="columns" ${attributes} label="Work" style="height: 200px; width: 900px">${inside}</ui-tree>`
    )) as TreeHost
    host.items = folders()
    await ElementFixture.settle()
    return host
  }

  /** A click on the row of id `id`. */
  async function pick(host: Element, id: string) {
    host.shadowRoot!.querySelector<HTMLElement>(`.column-row[data-id="${CSS.escape(id)}"]`)!.click()
    await ElementFixture.settle()
  }

  /** The pane, while it's drawn. */
  function pane(host: Element): HTMLElement | null {
    return host.shadowRoot!.querySelector<HTMLElement>(".detail")
  }

  /** A key on the pane's line. */
  async function keyOnPaneLine(host: Element, key: string) {
    const line = host.shadowRoot!.querySelector<HTMLElement>(".detail-edge")!
    line.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, composed: true }))
    await ElementFixture.settle()
  }

  /** Forget what the trees of ids `ids` kept. */
  function forget(...ids: string[]) {
    for (const id of ids) {
      localStorage.removeItem(`ui-tree:path:${id}`)
      localStorage.removeItem(`ui-tree:widths:${id}`)
    }
  }

  it("keeps the last path under its `id`, and opens it again when the page sets none", async () => {
    forget("kept")
    const host = await dataTree('id="kept"')
    await pick(host, "acme")
    await pick(host, "menu")
    expect(JSON.parse(localStorage.getItem("ui-tree:path:kept")!)).toEqual(["acme", "menu"])
    host.remove()
    const again = await dataTree('id="kept"')
    expect(again.path).toEqual(["acme", "menu"])
    expect(again.shadowRoot!.querySelectorAll("ul.column").length).toBe(3)
    forget("kept")
  })

  it("a path the page sets wins over the kept one, and isn't kept;  a tree without an `id` keeps nothing", async () => {
    forget("set")
    localStorage.setItem("ui-tree:path:set", JSON.stringify(["acme", "menu"]))
    const host = (await ElementFixture.render(
      `<ui-tree id="set" appearance="columns" label="Work" style="height: 200px; width: 900px"></ui-tree>`
    )) as TreeHost
    host.items = folders()
    host.path = ["books"]
    await ElementFixture.settle()
    expect(host.path).toEqual(["books"])
    // only a person's pick is kept:  the page's path never writes over where they left it
    expect(JSON.parse(localStorage.getItem("ui-tree:path:set")!)).toEqual(["acme", "menu"])
    await pick(host, "acme")
    expect(JSON.parse(localStorage.getItem("ui-tree:path:set")!)).toEqual(["acme"])
    forget("set")

    const keys = Object.keys(localStorage).length
    const plain = await dataTree()
    await pick(plain, "acme")
    expect(Object.keys(localStorage).length).toBe(keys)
  })

  it("from markup, rows the page marked open keep their path:  the kept one isn't opened", async () => {
    forget("marked")
    localStorage.setItem("ui-tree:path:marked", JSON.stringify(["Books"]))
    const host = (await ElementFixture.render(
      `<ui-tree id="marked" appearance="columns" label="Work" style="height: 200px; width: 900px">
        <ui-tree-item label="Acme" open><ui-tree-item label="Menu" selected></ui-tree-item></ui-tree-item>
        <ui-tree-item label="Books"></ui-tree-item>
      </ui-tree>`
    )) as TreeHost
    await ElementFixture.settle()
    expect(host.querySelector('ui-tree-item[label="Books"]')!.hasAttribute("open")).toBe(false)
    forget("marked")
  })

  it("with `column-titles`, an empty title cell tops it, in line with the columns' titles", async () => {
    const host = await dataTree('column-titles="Client, Folder"', `<div slot="detail">About it</div>`)
    await pick(host, "acme")
    const title = pane(host)!.querySelector<HTMLElement>(".column-title")!
    const columnTitle = host.shadowRoot!.querySelector<HTMLElement>("ul.column > .column-title")!
    expect(title.textContent).toBe("")
    expect(title.getBoundingClientRect().height).toBe(columnTitle.getBoundingClientRect().height)
    expect(title.getBoundingClientRect().top).toBe(columnTitle.getBoundingClientRect().top)
  })

  it("draws no pane with nothing slotted, nor before anything is picked", async () => {
    const plain = await dataTree()
    await pick(plain, "acme")
    expect(pane(plain)).toBeNull()
    const host = await dataTree("", `<div slot="detail">About it</div>`)
    expect(pane(host)).toBeNull()
    await pick(host, "acme")
    expect(pane(host)).not.toBeNull()
  })

  it("hands the slotted element the picked item, as its `item`, as the pick changes", async () => {
    const host = await dataTree("", `<div slot="detail">About it</div>`)
    const detail = host.querySelector<DetailHost>('[slot="detail"]')!
    await pick(host, "acme")
    expect((detail.item as TreeItemData).id).toBe("acme")
    await pick(host, "menu")
    expect((detail.item as TreeItemData).id).toBe("menu")
  })

  it("sits tight against the last column, as wide as its content, the room after it left over", async () => {
    const host = await dataTree("", `<div slot="detail" style="width: 150px">About it</div>`)
    await pick(host, "acme")
    const columns = [...host.shadowRoot!.querySelectorAll("ul.column")]
    const last = columns.at(-1)!.getBoundingClientRect()
    const box = pane(host)!.getBoundingClientRect()
    expect(Math.round(box.left)).toBe(Math.round(last.right))
    // its content, its padding (12px a side) and its border
    expect(Math.round(box.width)).toBe(150 + 24 + 1)
    expect(box.right).toBeLessThan(host.getBoundingClientRect().right - 100)
  })

  it("from markup too:  after the deepest column, tight against it", async () => {
    const host = (await ElementFixture.render(
      `<ui-tree appearance="columns" label="Work" style="height: 200px; width: 900px">
        <ui-tree-item label="Acme"><ui-tree-item label="Menu"></ui-tree-item></ui-tree-item>
        <div slot="detail">About it</div>
      </ui-tree>`
    )) as TreeHost
    await ElementFixture.settle()
    host.querySelector<HTMLElement>('ui-tree-item[label="Acme"]')!.click()
    await ElementFixture.settle()
    const acme = host.querySelector('ui-tree-item[label="Acme"]')!
    const deepest = acme.shadowRoot!.querySelector(".rows")!.getBoundingClientRect()
    expect(Math.round(pane(host)!.getBoundingClientRect().left)).toBe(Math.round(deepest.right))
    expect((host.querySelector<DetailHost>('[slot="detail"]')!.item as Element).getAttribute("label")).toBe("Acme")
  })

  it("its line resizes it, kept with the widths under its `id`;  a double-click sizes it to its content again", async () => {
    forget("pane")
    const host = await dataTree('id="pane"', `<div slot="detail" style="width: 150px">About it</div>`)
    await pick(host, "acme")
    const start = Math.round(pane(host)!.getBoundingClientRect().width)
    await keyOnPaneLine(host, "ArrowRight")
    expect(Math.round(pane(host)!.getBoundingClientRect().width)).toBe(start + 16)
    expect(JSON.parse(localStorage.getItem("ui-tree:widths:pane")!)).toEqual({ detail: start + 16 })
    host.remove()
    const again = await dataTree('id="pane"', `<div slot="detail" style="width: 150px">About it</div>`)
    expect(Math.round(pane(again)!.getBoundingClientRect().width)).toBe(start + 16)
    again
      .shadowRoot!.querySelector(".detail-edge")!
      .dispatchEvent(new MouseEvent("dblclick", { bubbles: true, composed: true }))
    await ElementFixture.settle()
    expect(Math.round(pane(again)!.getBoundingClientRect().width)).toBe(start)
    expect(localStorage.getItem("ui-tree:widths:pane")).toBeNull()
    forget("pane")
  })

  it("a pointer drag on its line resizes it, kept with the widths", async () => {
    forget("dragged")
    const host = await dataTree('id="dragged"', `<div slot="detail" style="width: 150px">About it</div>`)
    await pick(host, "acme")
    const start = Math.round(pane(host)!.getBoundingClientRect().width)
    await dragLine(host.shadowRoot!.querySelector<HTMLElement>(".detail-edge")!, 40)
    expect(Math.round(pane(host)!.getBoundingClientRect().width)).toBe(start + 40)
    expect(JSON.parse(localStorage.getItem("ui-tree:widths:dragged")!)).toEqual({ detail: start + 40 })
    forget("dragged")
  })

  it("with nothing slotted, a narrow tree's columns are as wide as a tree that never had a pane", async () => {
    /** A 400px tree open to menu.pdf, with `inside`;  its columns' widths on screen. */
    const widths = async (inside: string) => {
      const host = (await ElementFixture.render(
        `<ui-tree appearance="columns" label="Work" style="height: 200px; width: 400px">${inside}</ui-tree>`
      )) as TreeHost
      host.items = folders()
      host.path = ["acme", "menu", "menu.pdf"]
      await nextPaint()
      await nextPaint()
      return { host, widths: [...host.shadowRoot!.querySelectorAll("ul.column")].map((each) => each.clientWidth) }
    }
    const plain = await widths("")
    const emptied = await widths(`<div slot="detail" style="width: 200px">About it</div>`)
    expect(pane(emptied.host)).not.toBeNull()
    emptied.host.querySelector('[slot="detail"]')!.remove()
    await nextPaint()
    await nextPaint()
    expect(pane(emptied.host)).toBeNull()
    expect([...emptied.host.shadowRoot!.querySelectorAll("ul.column")].map((each) => each.clientWidth)).toEqual(
      plain.widths
    )
    expect(pane(plain.host)).toBeNull()
  })

  it("its room comes off the columns':  they narrow to make room for it", async () => {
    const host = (await ElementFixture.render(
      `<ui-tree appearance="columns" label="Work" style="height: 200px; width: 600px">
        <div slot="detail" style="width: 260px">About it</div>
      </ui-tree>`
    )) as TreeHost
    host.items = folders()
    host.path = ["acme", "menu", "menu.pdf"]
    // measured as the pane and the box draw:  a frame or two, longer under load
    // (the tree's own list, not the `narrow` class:  a pointer an earlier test left over a strip widens it)
    const box = host.shadowRoot!.querySelector(".columns")!
    const tree = (host as TreeHost & { component: UITree }).component
    await vi.waitFor(() => {
      expect(tree.narrowColumns.length).toBeGreaterThan(0)
      expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth + 1)
    })
  })

  it("`sticky-detail` keeps it in view while the columns scroll sideways", async () => {
    const host = (await ElementFixture.render(
      `<ui-tree appearance="columns" sticky-detail size="200" narrow-before="9" label="Work" style="height: 200px; width: 400px">
        <div slot="detail" style="width: 150px">About it</div>
      </ui-tree>`
    )) as TreeHost
    host.items = folders()
    host.path = ["acme", "menu", "menu.pdf"]
    await ElementFixture.settle()
    const box = host.shadowRoot!.querySelector<HTMLElement>(".columns")!
    expect(box.scrollWidth).toBeGreaterThan(box.clientWidth)
    box.scrollTo({ left: 0, behavior: "instant" })
    await ElementFixture.settle()
    const right = Math.round(pane(host)!.getBoundingClientRect().right)
    expect(right).toBeLessThanOrEqual(Math.round(box.getBoundingClientRect().right))
    expect(right).toBeGreaterThan(Math.round(box.getBoundingClientRect().right) - 4)
  })
})

describe("<ui-tree> opening to a depth, and `filter` through the whole tree", () => {
  type TreeHost = HTMLElement & {
    items?: TreeItemData[]
    path?: string[]
    filter?: string
    openTo(levels: number): Promise<void>
    closeAll(): void
  }

  /** An outline three levels deep:  a (b (c (d))), e (f). */
  async function outline(attributes = "") {
    const host = (await ElementFixture.render(
      `<ui-tree ${attributes} label="Files" style="width: 300px">
        <ui-tree-item label="a">
          <ui-tree-item label="b">
            <ui-tree-item label="c">
              <ui-tree-item label="d"></ui-tree-item>
            </ui-tree-item>
          </ui-tree-item>
        </ui-tree-item>
        <ui-tree-item label="e">
          <ui-tree-item label="f"></ui-tree-item>
        </ui-tree-item>
      </ui-tree>`
    )) as TreeHost
    await ElementFixture.settle()
    return host
  }

  /** The `tools` buttons' words. */
  function tools(host: Element): HTMLButtonElement[] {
    return [...host.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part~="tool"]')]
  }

  /** Columns from markup:  Acme (Menu (menu.pdf, photos (loaf.jpg)), Site), Books (Catalogue). */
  async function columns(attributes = "") {
    const host = (await ElementFixture.render(
      `<ui-tree appearance="columns" ${attributes} label="Work" style="height: 240px; width: 900px">
        <ui-tree-item label="Acme">
          <ui-tree-item label="Menu">
            <ui-tree-item label="menu.pdf"></ui-tree-item>
            <ui-tree-item label="photos">
              <ui-tree-item label="loaf.jpg"></ui-tree-item>
            </ui-tree-item>
          </ui-tree-item>
          <ui-tree-item label="Site"></ui-tree-item>
        </ui-tree-item>
        <ui-tree-item label="Books">
          <ui-tree-item label="Catalogue"></ui-tree-item>
        </ui-tree-item>
      </ui-tree>`
    )) as TreeHost
    await ElementFixture.settle()
    return host
  }

  /** The open rows from markup, outermost first. */
  function chain(host: Element): string[] {
    const open: string[] = []
    for (let level: Element | undefined = host; level;) {
      const next: Element | undefined = [...level.children].find(
        (child) => child.localName === "ui-tree-item" && child.hasAttribute("open")
      )
      if (next) open.push(next.getAttribute("label")!)
      level = next
    }
    return open
  }

  /** Each match elsewhere in the tree, as its words and the rows it's inside:  `loaf.jpg (Acme › Menu › photos)`. */
  function matches(root: ParentNode): string[] {
    return [...root.querySelectorAll(".match")].map((match) => {
      const words = match.querySelector(".words")!.textContent
      const path = match.querySelector(".match-path")?.textContent
      return path ? `${words} (${path})` : words!
    })
  }

  /** Made from `children` functions, counted:  how many times each one ran. */
  const runs: Record<string, number> = {}

  /** The folders from data:  Acme (Menu (menu.pdf, photos (loaf.jpg)), Site), Books (Catalogue). */
  function folders(): TreeItemData[] {
    const made = (id: string, list: TreeItemData[]) => () => {
      runs[id] = (runs[id] ?? 0) + 1
      return list
    }
    return [
      {
        id: "acme",
        label: "Acme",
        children: made("acme", [
          {
            id: "menu",
            label: "Menu",
            children: made("menu", [
              { id: "menu.pdf", label: "menu.pdf" },
              { id: "photos", label: "photos", children: [{ id: "loaf.jpg", label: "loaf.jpg" }] }
            ])
          },
          { id: "site", label: "Site" }
        ])
      },
      { id: "books", label: "Books", children: [{ id: "catalogue", label: "Catalogue" }] }
    ]
  }

  async function dataTree(attributes = "", items: TreeItemData[] = folders()): Promise<TreeHost> {
    for (const key of Object.keys(runs)) delete runs[key]
    const host = (await ElementFixture.render(
      `<ui-tree appearance="columns" ${attributes} label="Work" style="height: 240px; width: 900px"></ui-tree>`
    )) as TreeHost
    host.items = items
    await ElementFixture.settle()
    return host
  }

  /** The rows of each column from data, by label. */
  function columnLabels(host: Element): string[][] {
    return [...host.shadowRoot!.querySelectorAll("ul.column")].map((column) =>
      [...column.querySelectorAll(".column-row .words")].map((words) => words.textContent!)
    )
  }

  it("`openTo()` opens every row less deep, and closes the deeper ones;  `closeAll()` closes every row", async () => {
    const host = await outline()
    await host.openTo(3)
    await ElementFixture.settle()
    expect(onScreen(host)).toEqual(["a", "b", "c", "e", "f"])
    await host.openTo(2)
    await ElementFixture.settle()
    expect(onScreen(host)).toEqual(["a", "b", "e", "f"])
    expect(row(host, "b").hasAttribute("open")).toBe(false)
    host.closeAll()
    await ElementFixture.settle()
    expect(onScreen(host)).toEqual(["a", "e"])
  })

  it("`openTo()` waits for an `expandable` row's rows, then opens them in turn, a level at a time", async () => {
    const host = await outline()
    const later = (label: string, inside?: string) => {
      const made = Object.assign(document.createElement("ui-tree-item"), { label })
      if (inside) made.setAttribute("expandable", "")
      made.dataset.inside = inside ?? ""
      return made
    }
    host.append(later("g", "h"))
    // a page that adds a row's rows only once it opens, a moment later
    host.addEventListener("ui-opening", (event) => {
      const opened = event.target as HTMLElement
      const inside = opened.dataset.inside
      if (!inside || opened.querySelector("ui-tree-item")) return
      setTimeout(() => opened.append(later(inside, inside === "h" ? "i" : undefined)), 10)
    })
    await ElementFixture.settle()
    await host.openTo(3)
    await ElementFixture.settle()
    // g's rows came as it opened, then h's as h did
    expect(onScreen(host)).toEqual(["a", "b", "c", "e", "f", "g", "h", "i"])
    expect(row(host, "h").hasAttribute("open")).toBe(true)
  })

  it("`tools` draws the buttons, Spell UI's mini basic ones, and the `tools` slot at the end of their line", async () => {
    const host = await outline("tools")
    host.style.width = "600px"
    const field = Object.assign(document.createElement("input"), { slot: "tools" })
    host.append(field)
    await ElementFixture.settle()
    expect(tools(host).every((tool) => tool.localName === "ui-button" && tool.getAttribute("size") === "mini")).toBe(
      true
    )
    const line = host.shadowRoot!.querySelector(".tools")!
    expect(line.querySelector<HTMLSlotElement>("slot")!.assignedElements()).toEqual([field])
    // on the same line, at its end
    const button = tools(host)[2]!.getBoundingClientRect()
    const box = field.getBoundingClientRect()
    expect(box.left).toBeGreaterThan(button.right)
    expect(Math.abs(box.top + box.height / 2 - (button.top + button.height / 2))).toBeLessThan(4)
    expect(Math.round(box.right)).toBe(Math.round(line.getBoundingClientRect().right - 8))
    // a filter hides what isn't a row, but not what's in a named slot
    host.setAttribute("filter", "a")
    await ElementFixture.settle()
    expect(field.checkVisibility()).toBe(true)
  })

  it("`tools` draws the buttons, which do the same, and is accessible", async () => {
    const host = await outline("tools")
    expect(tools(host).map((tool) => tool.textContent)).toEqual(["Open 2 levels", "Open 3 levels", "Close all"])
    tools(host)[1]!.click()
    await ElementFixture.settle()
    expect(onScreen(host)).toEqual(["a", "b", "c", "e", "f"])
    tools(host)[2]!.click()
    await ElementFixture.settle()
    expect(onScreen(host)).toEqual(["a", "e"])
    expect(selected(host)).toEqual([])
    await expectAccessible(host)
  })

  it("in columns from markup, `openTo()` shows that many columns, and `closeAll()` goes back to the first", async () => {
    const host = await columns()
    await host.openTo(3)
    await ElementFixture.settle()
    expect(chain(host)).toEqual(["Acme", "Menu"])
    expect(selected(host)).toEqual(["Menu"])
    click(host, "Books")
    await ElementFixture.settle()
    await host.openTo(2)
    await ElementFixture.settle()
    // each column's pick stays
    expect(chain(host)).toEqual(["Books"])
    host.closeAll()
    await ElementFixture.settle()
    expect(chain(host)).toEqual([])
    expect(selected(host)).toEqual([])
    expect(host.path).toEqual([])
  })

  it("in columns from markup, `filter` lists the matches elsewhere in the tree, and a click on one opens its path", async () => {
    const host = await columns()
    host.setAttribute("filter", "loaf")
    await ElementFixture.settle()
    expect(onScreen(host)).toEqual([])
    expect(matches(host.shadowRoot!)).toEqual(["loaf.jpg (Acme › Menu › photos)"])
    expect(host.shadowRoot!.querySelector(".column > .empty")).toBeNull()
    host.shadowRoot!.querySelector<HTMLElement>(".match")!.click()
    await ElementFixture.settle()
    expect(chain(host)).toEqual(["Acme", "Menu", "photos", "loaf.jpg"])
    expect(selected(host)).toEqual(["loaf.jpg"])
    // the filtered column keeps its pick, which the columns after it hang from
    expect(row(host, "Acme").checkVisibility()).toBe(true)
    expect(row(host, "Books").checkVisibility()).toBe(false)
  })

  it("in columns from markup, a filter on a deeper column lists the matches outside it, after its rows, and says when nothing matches", async () => {
    const host = await columns()
    click(host, "Acme")
    await ElementFixture.settle()
    host.setAttribute("filter", "u")
    await ElementFixture.settle()
    // its own rows:  Menu, which holds a u, and not Site
    expect(onScreen(host)).toEqual(["Acme", "Menu", "Books"])
    expect(matches(row(host, "Acme").shadowRoot!)).toEqual(["Catalogue (Books)", "menu.pdf (Acme › Menu)"])
    host.setAttribute("filter", "zzz")
    await ElementFixture.settle()
    expect(matches(row(host, "Acme").shadowRoot!)).toEqual([])
    expect(row(host, "Acme").shadowRoot!.querySelector(".empty")?.textContent).toBe("Nothing matches")
  })

  it("from `items`, `filter` runs the `children` functions to look through the tree, and opens no column", async () => {
    const host = await dataTree('show="icon count chevron"')
    host.filter = "loaf"
    await ElementFixture.settle()
    expect(runs).toEqual({ acme: 1, menu: 1 })
    expect(columnLabels(host)).toEqual([[]])
    expect(matches(host.shadowRoot!)).toEqual(["loaf.jpg (Acme › Menu › photos)"])
    host.shadowRoot!.querySelector<HTMLElement>(".match")!.click()
    await ElementFixture.settle()
    expect(host.path).toEqual(["acme", "menu", "photos", "loaf.jpg"])
    expect(columnLabels(host)[0]).toEqual(["Acme"])
    expect(columnLabels(host).length).toBe(4)
    // a row with no `children` still shows no count, though the look went through it
    const countOf = (id: string) => host.shadowRoot!.querySelector(`.column-row[data-id="${id}"] .count`)?.textContent
    expect(countOf("loaf.jpg")).toBeUndefined()
    expect(countOf("menu")).toBe("2")
    // a second look runs nothing again
    host.filter = "pdf"
    await ElementFixture.settle()
    expect(runs).toEqual({ acme: 1, menu: 1 })
  })

  it("from `items`, a filter on a leaf's column still finds the whole tree's matches;  one nearer the top moves the list along", async () => {
    const host = await dataTree()
    host.path = ["acme", "menu", "menu.pdf"]
    await ElementFixture.settle()
    host.filter = "o"
    await ElementFixture.settle()
    const column = (depth: number) => host.shadowRoot!.querySelector(`ul[data-depth="${depth}"]`)!
    // the last column on screen, menu.pdf's, keeps its pick;  photos and loaf.jpg are elsewhere
    expect(columnLabels(host)[2]).toEqual(["menu.pdf", "photos"])
    expect(matches(column(2))).toEqual(["Books", "Catalogue (Books)", "loaf.jpg (Acme › Menu › photos)"])
    column(2).querySelector<HTMLElement>(".match")!.click()
    await ElementFixture.settle()
    expect(host.path).toEqual(["books"])
    // Books' column, the last on screen now, is the one filtered
    expect(columnLabels(host)[1]).toEqual(["Catalogue"])
    expect(matches(column(1))).toEqual(["Books", "photos (Acme › Menu)", "loaf.jpg (Acme › Menu › photos)"])
  })

  it("from `items`, waits for promised children while it looks, with a spinner", async () => {
    let arrive: (list: TreeItemData[]) => void = () => {}
    const host = await dataTree("", [
      { id: "slow", label: "Slow", children: () => new Promise<TreeItemData[]>((resolve) => (arrive = resolve)) }
    ])
    host.filter = "came"
    await ElementFixture.settle()
    expect(host.shadowRoot!.querySelector(".matches ui-loader")).not.toBeNull()
    expect(host.shadowRoot!.querySelector(".matches-loading")!.textContent).toBe("Looking through the tree")
    expect(host.shadowRoot!.querySelector("ul.column .empty")).toBeNull()
    arrive([{ id: "came", label: "came" }])
    await vi.waitFor(() => expect(matches(host.shadowRoot!)).toEqual(["came (Slow)"]))
    expect(host.shadowRoot!.querySelector(".matches ui-loader")).toBeNull()
  })

  it("from `items`, `openTo()` picks down to that many columns, and `closeAll()` clears the path", async () => {
    const host = await dataTree()
    await host.openTo(4)
    await ElementFixture.settle()
    expect(host.path).toEqual(["acme", "menu", "photos"])
    expect(columnLabels(host).length).toBe(4)
    await host.openTo(2)
    await ElementFixture.settle()
    expect(host.path).toEqual(["acme"])
    host.closeAll()
    await ElementFixture.settle()
    expect(host.path).toEqual([])
  })

  it("from `items`, `openTo()` waits for promised children, then goes on to the depth asked", async () => {
    const arrivals: ((list: TreeItemData[]) => void)[] = []
    const promised = (list: TreeItemData[]) => () =>
      new Promise<TreeItemData[]>((resolve) => arrivals.push(() => resolve(list)))
    const host = await dataTree("", [
      {
        id: "a",
        label: "a",
        children: promised([
          { id: "b", label: "b", children: promised([{ id: "c", label: "c", children: [{ id: "d", label: "d" }] }]) }
        ])
      }
    ])
    const opened = host.openTo(4)
    await vi.waitFor(() => expect(arrivals.length).toBe(1))
    // the path so far, its column a spinner, while the rows come
    expect(host.path).toEqual(["a"])
    expect(host.shadowRoot!.querySelector("ul.column .loading ui-loader")).not.toBeNull()
    arrivals[0]!([])
    await vi.waitFor(() => expect(arrivals.length).toBe(2))
    arrivals[1]!([])
    await opened
    await ElementFixture.settle()
    expect(host.path).toEqual(["a", "b", "c"])
  })

  it("from `items`, a match shows its row's icon, and the filtered column's kept pick is dimmed", async () => {
    const items = folders()
    items[1]!.icon = "book"
    const host = await dataTree('show="icon chevron"', items)
    host.path = ["acme", "menu", "menu.pdf"]
    await ElementFixture.settle()
    host.filter = "book"
    await ElementFixture.settle()
    const match = host.shadowRoot!.querySelector(".match")!
    expect(match.querySelector(".icon ui-icon")?.getAttribute("name")).toBe("book")
    expect(host.shadowRoot!.querySelector('.column-row[data-id="menu.pdf"]')!.classList.contains("unmatched")).toBe(
      true
    )
    host.filter = "menu"
    await ElementFixture.settle()
    expect(host.shadowRoot!.querySelector('.column-row[data-id="menu.pdf"]')!.classList.contains("unmatched")).toBe(
      false
    )
  })

  it("from markup, the filtered column's kept pick is dimmed", async () => {
    const host = await columns()
    for (const label of ["Acme", "Menu", "menu.pdf"]) {
      click(host, label)
      await ElementFixture.settle()
    }
    host.setAttribute("filter", "photo")
    await ElementFixture.settle()
    expect(row(host, "menu.pdf").matches(":state(unmatched)")).toBe(true)
    expect(row(host, "photos").matches(":state(unmatched)")).toBe(false)
    host.removeAttribute("filter")
    await ElementFixture.settle()
    expect(row(host, "menu.pdf").matches(":state(unmatched)")).toBe(false)
  })

  /** What has the focus, inside shadow roots too. */
  function focused(): Element | null {
    let active = document.activeElement
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement
    return active
  }

  /** `key` pressed on what has the focus, inside shadow roots too. */
  async function pressFocused(key: string) {
    focused()!.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, composed: true, cancelable: true }))
    await ElementFixture.settle()
  }

  it("from markup, a page's script can focus a row in a column just opened, or just filtered", async () => {
    const host = await columns()
    click(host, "Acme")
    await ElementFixture.settle()
    // the tree stays one tab stop:  Acme, the pick
    expect(["Acme", "Menu", "Site"].map((label) => row(host, label).getAttribute("tabindex"))).toEqual([
      "0",
      "-1",
      "-1"
    ])
    row(host, "Menu").focus()
    expect(focused()).toBe(row(host, "Menu"))
    // a filter that keeps the tab stop's row keeps it the tab stop
    host.setAttribute("filter", "e")
    await ElementFixture.settle()
    expect(["Menu", "Site"].map((label) => row(host, label).getAttribute("tabindex"))).toEqual(["0", "-1"])
    row(host, "Site").focus()
    expect(focused()).toBe(row(host, "Site"))
    // one that hides it:  the tab stop moves to the row now at its place, Books
    host.setAttribute("filter", "men")
    await ElementFixture.settle()
    expect(["Menu", "Books"].map((label) => row(host, label).getAttribute("tabindex"))).toEqual(["-1", "0"])
    row(host, "Menu").focus()
    expect(focused()).toBe(row(host, "Menu"))
  })

  /** The words of the match elsewhere that has the focus. */
  function focusedMatch(): string | undefined {
    const active = focused()
    return active?.classList.contains("match") ? active.querySelector(".words")!.textContent! : undefined
  }

  it("from markup, the keys go on from the filtered column's last row into the matches elsewhere, and back;  Enter opens one's path", async () => {
    const host = await columns()
    click(host, "Acme")
    await ElementFixture.settle()
    host.setAttribute("filter", "u")
    await ElementFixture.settle()
    expect(matches(row(host, "Acme").shadowRoot!)).toEqual(["Catalogue (Books)", "menu.pdf (Acme › Menu)"])
    const boxes = [...row(host, "Acme").shadowRoot!.querySelectorAll(".match")]
    // a screen reader hears each with its path;  the tree stays one tab stop
    expect(boxes.map((box) => box.getAttribute("aria-label"))).toEqual([
      "Catalogue, in Books",
      "menu.pdf, in Acme › Menu"
    ])
    expect(boxes.map((box) => box.getAttribute("tabindex"))).toEqual(["-1", "-1"])
    // the right key goes into Acme's column, onto Menu, its only row, and picks it
    await pressFocused("ArrowRight")
    expect(focused()).toBe(row(host, "Menu"))
    await pressFocused("ArrowDown")
    expect(focusedMatch()).toBe("Catalogue")
    // moving onto a match picks nothing
    expect(selected(host)).toEqual(["Menu"])
    await pressFocused("ArrowDown")
    expect(focusedMatch()).toBe("menu.pdf")
    await pressFocused("ArrowDown")
    expect(focusedMatch()).toBe("menu.pdf")
    await pressFocused("Home")
    expect(focusedMatch()).toBe("Catalogue")
    // up from the first match:  back to the last row, still the pick
    await pressFocused("ArrowUp")
    expect(focused()).toBe(row(host, "Menu"))
    expect(selected(host)).toEqual(["Menu"])
    await pressFocused("ArrowDown")
    await pressFocused("Enter")
    expect(chain(host)).toEqual(["Books", "Catalogue"])
    expect(selected(host)).toEqual(["Catalogue"])
    expect(focused()).toBe(row(host, "Catalogue"))
  })

  it("from `items`, the keys go on from the filtered column's last row into the matches elsewhere, and back;  Enter opens one's path", async () => {
    const host = await dataTree()
    host.path = ["acme"]
    await ElementFixture.settle()
    host.filter = "e"
    await ElementFixture.settle()
    const column = host.shadowRoot!.querySelector('ul[data-depth="1"]')!
    expect(matches(column).slice(0, 2)).toEqual(["Acme", "Catalogue (Books)"])
    expect(column.querySelector('.match[data-match="1"]')!.getAttribute("aria-label")).toBe("Catalogue, in Books")
    column.querySelector<HTMLElement>('.column-row[data-id="site"]')!.focus()
    await pressFocused("ArrowDown")
    expect(focusedMatch()).toBe("Acme")
    expect(host.path).toEqual(["acme"])
    // up from the first match:  back to the last row, picked
    await pressFocused("ArrowUp")
    expect(host.path).toEqual(["acme", "site"])
    expect(focused()?.getAttribute("data-id")).toBe("site")
    await pressFocused("ArrowDown")
    await pressFocused("ArrowDown")
    expect(focusedMatch()).toBe("Catalogue")
    await pressFocused(" ")
    expect(host.path).toEqual(["books", "catalogue"])
    expect(focused()?.getAttribute("data-id")).toBe("catalogue")
  })

  it("from `items`, looks through a tree the netlist sample's size fast, listing the first 200", async () => {
    // about the sample's shape:  7,800 nodes 4 levels deep (12 x 10 x 8 x 8), 5 ports on each of the deepest
    let nodes = 0
    const level = (path: string, depth: number): TreeItemData[] => {
      const count = [12, 10, 8, 8][depth]!
      return Array.from({ length: count }, (_, index) => {
        nodes++
        const id = `${path}${index}`
        const ports = () => Array.from({ length: 5 }, (_, port) => ({ id: `${id}:p${port}`, label: `port ${port}` }))
        return { id, label: `node ${id}`, children: depth < 3 ? () => level(`${id}.`, depth + 1) : ports }
      })
    }
    const items = level("n", 0)
    const host = await dataTree("", items)
    const started = performance.now()
    host.filter = "port 3"
    await ElementFixture.settle()
    const took = performance.now() - started
    expect(nodes).toBe(12 + 120 + 960 + 7680)
    expect(host.shadowRoot!.querySelectorAll(".match").length).toBe(200)
    expect(host.shadowRoot!.querySelector(".matches-note")?.textContent).toBe("7480 more, not listed")
    expect(took).toBeLessThan(500)
  })

  it("a column that turns narrow as a later one is picked doesn't stay drawn whole once the pointer leaves", async () => {
    const books: TreeItemData[] = [
      {
        id: "novels",
        label: "Novels",
        children: [
          {
            id: "middlemarch",
            label: "Middlemarch",
            children: [
              { id: "brooke", label: "Miss Brooke" },
              { id: "old", label: "Old and Young" }
            ]
          }
        ]
      },
      { id: "poems", label: "Poems", children: [{ id: "odes", label: "Odes" }] }
    ]
    const host = await dataTree('narrow-before="1"', books)
    host.style.width = "420px"
    await nextPaint()
    for (const id of ["novels", "middlemarch", "brooke"]) {
      await userEvent.click(host.shadowRoot!.querySelector<HTMLElement>(`.column-row[data-id="${id}"]`)!)
      await nextPaint()
    }
    const peeking = () => [...host.shadowRoot!.querySelectorAll(".column.peek")].length
    const narrow = () => [...host.shadowRoot!.querySelectorAll(".column.narrow")].length
    expect(narrow()).toBeGreaterThan(0)
    await userEvent.unhover(host)
    host.dispatchEvent(new PointerEvent("pointerleave"))
    await nextPaint()
    expect(peeking()).toBe(0)
  })
})

describe('<ui-tree appearance="columns"> from `items`, a big column', () => {
  type TreeHost = HTMLElement & {
    items?: TreeItemData[]
    path?: string[]
    filter?: string
    openTo(levels: number): Promise<void>
  }

  /** Rows per big column. */
  const COUNT = 5_000

  /** The last row's label, in `bigColumn({ isLongLast })`:  far longer than the rest. */
  const LONG_LABEL = "The very last row, with a far longer label than every other"

  /**
   * A column of `COUNT` rows;  the last one holds two more.
   * - `which`:  each row's which, `w` and `www` in turn;  `isLongLast`:  the last row's label is `LONG_LABEL`.
   */
  function bigColumn({ which = false, isLongLast = false } = {}): TreeItemData[] {
    return Array.from({ length: COUNT }, (_, index) => ({
      id: `row-${index}`,
      label: isLongLast && index === COUNT - 1 ? LONG_LABEL : `Row ${index}`,
      ...(which && { which: index % 2 ? "www" : "w" }),
      ...(index === COUNT - 1 && {
        children: [
          { id: "inner-a", label: "Inner A" },
          { id: "inner-b", label: "Inner B" }
        ]
      })
    }))
  }

  async function bigTree(attributes = "", items = bigColumn()): Promise<TreeHost> {
    const host = (await ElementFixture.render(
      `<ui-tree appearance="columns" ${attributes} label="Big" style="height: 300px; width: 700px"></ui-tree>`
    )) as TreeHost
    host.items = items
    await ElementFixture.settle()
    return host
  }

  const rowsIn = (host: Element, depth = 0) =>
    host.shadowRoot!.querySelectorAll(`ul[data-depth="${depth}"] .column-row`).length
  const dataRow = (host: Element, id: string) =>
    host.shadowRoot!.querySelector<HTMLElement>(`.column-row[data-id="${CSS.escape(id)}"]`)
  const press = async (host: Element, key: string) => {
    const target = host.shadowRoot!.activeElement as HTMLElement
    target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, composed: true, cancelable: true }))
    await ElementFixture.settle()
  }

  it("draws its first rows, then the rows near the view as it scrolls;  the far ones are taken down", async () => {
    const host = await bigTree()
    await nextPaint()
    const first = rowsIn(host)
    expect(first).toBeGreaterThan(0)
    expect(first).toBeLessThan(200)
    const column = host.shadowRoot!.querySelector<HTMLElement>('ul[data-depth="0"]')!
    for (let at = 0; at < 10; at++) {
      column.scrollTop = column.scrollHeight
      await nextPaint()
    }
    await expect.poll(() => dataRow(host, `row-${COUNT - 1}`)).not.toBeNull()
    expect(dataRow(host, "row-100")).toBeNull()
    // the row with the tab stop stays drawn, wherever the view is
    expect(dataRow(host, "row-0")).not.toBeNull()
    expect(rowsIn(host)).toBeLessThan(200)
    column.scrollTop = 0
    await expect.poll(() => dataRow(host, "row-30")).not.toBeNull()
    expect(dataRow(host, `row-${COUNT - 1}`)).toBeNull()
    expect(rowsIn(host)).toBeLessThan(200)
  })

  it("each row says its place in the whole column, drawn or not", async () => {
    const host = await bigTree()
    await nextPaint()
    const row = dataRow(host, "row-2")!
    expect(row.getAttribute("aria-posinset")).toBe("3")
    expect(row.getAttribute("aria-setsize")).toBe(String(COUNT))
  })

  it("Home from the end goes to a row taken down, drawing it first, and focuses it;  the focused row stays drawn", async () => {
    const host = await bigTree()
    await nextPaint()
    const column = host.shadowRoot!.querySelector<HTMLElement>('ul[data-depth="0"]')!
    dataRow(host, "row-0")!.focus()
    await press(host, "End")
    await nextPaint()
    await nextPaint()
    expect(host.shadowRoot!.activeElement).toBe(dataRow(host, `row-${COUNT - 1}`))
    // far from the focused row, scrolled away and back:  it's still there, still focused
    column.scrollTop = 0
    await nextPaint()
    await nextPaint()
    expect(dataRow(host, `row-${COUNT - 1}`)).not.toBeNull()
    expect(host.shadowRoot!.activeElement).toBe(dataRow(host, `row-${COUNT - 1}`))
    column.scrollTop = column.scrollHeight
    await nextPaint()
    await nextPaint()
    for (let at = 0; at < 4; at++) await nextPaint()
    expect(dataRow(host, "row-0")).toBeNull()
    await press(host, "Home")
    expect(host.path).toEqual(["row-0"])
    expect(host.shadowRoot!.activeElement).toBe(dataRow(host, "row-0"))
  })

  it("End goes to the last row, drawing down to it first, and focuses it;  right goes in", async () => {
    const host = await bigTree()
    dataRow(host, "row-0")!.focus()
    await press(host, "End")
    expect(host.path).toEqual([`row-${COUNT - 1}`])
    expect(host.shadowRoot!.activeElement).toBe(dataRow(host, `row-${COUNT - 1}`))
    await press(host, "ArrowRight")
    expect(host.path).toEqual([`row-${COUNT - 1}`, "inner-a"])
    await press(host, "ArrowLeft")
    await press(host, "Home")
    expect(host.path).toEqual(["row-0"])
  })

  it("a `path` set to a row far down draws down to it, and marks it", async () => {
    const host = await bigTree()
    host.path = ["row-3000"]
    await ElementFixture.settle()
    expect(dataRow(host, "row-3000")?.classList).toContain("selected")
    expect(rowsIn(host)).toBeLessThan(COUNT)
  })

  it("`openTo()` reaches a row far down, and the filter finds rows not drawn yet", async () => {
    const host = await bigTree()
    await host.openTo(1)
    host.filter = "Row 4321"
    await ElementFixture.settle()
    expect(dataRow(host, "row-4321")).not.toBeNull()
    host.filter = ""
    await ElementFixture.settle()
    host.path = [`row-${COUNT - 1}`, "inner-b"]
    await ElementFixture.settle()
    expect(dataRow(host, "inner-b")?.classList).toContain("selected")
  })

  it("each row's `which` stays put as more rows draw in:  its track is as wide as the data's widest label", async () => {
    const host = await bigTree("", bigColumn({ which: true }))
    await nextPaint()
    const column = host.shadowRoot!.querySelector<HTMLElement>('ul[data-depth="0"]')!
    const whichLeft = () => dataRow(host, "row-0")!.querySelector(".which")!.getBoundingClientRect().left
    const before = whichLeft()
    const first = rowsIn(host)
    // the words track is set from the data:  "Row 4999" is wider than "Row 9", the widest drawn so far
    expect(column.style.getPropertyValue("--_tree-words-track")).toMatch(/px$/)
    for (let at = 0; at < 10; at++) {
      column.scrollTop = column.scrollHeight
      await nextPaint()
    }
    await expect.poll(() => dataRow(host, `row-${COUNT - 1}`)).not.toBeNull()
    expect(first).toBeGreaterThan(0)
    column.scrollTop = 0
    await expect.poll(() => dataRow(host, "row-0")).not.toBeNull()
    expect(whichLeft()).toBe(before)
  })

  it('`size="auto"` sizes it from the data, not the rows drawn;  `sticky-path` names its pick', async () => {
    const host = await bigTree('size="auto" sticky-path', bigColumn({ isLongLast: true }))
    await nextPaint()
    await nextPaint()
    const column = host.shadowRoot!.querySelector<HTMLElement>('ul[data-depth="0"]')!
    // the long row isn't drawn, yet the column is wide enough for it
    expect(dataRow(host, `row-${COUNT - 1}`)).toBeNull()
    const words = dataRow(host, "row-0")!.querySelector(".words")!
    const canvas = document.createElement("canvas").getContext("2d")!
    canvas.font = getComputedStyle(words).font
    const width = column.getBoundingClientRect().width
    expect(width).toBeGreaterThan(canvas.measureText(LONG_LABEL).width)

    // End draws down to the long row:  it shows whole, and the column keeps its width
    dataRow(host, "row-0")!.focus()
    await press(host, "End")
    await nextPaint()
    const long = dataRow(host, `row-${COUNT - 1}`)!
      .querySelector(".words")!
      .getBoundingClientRect()
    expect(long.right).toBeLessThanOrEqual(column.getBoundingClientRect().right)
    expect(column.getBoundingClientRect().width).toBe(width)

    // the path line names the picks;  a click on the first picks it again, keeping the column after it
    await press(host, "ArrowRight")
    await nextPaint()
    expect(pathWords(host)).toEqual([LONG_LABEL, "Inner A"])
    await clickPath(host, 0)
    expect(host.path).toEqual([`row-${COUNT - 1}`, "inner-a"])
    expect(dataRow(host, `row-${COUNT - 1}`)?.classList).toContain("selected")
  })
})
