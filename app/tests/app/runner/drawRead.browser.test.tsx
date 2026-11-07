import { afterEach, describe, expect, test } from "vite-plus/test"
import { flush } from "solid-js"
import { render } from "@solidjs/web"
import h from "@solidjs/h"

import "spell/app/app/solid/cellsBridge"
import { core } from "spell/parser/core"
import { MOST_AT_ONCE } from "spell/parser/core/drawnWindow"

/**
 * What a `<for>` draws, `core.drawRead()` with what its attributes say (epic `data` P22):  in a real browser.
 * - Each test draws a plain list of numbers, so nothing waits:  a place's waiting is the read tests'.
 */

let box: HTMLElement
let dispose: (() => void) | undefined

afterEach(() => {
  dispose?.()
  box?.remove()
})

/** `rows`, drawn as `core.drawRead()` draws them with `riders`. */
function drawn(rows: readonly number[], riders: Record<string, () => unknown> = {}, cell = false) {
  box = document.createElement("div")
  document.body.append(box)
  const drawItem = (row: number) =>
    cell ? h("ui-cell", { "data-column": "Number" }, `${row}`) : h("div", { class: "row" }, `${row}`)
  dispose = render(() => core.drawRead(() => rows, drawItem as never, riders as never) as never, box)
  flush()
}

const rowsOf = (count: number) => Array.from({ length: count }, (_, index) => index + 1)
const texts = (selector: string) => [...box.querySelectorAll(selector)].map((element) => element.textContent)

describe("<for>'s attributes, as core.drawRead() draws them", () => {
  test("as=: the items in what's around them;  the title around everything", () => {
    drawn(rowsOf(3), { items: () => h("ui-cards", { columns: "4" }), whole: () => h("ui-section", { label: "Films" }) })
    const section = box.querySelector("ui-section")!
    const cards = section.querySelector("ui-cards")!
    expect(cards.getAttribute("columns")).toBe("4")
    expect([...cards.querySelectorAll(".row")].map((row) => row.textContent)).toEqual(["1", "2", "3"])
  })

  test("paging=pages:  a page at a time, with Previous and Next", async () => {
    drawn(rowsOf(MOST_AT_ONCE + 5), { paging: () => "pages" })
    expect(texts(".row")).toHaveLength(MOST_AT_ONCE)
    expect(texts("ui-text")).toEqual(["Page 1"])
    const [previous, next] = box.querySelectorAll("ui-button")
    expect(previous!.hasAttribute("disabled")).toBe(true)
    ;(next as HTMLElement).click()
    await new Promise((resolve) => setTimeout(resolve))
    flush()
    expect(texts(".row")).toEqual(rowsOf(5).map((row) => `${MOST_AT_ONCE + row}`))
    expect(texts("ui-text")).toEqual(["Page 2"])
  })

  test("paging=pages, as=cards or a table:  the pager comes after them, never one more card or row", () => {
    const arounds = { cards: () => h("ui-cards", { columns: "4" }), table: () => h("ui-table", {}, h("ui-row")) }
    for (const [kind, items] of Object.entries(arounds)) {
      drawn(rowsOf(MOST_AT_ONCE + 5), { paging: () => "pages", items }, kind === "table")
      const around = box.querySelector("ui-cards, ui-table")!
      expect(around.querySelector("ui-button")).toBeNull()
      expect(around.nextElementSibling?.localName).toBe("ui-stack")
      expect(around.nextElementSibling!.querySelectorAll("ui-button")).toHaveLength(2)
      dispose?.()
      box.remove()
    }
  })

  test("paging=none:  every item at once", () => {
    drawn(rowsOf(MOST_AT_ONCE * 3), { paging: () => "all" })
    expect(texts(".row")).toHaveLength(MOST_AT_ONCE * 3)
  })

  test("as=table:  a row each, and a header from what the cells are named", () => {
    drawn(rowsOf(2), { items: () => h("ui-table", {}, h("ui-row")) }, true)
    const rows = [...box.querySelectorAll("ui-table > ui-row")]
    expect(rows.map((row) => row.hasAttribute("header"))).toEqual([true, false, false])
    expect(rows.map((row) => row.textContent)).toEqual(["Number", "1", "2"])
  })

  test("empty:  what it says;  with nothing said, nothing", () => {
    drawn([], { none: () => h("ui-text", "Nothing found") })
    expect(texts("ui-text")).toEqual(["Nothing found"])
    dispose?.()
    box.remove()
    drawn([])
    expect(box.textContent).toBe("")
  })
})
