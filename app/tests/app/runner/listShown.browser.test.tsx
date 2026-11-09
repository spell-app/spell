import { afterEach, describe, expect, test } from "vite-plus/test"
import { flush } from "solid-js"
import { render } from "@solidjs/web"
import h from "@solidjs/h"

import "spell/app/app/solid/cellsBridge"
import { core, List, Thing } from "spell/parser/core"

/**
 * A list written in braces in a drawing, `{its author name}` (epic `data` I57):  in a real browser, as it's Solid's insert that failed.
 * - Written as the compiler writes it:  `h("ui-meta", () => core.listShown(this.authorName))`.
 */

let box: HTMLElement
let dispose: (() => void) | undefined

afterEach(() => {
  dispose?.()
  box?.remove()
})

/** `value`, drawn in braces inside a `<meta>`. */
function drawn(value: () => unknown) {
  box = document.createElement("div")
  document.body.append(box)
  dispose = render(
    () =>
      h(
        "meta",
        () => core.listShown(value()),
        " · ",
        () => 1965
      ) as never,
    box
  )
  flush()
}

/** A spell `List` of `items`. */
function listOf(...items: unknown[]) {
  const list = new List()
  items.forEach((item) => list.add(item))
  return list
}

/** A thing that draws itself as its `name` in a `<b>`. */
class Card extends Thing {
  draw() {
    return h("b", () => (this as unknown as { name: string }).name) as never
  }
}

describe("a list in braces", () => {
  test("of text:  the words, with commas, and what's after it still draws", () => {
    drawn(() => listOf("Ann Author", "Bob Writer"))
    expect(box.textContent).toBe("Ann Author, Bob Writer · 1965")
  })

  test("of numbers", () => {
    drawn(() => listOf(1, 2, 3))
    expect(box.textContent).toBe("1, 2, 3 · 1965")
  })

  test("follows its items", () => {
    const list = listOf("Ann")
    drawn(() => list)
    list.add("Bob")
    flush()
    expect(box.textContent).toBe("Ann, Bob · 1965")
  })

  test("empty, or nothing yet:  nothing, and no failure", () => {
    drawn(() => listOf())
    expect(box.textContent).toBe(" · 1965")
    dispose?.()
    box.remove()
    drawn(() => undefined)
    expect(box.textContent).toBe(" · 1965")
  })

  test("of things that draw:  each one draws", () => {
    drawn(() => listOf(new Card({ name: "Ace" } as never), new Card({ name: "King" } as never)))
    expect([...box.querySelectorAll("b")].map((card) => card.textContent)).toEqual(["Ace", "King"])
  })

  test("a plain array of text:  the same words", () => {
    drawn(() => ["Ann", "Bob"])
    expect(box.textContent).toBe("Ann, Bob · 1965")
  })
})
