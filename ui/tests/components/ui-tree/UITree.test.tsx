import { describe, expect, it, vi } from "vite-plus/test"

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

  it("the line after a column resizes it:  a drag, the arrow keys, a double-click to put it back", async () => {
    const host = await columns()
    click(host, "Acme")
    await ElementFixture.settle()
    const start = columnBox(host, 0).getBoundingClientRect().width
    const line = edge(host, 0)
    const box = line.getBoundingClientRect()
    const at = { clientX: box.left + 3, clientY: box.top + 20, pointerId: 1, button: 0, bubbles: true, composed: true }
    line.dispatchEvent(new PointerEvent("pointerdown", at))
    window.dispatchEvent(new PointerEvent("pointermove", { ...at, clientX: at.clientX + 60 }))
    window.dispatchEvent(new PointerEvent("pointerup", { ...at, clientX: at.clientX + 60 }))
    await ElementFixture.settle()
    expect(Math.round(columnBox(host, 0).getBoundingClientRect().width)).toBe(Math.round(start + 60))
    // the next column moved with it
    expect(leftOf(host, "Menu") - leftOf(host, "Acme")).toBe(Math.round(start + 60))
    line.focus()
    line.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, composed: true }))
    await ElementFixture.settle()
    expect(Math.round(columnBox(host, 0).getBoundingClientRect().width)).toBe(Math.round(start + 44))
    line.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, composed: true }))
    await ElementFixture.settle()
    expect(Math.round(columnBox(host, 0).getBoundingClientRect().width)).toBe(Math.round(start))
  })

  it("remembers the widths under its `id`, by level;  a tree without one doesn't keep them", async () => {
    localStorage.removeItem("ui-tree-column-widths:work")
    const host = await columns('id="work"')
    edge(host, 0).dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, composed: true }))
    await ElementFixture.settle()
    expect(JSON.parse(localStorage.getItem("ui-tree-column-widths:work")!)).toEqual([expect.any(Number)])
    const width = columnBox(host, 0).getBoundingClientRect().width
    const again = await columns('id="work"')
    expect(columnBox(again, 0).getBoundingClientRect().width).toBe(width)
    localStorage.removeItem("ui-tree-column-widths:work")

    const keys = Object.keys(localStorage).length
    const plain = await columns()
    edge(plain, 0).dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, composed: true }))
    await ElementFixture.settle()
    expect(Object.keys(localStorage).length).toBe(keys)
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
    // the columns after a narrow one move along
    expect(leftOf(host, "menu.pdf")).toBeLessThan(2 * 224)
  })

  it("narrows nothing while the columns fit, and never the last `narrow-before`", async () => {
    expect(narrowColumns(await deepColumns("", 900))).toEqual([])
    expect(narrowColumns(await deepColumns('narrow-before="3"'))).toEqual([0])
  })

  it("widens a narrow column under the pointer, and narrows it again once the pointer leaves", async () => {
    const host = await deepColumns()
    await pointAt(row(host, "Acme"))
    expect(narrowColumns(host)).toEqual([1])
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

  it("shows no path line without `sticky-path`, nor before anything is picked", async () => {
    expect(pathWords(await deepColumns())).toEqual([])
    expect(pathWords(await columns("sticky-path"))).toEqual([])
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
