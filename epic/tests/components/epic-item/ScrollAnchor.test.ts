/**
 * Tests of `ScrollAnchor`:  a click that hides or opens much of a page keeps what was at the window's top in its spot
 * (epic `epic-engine` I350).
 * - a plain page of `<epic-section>`s and `<epic-item>`s (not upgraded:  boxes of a set height), under a stuck stack
 *   of 60px (`--epic-stack`), with room above and below
 */
import { afterEach, beforeEach, describe, expect, test } from "vite-plus/test"

import { ScrollAnchor } from "spell/epic/components/epic-item/ScrollAnchor"

/** Where the titles stuck over everything end, px. */
const STACK = 60
/** Each item's height, px. */
const ITEM_H = 40

let page: HTMLElement

beforeEach(() => {
  page = document.createElement("div")
  page.style.setProperty("--epic-stack", `${STACK}px`)
  // room above and below, so the page can scroll however much hides
  page.style.padding = "2000px 0"
  for (let section = 1; section <= 4; section++) {
    const box = document.createElement("epic-section")
    box.id = `s${section}`
    box.style.display = "block"
    for (let item = 1; item <= 30; item++) {
      const line = document.createElement("epic-item")
      line.id = `s${section}i${item}`
      line.dataset.state = item % 2 ? "open" : "old"
      line.style.cssText = `display: block;  height: ${ITEM_H}px`
      box.append(line)
    }
    page.append(box)
  }
  document.body.append(page)
  window.scrollTo({ top: 0, behavior: "instant" })
})

afterEach(() => {
  page.remove()
  window.scrollTo({ top: 0, behavior: "instant" })
})

/** Scroll so item `id`'s top is `at` px from the window's top. */
function scrollItemTo(id: string, at: number) {
  const top = document.getElementById(id)!.getBoundingClientRect().top
  window.scrollBy({ top: top - at, behavior: "instant" })
}

const topOf = (id: string) => document.getElementById(id)!.getBoundingClientRect().top

/** Hide every item in `state` (as a state chip does). */
function hide(state: string) {
  for (const item of page.querySelectorAll<HTMLElement>(`epic-item[data-state="${state}"]`)) item.style.display = "none"
}

describe("ScrollAnchor.anchorOf()", () => {
  test("the first item that shows whose top is at or below the stuck stack", () => {
    scrollItemTo("s3i5", STACK + 10)
    const anchor = ScrollAnchor.anchorOf(page)!
    expect(anchor.element.id).toBe("s3i5")
    expect(anchor.top).toBeCloseTo(STACK + 10, 0)
  })

  test("an item half under the stack is passed over for the next", () => {
    scrollItemTo("s3i5", STACK - 10)
    expect(ScrollAnchor.anchorOf(page)!.element.id).toBe("s3i6")
  })

  test("nothing starts below the stack:  the innermost box crossing it", () => {
    const tall = document.getElementById("s2i3")!
    tall.style.height = "4000px"
    scrollItemTo("s2i3", -500)
    expect(ScrollAnchor.anchorOf(page)!.element.id).toBe("s2i3")
  })
})

describe("ScrollAnchor.keep()", () => {
  test("hiding the items above and below:  the top item stays where it was", async () => {
    scrollItemTo("s3i5", STACK + 20)
    const before = topOf("s3i5")
    await ScrollAnchor.keep(() => hide("old"), page)
    expect(Math.abs(topOf("s3i5") - before)).toBeLessThanOrEqual(1)
  })

  test("showing them again:  the same", async () => {
    hide("old")
    scrollItemTo("s3i5", STACK + 20)
    await ScrollAnchor.keep(() => {
      for (const item of page.querySelectorAll<HTMLElement>("epic-item")) item.style.display = "block"
    }, page)
    expect(Math.abs(topOf("s3i5") - (STACK + 20))).toBeLessThanOrEqual(1)
  })

  test("the top item itself hidden:  the nearest one before it that shows takes its spot", async () => {
    scrollItemTo("s3i6", STACK + 20)
    await ScrollAnchor.keep(() => hide("old"), page)
    expect(Math.abs(topOf("s3i5") - (STACK + 20))).toBeLessThanOrEqual(1)
  })

  test("every item hidden:  its section takes its spot, never the page's bottom", async () => {
    scrollItemTo("s3i6", STACK + 20)
    await ScrollAnchor.keep(() => {
      for (const item of page.querySelectorAll<HTMLElement>("epic-item")) item.style.display = "none"
      for (const section of page.querySelectorAll<HTMLElement>("epic-section")) section.style.minHeight = "30px"
    }, page)
    expect(Math.abs(topOf("s3") - (STACK + 20))).toBeLessThanOrEqual(1)
  })

  test("a box above that grows a frame late (lines drawn as they come near):  put back again", async () => {
    scrollItemTo("s3i5", STACK + 20)
    await ScrollAnchor.keep(() => {
      hide("old")
      requestAnimationFrame(() =>
        requestAnimationFrame(() => (document.getElementById("s2i1")!.style.height = "300px"))
      )
    }, page)
    expect(Math.abs(topOf("s3i5") - (STACK + 20))).toBeLessThanOrEqual(1)
  })

  test("the reader scrolls meanwhile:  it stops, and leaves the page where the reader put it", async () => {
    scrollItemTo("s3i5", STACK + 20)
    const kept = ScrollAnchor.keep(() => hide("old"), page)
    await new Promise((resolve) => requestAnimationFrame(resolve))
    window.dispatchEvent(new WheelEvent("wheel", { deltaY: 100 }))
    window.scrollBy({ top: 200, behavior: "instant" })
    const scrolled = window.scrollY
    await kept
    expect(window.scrollY).toBe(scrolled)
  })
})
