import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { ElementFixture } from "spell-kit/test-helpers/ElementFixture"
import { expectAccessible } from "spell-kit/test-helpers/A11y"

import "spell-ui/components/ui-icon"
import "spell-ui/components/ui-card"
import "spell-ui/components/ui-label"
import "spell-ui/components/ui-button"
import "spell-epic/components/epic-list"

import { SAGAS_SHOWN_KEY, SORT_KEY } from "spell-epic/components/epic-list/EpicList.types"

/** Today, as a card's `updated` writes it:  in progress, never paused. */
const TODAY = new Date().toISOString().slice(0, 10)

/** A card as `docs index` writes it:  `attributes` after its name and today's `updated`. */
function card(epic: string, title: string, attributes = 'phases="active"'): string {
  return (
    `<epic-card id="epic-${epic}" epic="${epic}" updated="${TODAY}" ${attributes}>` +
    `<a href="${epic}/${epic}.plan.html">${title}</a><span slot="meta">epics/${epic}</span></epic-card>`
  )
}

/** The cards that show, in the order they're drawn (by their boxes:  `order` places them, not the DOM). */
function shown(list: Element): string[] {
  return Array.from(list.querySelectorAll("epic-card"))
    .filter((each) => getComputedStyle(each).display !== "none")
    .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)
    .map((each) => each.getAttribute("epic")!)
}

/** The groups' headings, as they read:  `Favorites 1`. */
function headings(list: Element): string[] {
  return Array.from(list.shadowRoot!.querySelectorAll(".group-title"), (title) =>
    title.textContent!.replace(/\s+/g, " ").trim()
  )
}

/** The chips, as they read, `*` while pressed:  `Epic Tooling 2*`. */
function chips(list: Element): string[] {
  return Array.from(
    list.shadowRoot!.querySelectorAll(".chip"),
    (chip) =>
      `${chip.textContent!.replace(/\s+/g, " ").trim()}${chip.getAttribute("aria-pressed") === "true" ? "*" : ""}`
  )
}

/** A list of `cards`, in one column (so the order reads top to bottom), drawn. */
async function render(cards: string, sagas = "") {
  const host = await ElementFixture.render(
    `<epic-list class="spell-epics" ${sagas ? `sagas="${sagas}"` : ""} style="width: 300px">${cards}</epic-list>`
  )
  await vi.waitFor(() => expect(host.shadowRoot!.querySelector(".group-title")).toBeTruthy())
  return host
}

beforeEach(() => {
  localStorage.removeItem(SAGAS_SHOWN_KEY)
  localStorage.removeItem(SORT_KEY)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("<epic-list>", () => {
  test("groups its cards:  Favorites, Active, Planning, Urgent, Done, by title in each;  an empty group isn't drawn;  axe", async () => {
    const host = await render(
      card("zeta", "Zeta") +
        card("done", "Shipped", 'phases="done"') +
        card("alpha", "Alpha") +
        card("idea", "Idea", 'phases="" future') +
        card("star", "Star", 'phases="done" favorite') +
        card("ten", "Epic 10") +
        card("nine", "Epic 9")
    )
    expect(headings(host)).toEqual(["Favorites 1", "Active 4", "Planning 1", "Done 1"])
    expect(shown(host)).toEqual(["star", "alpha", "nine", "ten", "zeta", "idea", "done"])
    await expectAccessible(host)
  })

  test("sorts newest first when <epic-sort> says Date, and back;  remembered", async () => {
    const host = await render(
      card("a", "A", `phases="active" worked="2026-10-01T09:00-04:00"`) +
        card("b", "B", `phases="active" worked="2026-10-09T09:00-04:00"`) +
        card("c", "C", `phases="active"`)
    )
    expect(shown(host)).toEqual(["a", "b", "c"])
    const sort = await ElementFixture.render(`<epic-sort></epic-sort>`)
    const [, date] = Array.from(sort.shadowRoot!.querySelectorAll("ui-button"))
    ;(date as HTMLElement).click()
    await ElementFixture.settle()
    // newest first, none last
    expect(shown(host)).toEqual(["b", "a", "c"])
    expect(localStorage.getItem(SORT_KEY)).toBe("date")
    expect(date!.hasAttribute("active")).toBe(true)
  })

  test("a chip per saga its cards name, in `sagas`' order, then No saga;  a click shows only that saga's;  remembered", async () => {
    const saga = (id: string, title: string) => `saga="${id}" saga-title="${title}" saga-purpose="${title}, for good"`
    const host = await render(
      card("a", "A", `phases="active" ${saga("epics", "Epic Tooling")}`) +
        card("b", "B", `phases="done" ${saga("epics", "Epic Tooling")}`) +
        card("c", "C", `phases="active" ${saga("drawable-spell", "Drawable Spell")}`) +
        card("d", "D", `phases="active" ${saga("gone", "Gone")}`) +
        card("e", "E"),
      "drawable-spell epics unused"
    )
    // `unused` names no card:  no chip;  `gone` isn't listed:  No saga's
    expect(chips(host)).toEqual(["Drawable Spell 1*", "Epic Tooling 2*", "No saga 2*"])
    const tip = host.shadowRoot!.querySelectorAll(".chip")[1]!.getAttribute("title")
    expect(tip).toBe("Epic Tooling, for good\nClick to show only Epic Tooling")
    ;(host.shadowRoot!.querySelectorAll(".chip")[1] as HTMLElement).click()
    await ElementFixture.settle()
    expect(chips(host)).toEqual(["Drawable Spell 1", "Epic Tooling 2*", "No saga 2"])
    expect(shown(host)).toEqual(["a", "b"])
    // the groups count only what shows
    expect(headings(host)).toEqual(["Active 1", "Done 1"])
    expect(JSON.parse(localStorage.getItem(SAGAS_SHOWN_KEY)!)).toEqual(["epics"])
    // a hidden one, clicked:  shows too
    ;(host.shadowRoot!.querySelectorAll(".chip")[2] as HTMLElement).click()
    await ElementFixture.settle()
    expect(shown(host)).toEqual(["a", "d", "e", "b"])
    await expectAccessible(host)
  })

  test("follows its cards:  a card added, starred or hidden by the page's state chips places again", async () => {
    const host = await render(card("a", "A") + card("b", "B"))
    expect(headings(host)).toEqual(["Active 2"])
    host.insertAdjacentHTML("beforeend", card("c", "C", 'phases="done"'))
    await vi.waitFor(() => expect(headings(host)).toEqual(["Active 2", "Done 1"]))
    host.querySelector('[epic="b"]')!.setAttribute("favorite", "")
    await vi.waitFor(() => expect(headings(host)).toEqual(["Favorites 1", "Active 1", "Done 1"]))
    expect(shown(host)).toEqual(["b", "a", "c"])
    // the docs runtime's state chips hid the done ones:  their group goes
    host.querySelector('[epic="c"]')!.setAttribute("data-spell-hidden", "")
    await vi.waitFor(() => expect(headings(host)).toEqual(["Favorites 1", "Active 1"]))
    // NEVER moved:  the cards stay in the order written
    expect(Array.from(host.querySelectorAll("epic-card"), (each) => each.getAttribute("epic"))).toEqual(["a", "b", "c"])
  })

  test("a card's star answered:  every card starred as the page server says", async () => {
    const host = await render(card("a", "A") + card("b", "B", 'phases="active" favorite'))
    host.querySelector('[epic="a"]')!.dispatchEvent(
      new CustomEvent("epic-favorite", {
        bubbles: true,
        composed: true,
        detail: { epic: "a", favorite: true, favorites: ["a"] }
      })
    )
    await vi.waitFor(() => expect(headings(host)).toEqual(["Favorites 1", "Active 1"]))
    expect(host.querySelector('[epic="a"]')!.hasAttribute("favorite")).toBe(true)
    expect(host.querySelector('[epic="b"]')!.hasAttribute("favorite")).toBe(false)
  })
})
