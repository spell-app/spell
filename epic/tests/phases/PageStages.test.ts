/**
 * Tests of `PageStages` (epic `epic-engine` P29):  an epic page's stage, read from its attribute, the order it goes
 * through, and which sections each stage shows, on linkedom's DOM as the tool and the runtime both read it.
 */
import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { PageStages } from "spell-epic/phases"

/** A page in `stage` (none:  no attribute), with the Overview and every section kind. */
function page(stage?: string): Element {
  const kinds = ["phases", "questions", "judgements", "caveats", "issues", "tests", "log"]
  const sections = kinds.map((kind) => `<epic-section id="${kind}" kind="${kind}"><p>in ${kind}</p></epic-section>`)
  const html =
    `<epic-page epic="x" title="X"${stage ? ` stage="${stage}"` : ""}>` +
    `<epic-overview id="overview"><epic-section id="o1" kind="overview-part"></epic-section></epic-overview>` +
    `${sections.join("")}</epic-page>`
  return parseHTML(`<html><body>${html}</body></html>`).document.querySelector("epic-page")!
}

/** The top-level blocks `page`'s stage shows, by id. */
function shown(page: Element): string[] {
  return Array.from(page.children)
    .filter((block) => !PageStages.hides(block))
    .map((block) => block.id)
}

describe("PageStages", () => {
  test("a page with no stage, or a word that isn't one, reads as building:  every page made before stages", () => {
    expect(PageStages.of(page())).toBe("building")
    expect(PageStages.read("later")).toBe("building")
    expect(PageStages.of(page("phases"))).toBe("phases")
    expect(PageStages.of(null)).toBe("building")
  })

  test("goes overview, phases, building, and stays building;  only the first two are still being agreed", () => {
    expect(PageStages.next("overview")).toBe("phases")
    expect(PageStages.next("phases")).toBe("building")
    expect(PageStages.next("building")).toBe("building")
    expect(PageStages.ALL.filter(PageStages.isPlanning)).toEqual(["overview", "phases"])
  })

  test("overview shows the Overview, Questions and Caveats;  phases adds the Phases and Issues;  building everything", () => {
    expect(shown(page("overview"))).toEqual(["overview", "questions", "caveats"])
    expect(shown(page("phases"))).toEqual(["overview", "phases", "questions", "caveats", "issues"])
    expect(shown(page("building"))).toHaveLength(8)
    expect(shown(page())).toHaveLength(8)
  })

  test("what's inside a hidden section is hidden too;  the Overview's sub-sections never are", () => {
    const overview = page("overview")
    expect(PageStages.hides(overview.querySelector("#log p")!)).toBe(true)
    expect(PageStages.hides(overview.querySelector("#caveats p")!)).toBe(false)
    expect(PageStages.hides(overview.querySelector("#o1")!)).toBe(false)
  })
})
