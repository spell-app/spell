/**
 * Tests of `ItemFold`:  an item folded away as Owen's ✓ or x closes it, and back (epic `epic-engine` I306).
 */
import { afterEach, describe, expect, test } from "vite-plus/test"

import { FOLD_MS, ItemFold } from "spell/epic/components/epic-section/ItemFold"

const HIDDEN = "data-epic-filtered"

/** An item 40px tall, on the page. */
function itemOnPage(id = "i57"): HTMLElement {
  const item = document.createElement("div")
  item.id = id
  item.style.height = "40px"
  document.body.append(item)
  return item
}

afterEach(() => document.body.replaceChildren())

describe("ItemFold", () => {
  test("fold():  animated first, hidden once it ends", async () => {
    const fold = new ItemFold()
    const item = itemOnPage()
    fold.fold(item, HIDDEN)
    expect(fold.isFolding(item)).toBe(true)
    expect(item.hasAttribute(HIDDEN)).toBe(false)
    await new Promise((resolve) => setTimeout(resolve, FOLD_MS + 100))
    expect(fold.isFolding(item)).toBe(false)
    expect(item.hasAttribute(HIDDEN)).toBe(true)
    expect(item.getAnimations()).toHaveLength(0)
  })

  test("show() mid-fold:  stopped, never hidden;  a fold folded once hides at once the next time", async () => {
    const fold = new ItemFold()
    const item = itemOnPage()
    fold.fold(item, HIDDEN)
    fold.show(item, HIDDEN)
    expect(fold.isFolding(item)).toBe(false)
    await new Promise((resolve) => setTimeout(resolve, FOLD_MS + 100))
    expect(item.hasAttribute(HIDDEN)).toBe(false)
  })

  test("show() after a fold hid it:  unhidden, unfolding into place", async () => {
    const fold = new ItemFold()
    const item = itemOnPage()
    fold.fold(item, HIDDEN)
    await new Promise((resolve) => setTimeout(resolve, FOLD_MS + 100))
    fold.show(item, HIDDEN)
    expect(item.hasAttribute(HIDDEN)).toBe(false)
    expect(item.getAnimations()).toHaveLength(1)
  })

  test("an item never folded:  show() only unhides it, no animation", () => {
    const fold = new ItemFold()
    const item = itemOnPage()
    item.setAttribute(HIDDEN, "")
    fold.show(item, HIDDEN)
    expect(item.hasAttribute(HIDDEN)).toBe(false)
    expect(item.getAnimations()).toHaveLength(0)
  })
})
