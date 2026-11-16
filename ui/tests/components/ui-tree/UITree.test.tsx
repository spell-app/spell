import { describe, expect, it, vi } from "vite-plus/test"

import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { UITree, UITreeItem } from "spell/ui/components/ui-tree"

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
})
