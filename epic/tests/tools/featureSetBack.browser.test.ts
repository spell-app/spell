import { expect, test, vi } from "vite-plus/test"
import { page } from "vite-plus/test/browser"

import { backPlacesFor } from "spell/epic/tools/_assets/spell-doc-back.js"

// the page waits for every element it draws (its toolbar, its titles) before it lands
import "spell/ui"

/**
 * A Feature Set's addresses and the browser's Back and Forward, the docs runtime driving the page as it does when
 * served (epic `epic-engine` P80):  `#s1f1` lands on that item, and Back and Forward put the reader where they were
 * (`spell-doc-back.js`, the runtime's `onHistory()`).
 * - the runtime runs as it's imported, so the page is set up first, and this file holds one test
 * - `navigation.back()`, not `history.back()`:  the test files are frames of one tab, whose history they share
 */

/** Each item's height:  a section is far taller than the window. */
const ROW_PX = 120

/** Items in each section. */
const ITEMS = 16

/** A section of items, each with its name's link;  one of S1's links into S2. */
function section(number: number) {
  const rows = Array.from({ length: ITEMS }, (_, index) => {
    const id = `s${number}f${index + 1}`
    const link = id === "s1f9" ? ` <a id="to-s2f5" href="#s2f5">S2F5</a>` : ""
    return (
      `<tr id="${id}" data-feature-item style="height: ${ROW_PX}px"><td>` +
      `<a class="spell-feature-name" href="#${id}">F${index + 1}</a>${link}</td></tr>`
    )
  })
  return (
    `<ui-section id="s${number}" label="S${number} · Section ${number}" collapsible data-feature-section>` +
    `<table><tbody>${rows.join("")}</tbody></table></ui-section>`
  )
}

/** The element with `id`. */
function byId(id: string) {
  return document.getElementById(id)!
}

/** How far down the window `id`'s top is. */
function topOf(id: string) {
  return Math.round(byId(id).getBoundingClientRect().top)
}

/** A link, a jump or the history settles:  the page's holds and smooth scrolls are over. */
function settle() {
  return new Promise((done) => setTimeout(done, SETTLED_MS))
}

/** Longer than the runtime holds a scroll it put back. */
const SETTLED_MS = 1700

test(
  "#s1f1 lands on that item;  Back and Forward put the reader back, folds and scroll",
  { timeout: 30_000 },
  async () => {
    await page.viewport(900, 600)
    document.body.className = "spell-doc-page spell-details-page"
    document.body.innerHTML =
      `<main class="spell-doc-main"><p style="height: 900px">Where we are</p><epic-feature-set></epic-feature-set>` +
      `${section(1)}${section(2)}<p style="height: 900px">Notes</p></main>`
    history.replaceState(null, "", `${location.pathname}${location.search}#s1f1`)

    // Dynamic import:  the runtime wires whatever page is there when it's first imported
    await import("spell/epic/tools/_assets/spell-doc-runtime.js")
    await settle()
    expect(scrollY).toBeGreaterThan(0)
    expect(topOf("s1f1")).toBeGreaterThanOrEqual(0)
    expect(topOf("s1f1")).toBeLessThan(200)

    scrollTo({ top: scrollY + topOf("s1f9") - 250, behavior: "instant" })
    await settle()
    const left = scrollY
    byId("to-s2f5").click()
    await settle()
    expect(scrollY).toBeGreaterThan(left + ROW_PX)
    expect(topOf("s2f5")).toBeLessThan(200)

    // on from where the link landed, then Back:  the row the link was in, not the top of its section
    scrollTo({ top: scrollY + 3 * ROW_PX, behavior: "instant" })
    await settle()
    const wentTo = scrollY
    navigation.back()
    await settle()
    expect(Math.abs(scrollY - left)).toBeLessThan(3)

    // Forward:  where they were when they pressed Back, which no link click kept
    navigation.forward()
    await settle()
    expect(Math.abs(scrollY - wentTo)).toBeLessThan(3)

    // and Back once more, a section folded since:  open again, as it was left
    byId("s1").setAttribute("open", "false")
    await settle()
    navigation.back()
    await settle()
    expect(byId("s1").getAttribute("open")).not.toBe("false")
    expect(Math.abs(scrollY - left)).toBeLessThan(3)

    // a page Back loaded afresh opens at the same place
    const entries = vi.spyOn(performance, "getEntriesByType")
    entries.mockReturnValue([{ type: "back_forward" } as PerformanceNavigationTiming])
    expect(backPlacesFor(document.querySelector("main")!)!.arrival().scroll).toBeCloseTo(left, -1)
    entries.mockRestore()
  }
)
