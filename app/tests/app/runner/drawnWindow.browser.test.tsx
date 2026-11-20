import { afterEach, describe, expect, test } from "vite-plus/test"
import { flush } from "solid-js"
import { render } from "@solidjs/web"

import "spell/app/app/solid/cellsBridge"
import { MOST_AT_ONCE, drawnInWindow } from "spell/element/drawnWindow"
import { SPELL_WINDOW, isGoingToTheTop, uiMethods } from "spell/parser/core/ui"

/**
 * A long list in a Spell drawing:  `drawnInWindow()` (`spell/element`'s, its own tests in the kit's `tests/element/`)
 * on what Spell's core hands it, `SPELL_WINDOW`.
 * - Rows 20 px high, in a box 200 px high that scrolls;  the cells bridge on, as in every Spell host.
 */

let box: HTMLElement | undefined
let dispose: (() => void) | undefined

afterEach(() => {
  dispose?.()
  box?.remove()
})

const rowsDrawn = () => box!.querySelectorAll(".row").length

describe("a long list in a Spell drawing", () => {
  test("draws more as you scroll, said through a spell cell", async () => {
    box = document.createElement("div")
    box.style.cssText = "height: 200px; overflow: auto"
    document.body.append(box)
    const rows = Array.from({ length: 500 }, (_, index) => index + 1)
    dispose = render(
      () =>
        drawnInWindow({
          items: () => rows,
          drawItem: (row) => {
            const element = document.createElement("div")
            element.className = "row"
            element.style.height = "20px"
            element.textContent = `${row}`
            return element
          },
          ...SPELL_WINDOW
        }),
      box
    )
    flush()
    expect(rowsDrawn()).toBe(MOST_AT_ONCE)
    await expect.poll(rowsDrawn).toBeGreaterThan(MOST_AT_ONCE)
  })

  test("`scroll to the top` says so, until the current task's done", async () => {
    expect(isGoingToTheTop()).toBe(false)
    uiMethods.scrollToTop()
    expect(isGoingToTheTop()).toBe(true)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(isGoingToTheTop()).toBe(false)
  })
})
