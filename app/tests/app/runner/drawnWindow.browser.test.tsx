import { afterEach, describe, expect, test } from "vite-plus/test"
import { createSignal, flush } from "solid-js"
import { render } from "@solidjs/web"

import "spell/app/app/solid/cellsBridge"
import { MOST_AT_ONCE, drawnInWindow } from "spell/parser/core/drawnWindow"
import { isGoingToTheTop, uiMethods } from "spell/parser/core/ui"

/**
 * A long list draws what fits, and more as you scroll (epic `data` T76):  in a real browser, as it takes its layout to tell.
 * - Rows 20 px high, in a box 200 px high that scrolls.
 */

let box: HTMLElement
let dispose: (() => void) | undefined

afterEach(() => {
  dispose?.()
  box?.remove()
})

/** These rows, drawn in a window, in a box of their own, or the one that's there:  as going back draws again in the same place. */
function drawn(
  rows: readonly number[],
  { key, more }: { key?: () => object; more?: Parameters<typeof drawnInWindow>[0]["more"] } = {}
) {
  if (!box?.isConnected) {
    box = document.createElement("div")
    box.style.cssText = "height: 200px; overflow: auto"
    document.body.append(box)
  }
  dispose = render(
    () =>
      drawnInWindow({
        items: () => rows,
        drawItem: (row) => {
          const element = document.createElement("div")
          element.className = "row"
          element.style.height = "20px"
          element.textContent = `${row as number}`
          return element
        },
        ...(key && { key }),
        ...(more && { more })
      }),
    box
  )
  flush()
}

const rowsDrawn = () => box.querySelectorAll(".row").length
const rowsOf = (count: number) => Array.from({ length: count }, (_, index) => index + 1)
const nextFrames = async (count = 4) => {
  for (let at = 0; at < count; at++) await new Promise(requestAnimationFrame)
}

describe("a long list draws what fits", () => {
  test("a short one is all of it, with nothing added", () => {
    drawn(rowsOf(MOST_AT_ONCE))
    expect(rowsDrawn()).toBe(MOST_AT_ONCE)
    expect(box.querySelector("spell-more-below")).toBeNull()
  })

  test("a long one draws a little, then more as you scroll, and nothing's left behind at its end", async () => {
    drawn(rowsOf(500))
    expect(rowsDrawn()).toBe(MOST_AT_ONCE)
    expect(box.querySelector("spell-more-below")).not.toBeNull()
    await expect.poll(rowsDrawn).toBeGreaterThan(MOST_AT_ONCE)
    await nextFrames(10)
    const settled = rowsDrawn()
    // what's near the view, and no further
    expect(settled).toBeLessThan(200)
    for (let at = 0; at < 40 && rowsDrawn() < 500; at++) {
      box.scrollTop = box.scrollHeight
      await nextFrames()
    }
    expect(rowsDrawn()).toBe(500)
    expect(box.querySelector("spell-more-below")).toBeNull()
  })

  test("Find draws the rest first:  a browser can only find what's there", () => {
    drawn(rowsOf(300))
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "f", metaKey: true }))
    flush()
    expect(rowsDrawn()).toBe(300)
  })

  test("printing does too", () => {
    drawn(rowsOf(300))
    window.dispatchEvent(new Event("beforeprint"))
    flush()
    expect(rowsDrawn()).toBe(300)
  })

  test("a place's next page is read when what's in hand has been drawn", async () => {
    const [rows, setRows] = createSignal(rowsOf(10))
    let read = 0
    const pages = {
      get hasMorePages() {
        return read < 2
      },
      readNextPage: async () => {
        read++
        setRows([...rows(), ...rowsOf(10)])
        flush()
      }
    }
    box = document.createElement("div")
    box.style.cssText = "height: 200px; overflow: auto"
    document.body.append(box)
    dispose = render(
      () =>
        drawnInWindow({
          items: rows,
          drawItem: (row) => {
            const element = document.createElement("div")
            element.className = "row"
            element.style.height = "5px"
            element.textContent = `${row}`
            return element
          },
          more: () => pages
        }),
      box
    )
    flush()
    expect(rowsDrawn()).toBe(10)
    await expect.poll(() => read).toBe(2)
    await expect.poll(rowsDrawn).toBe(30)
    expect(box.querySelector("spell-more-below")).toBeNull()
  })

  test("going back to the same list:  as many drawn, and scrolled where it was", async () => {
    const list = {}
    const key = () => list
    drawn(rowsOf(500), { key })
    await expect.poll(rowsDrawn).toBeGreaterThan(MOST_AT_ONCE)
    await nextFrames()
    box.scrollTop = box.scrollHeight
    await nextFrames(6)
    const scrolled = box.scrollTop
    const count = rowsDrawn()
    expect(scrolled).toBeGreaterThan(0)
    dispose!()
    box.scrollTop = 0
    drawn(rowsOf(500), { key })
    expect(rowsDrawn()).toBeGreaterThanOrEqual(count)
    await expect.poll(() => box.scrollTop).toBe(scrolled)
  })

  test("`scroll to the top` says so, until the current task's done", async () => {
    expect(isGoingToTheTop()).toBe(false)
    uiMethods.scrollToTop()
    expect(isGoingToTheTop()).toBe(true)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(isGoingToTheTop()).toBe(false)
  })
})
