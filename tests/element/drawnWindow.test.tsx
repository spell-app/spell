import { afterEach, describe, expect, test } from "vite-plus/test"
import { createSignal, flush } from "solid-js"
import { render } from "@solidjs/web"

import {
  MOST_AT_ONCE,
  WAIT_WHEN_NOTHING_MOVED_MS,
  drawnInWindow,
  rowAt,
  type DrawnWindow
} from "spell/element/drawnWindow"

/**
 * A long list draws what fits, and more as you scroll (epic `data` T76):  in a real browser, as it takes its layout to tell.
 * - Rows 20 px high, in a box 200 px high that scrolls.
 * - On its own way of saying the count changed, a Solid signal:  no cells bridge on this page.
 *   Spell's, a spell cell, is the app's `drawnWindow.browser.test.tsx`.
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
  {
    height = 20,
    ...settings
  }: Partial<Pick<DrawnWindow<number>, "key" | "more" | "through" | "isGoingToTheTop">> & { height?: number } = {}
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
          element.style.height = `${height}px`
          element.textContent = `${row as number}`
          return element
        },
        ...settings
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

  test("rows that take no room (reading, or drawing nothing) draw more a moment later, not all at once (epic `mockup` T42)", async () => {
    drawn(rowsOf(500), { height: 0 })
    await expect.poll(rowsDrawn).toBe(MOST_AT_ONCE * 2)
    await nextFrames(10)
    // the end never moved:  it waits, so the Met's artworks aren't all read at once
    expect(rowsDrawn()).toBe(MOST_AT_ONCE * 2)
    await new Promise((done) => setTimeout(done, WAIT_WHEN_NOTHING_MOVED_MS + 200))
    await nextFrames()
    expect(rowsDrawn()).toBe(MOST_AT_ONCE * 3)
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

  test("an item that must be drawn is drawn at once, with everything before it", () => {
    const [through, setThrough] = createSignal(-1)
    drawn(rowsOf(500), { through })
    expect(rowsDrawn()).toBe(MOST_AT_ONCE)
    setThrough(100)
    flush()
    // whole lots:  up to the end of the lot it's in
    expect(rowsDrawn()).toBe(Math.ceil(101 / MOST_AT_ONCE) * MOST_AT_ONCE)
    setThrough(499)
    flush()
    expect(rowsDrawn()).toBe(500)
    expect(box.querySelector("spell-more-below")).toBeNull()
  })

  test("going back to a list while the page goes to its top:  as many drawn, but left at the top", async () => {
    const list = {}
    const key = () => list
    drawn(rowsOf(500), { key })
    await expect.poll(rowsDrawn).toBeGreaterThan(MOST_AT_ONCE)
    await nextFrames()
    box.scrollTop = box.scrollHeight
    await nextFrames(6)
    const count = rowsDrawn()
    dispose!()
    box.scrollTop = 0
    drawn(rowsOf(500), { key, isGoingToTheTop: () => true })
    expect(rowsDrawn()).toBeGreaterThanOrEqual(count)
    await nextFrames(6)
    expect(box.scrollTop).toBe(0)
  })
})

describe("a row's position (`rowAt()`, epic `old-console-redo` I45)", () => {
  /** `rows` drawn by `drawnInWindow()`, each row its item and, when it takes one, its position:  `b@1`. */
  function drawnAt(rows: () => readonly string[], takesPosition: boolean, reads = { count: 0 }) {
    box = document.createElement("div")
    document.body.append(box)
    dispose = render(
      () =>
        drawnInWindow({
          items: rows,
          drawItem: (row, position) =>
            rowAt(
              () => (reads.count++, position()),
              takesPosition,
              (at) => {
                const element = document.createElement("div")
                element.className = "row"
                element.textContent = takesPosition ? `${row}@${at}` : row
                return element
              }
            )
        }),
      box
    )
    flush()
    return reads
  }

  const texts = () => [...box.querySelectorAll(".row")].map((row) => row.textContent)

  test("a row that takes none never reads it:  nothing reactive read in `<For>`'s row function", () => {
    const [rows, setRows] = createSignal<readonly string[]>(["a", "b", "c"])
    const reads = drawnAt(rows, false)
    setRows(["c", "a", "b"])
    flush()
    expect(texts()).toEqual(["c", "a", "b"])
    expect(reads.count).toBe(0)
  })

  test("a row that takes it follows it, as rows move", () => {
    const [rows, setRows] = createSignal<readonly string[]>(["a", "b", "c"])
    drawnAt(rows, true)
    expect(texts()).toEqual(["a@0", "b@1", "c@2"])
    setRows(["c", "a", "b"])
    flush()
    expect(texts()).toEqual(["c@0", "a@1", "b@2"])
  })
})
