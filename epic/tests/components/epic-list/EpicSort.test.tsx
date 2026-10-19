import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { ElementFixture } from "$/ui/test/ElementFixture"
import { expectAccessible } from "$/ui/test/A11y"

import "$/ui/components/ui-icon"
import "$/ui/components/ui-button"
import "$/epics/components/epic-list"

import { SORT_KEY } from "$/epics/components/epic-list/EpicList.types"

/** Its buttons, as they read, `*` while in use:  `A–Z*`. */
function buttons(host: Element): string[] {
  return Array.from(
    host.shadowRoot!.querySelectorAll("ui-button"),
    (button) => `${button.textContent!.trim()}${button.hasAttribute("active") ? "*" : ""}`
  )
}

beforeEach(() => localStorage.removeItem(SORT_KEY))
afterEach(() => vi.restoreAllMocks())

describe("<epic-sort>", () => {
  test("A–Z and Date, the one in use pressed;  a click says so to the page and is remembered;  axe", async () => {
    const host = await ElementFixture.render(`<epic-sort></epic-sort>`)
    expect(buttons(host)).toEqual(["A–Z*", "Date"])
    const [title, date] = Array.from(host.shadowRoot!.querySelectorAll("ui-button"))
    expect([title!.getAttribute("title"), title!.getAttribute("aria-label")]).toEqual([
      "Sort each group by title, A to Z",
      "A–Z, in use"
    ])
    const heard = vi.fn()
    document.addEventListener("epic-sort", (event) => heard((event as CustomEvent).detail), { once: true })
    ;(date as HTMLElement).click()
    await ElementFixture.settle()
    expect(heard).toHaveBeenCalledWith({ sort: "date" })
    expect(buttons(host)).toEqual(["A–Z", "Date*"])
    expect(localStorage.getItem(SORT_KEY)).toBe("date")
    await expectAccessible(host)
    // a new one starts as remembered
    expect(buttons(await ElementFixture.render(`<epic-sort></epic-sort>`))).toEqual(["A–Z", "Date*"])
  })
})
