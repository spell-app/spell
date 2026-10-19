import { describe, expect, test } from "vite-plus/test"

import {
  EPIC_CARDS_END,
  EPIC_CARDS_START,
  byTitle,
  epicCardHtml,
  epicGroupFor,
  epicListHtml,
  eventTimesIn,
  lastWorked,
  favoritesIn,
  readEpicDate
} from "$/epics/list/EpicCards"
import { epicStateFor } from "$/epics/list/EpicState"

/** A day the tests stand on:  2026-10-10, local. */
const NOW = new Date(2026, 9, 10, 9)

describe("epicGroupFor()", () => {
  test("errors are Urgent, done is Done;  Active needs phases left, else Planning;  paused stays Active", () => {
    const group = (phases: string[], more: { urgent?: string[]; future?: boolean; updated?: string } = {}) =>
      epicGroupFor(epicStateFor({ phases, ...more }, NOW))
    expect(group(["done", "done"], { urgent: ["q1"] })).toBe("urgent")
    expect(group(["done"])).toBe("done")
    expect(group(["done", "active"])).toBe("active")
    expect(group(["todo"], { updated: "2026-01-01" })).toBe("active")
    expect(group([])).toBe("planning")
    expect(group([], { future: true })).toBe("planning")
  })
})

// epic `epic-engine` P3:  elements, which draw, group and sort themselves
describe("epicCardHtml()", () => {
  test("writes an <epic-card>:  its facts as attributes, its link, description and meta line as children", () => {
    const { html, group, title } = epicCardHtml(
      {
        name: "seo",
        title: "SEO & <co>",
        href: "seo/seo.plan.html",
        target: "seo",
        description: 'Meta "tags"',
        meta: "P2 · Site Map · epics/seo/seo.plan.html",
        facts: { phases: ["done", "active"], updated: "2026-10-08", urgent: ["q1"], active: "P2 · Site Map" },
        worked: new Date(2026, 9, 9, 7, 5),
        saga: { id: "epics", title: "Epic Tooling", purpose: "Epics <3" }
      },
      NOW
    )
    expect([group, title]).toEqual(["active", "SEO & <co>"])
    expect(html).toMatch(
      /^<epic-card id="epic-seo" epic="seo" data-status="open" phases="done active" updated="2026-10-08" urgent="q1" active="P2 · Site Map" worked="2026-10-09T07:05[+-]\d\d:\d\d" saga="epics" saga-title="Epic Tooling" saga-purpose="Epics &lt;3">\n/
    )
    expect(html).toContain(`<a href="seo/seo.plan.html" target="seo">SEO &amp; &lt;co&gt;</a>\n`)
    expect(html).toContain(`<span slot="description">Meta "tags"</span>\n`)
    expect(html).toMatch(/<span slot="meta">P2 · Site Map · epics\/seo\/seo.plan.html<\/span>\n<\/epic-card>$/)
  })

  test("a starred epic shows under Favorites;  a done one is `done`;  bare attributes for future and standing", () => {
    const card = (facts: Parameters<typeof epicCardHtml>[0]["facts"], favorite = false) =>
      epicCardHtml({ name: "a", title: "A", href: "a.html", meta: "a", facts, favorite }, NOW)
    expect(card({ phases: ["active"] }, true)).toMatchObject({ group: "favorites" })
    expect(card({ phases: ["active"] }, true).html).toMatch(/ favorite>\n/)
    expect(card({ phases: ["done"] }).html).toContain(' data-status="done" phases="done">')
    expect(card({ phases: [], future: true }).html).toContain(' phases="" future>')
    expect(card({ phases: ["done"], standing: true }).html).toContain(' data-status="open" phases="done" standing>')
  })
})

describe("epicListHtml()", () => {
  test("ONE <epic-list>:  the sagas' ids in order, the cards by group then title between the page server's markers", () => {
    const card = (name: string, title: string, favorite = false, phases = ["active"]) =>
      epicCardHtml({ name, title, href: `${name}.html`, meta: name, facts: { phases }, favorite }, NOW)
    const html = epicListHtml(
      [card("b", "epic 10"), card("d", "Done", false, ["done"]), card("a", "Epic 9"), card("s", "Star", true)],
      [
        { id: "drawable-spell", title: "Drawable Spell", purpose: "x" },
        { id: "epics", title: "Epic Tooling", purpose: "y" }
      ]
    )
    expect(html).toMatch(/^<epic-list class="spell-epics" sagas="drawable-spell epics">\n<!-- running-epics -->\n/)
    expect(html).toMatch(/\n<!-- running-epics:end -->\n<\/epic-list>$/)
    expect(Array.from(html.matchAll(/ epic="(\w+)"/g), (m) => m[1])).toEqual(["s", "a", "b", "d"])
    expect(html.indexOf(EPIC_CARDS_START)).toBeLessThan(html.indexOf(EPIC_CARDS_END))
    expect(byTitle("Epic 9", "epic 10")).toBeLessThan(0)
    // no sagas:  no attribute
    expect(epicListHtml([], [])).toMatch(/^<epic-list class="spell-epics">\n/)
  })
})

describe("last worked", () => {
  test("reads a day, a local time, an offset (git's too);  the latest wins;  nothing readable:  undefined", () => {
    expect(readEpicDate("2026-10-08")).toEqual(new Date(2026, 9, 8))
    expect(readEpicDate("2026-10-08 14:34")).toEqual(new Date(2026, 9, 8, 14, 34))
    expect(readEpicDate("2026-10-08T14:34-04:00")).toEqual(new Date("2026-10-08T18:34:00Z"))
    expect(readEpicDate("2026-10-08T14:34:05-0400")).toEqual(new Date("2026-10-08T18:34:05Z"))
    expect(readEpicDate("soon")).toBeUndefined()
    const log = `<epic-event at="2026-10-09T00:26-04:00">a</epic-event>\n<epic-event\n  at="2026-10-09T22:08-04:00">b</epic-event>`
    expect(eventTimesIn(log)).toEqual(["2026-10-09T00:26-04:00", "2026-10-09T22:08-04:00"])
    expect(lastWorked(["2026-10-09", ...eventTimesIn(log), undefined])).toEqual(new Date("2026-10-10T02:08:00Z"))
    expect(lastWorked([null, "x"])).toBeUndefined()
  })
})

test("favoritesIn():  a list of names;  anything else is none", () => {
  expect(favoritesIn(["airplane", 3, "seo"])).toEqual(new Set(["airplane", "seo"]))
  expect(favoritesIn({})).toEqual(new Set())
  expect(favoritesIn("not a list")).toEqual(new Set())
  expect(favoritesIn(undefined)).toEqual(new Set())
})
