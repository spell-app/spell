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
