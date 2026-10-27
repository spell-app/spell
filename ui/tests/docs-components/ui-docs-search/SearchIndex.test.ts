import { describe, expect, test } from "vite-plus/test"

import { Fixture } from "spell/test-helpers/Fixture"
import { DATA, PAGE, SEARCH, siteTag } from "spell/ui/test-helpers/docsSearch.fixtures"

import { PageOutline } from "spell/ui/components/ui-toc/PageOutline"
import { SearchIndex } from "spell/ui/docs-components/ui-docs-search/SearchIndex"

/** The index of the test data and search file. */
const INDEX = new SearchIndex({ data: DATA, search: SEARCH })

describe("new SearchIndex()", () => {
  test("builds a component per tag, an attribute per tag attribute, a page per hand-written page, a section each", () => {
    const kinds = INDEX.entries.map((entry) => entry.kind)
    expect(kinds.filter((kind) => kind === "component")).toHaveLength(5)
    expect(kinds.filter((kind) => kind === "attribute")).toHaveLength(6)
    expect(INDEX.entries.filter((entry) => entry.kind === "page").map((entry) => entry.title)).toEqual([
      "Overview",
      "Theming"
    ])
    expect(kinds.filter((kind) => kind === "section")).toHaveLength(8)
  })
})

describe("SearchIndex.search()", () => {
  test.each([
    ["or", "component", "Or"],
    ["OR", "component", "Or"],
    ["ui-or", "component", "Or"],
    ["uior", "component", "Or"],
    ["dialog", "component", "Modal"],
    ["light", "component", "Modal"],
    ["modal", "component", "Modal"],
    ["over", "page", "Overview"],
    ["rhythm", "section", "Vertical rhythm"]
  ])("ranks %j's best match first:  a %s, %s", (query, kind, title) => {
    const [group] = INDEX.search(query)
    expect(group!.kind).toBe(kind)
    expect(group!.hits[0]!.entry.title).toBe(title)
  })

  test("matches short queries only at word starts:  `or` never finds every `color`", () => {
    expect(found("or").flatMap(([, titles]) => titles)).not.toContain("color")
    expect(found("olo")).toEqual([["attribute", ["color", "color"]]])
  })

  test("needs every word of a query, found at word starts, across title and terms", () => {
    const [group] = INDEX.search("label circ")
    expect(group!.kind).toBe("attribute")
    expect(group!.hits.map((hit) => hit.entry.code)).toEqual(["<ui-label>"])
    expect(group!.hits[0]!.marks).toEqual([[0, 4]])
    expect(INDEX.search("label zebra")).toEqual([])
  })

  test("skips the search file's copy of the page shown, and boosts its own attributes", () => {
    expect(found("vertical divider", "components/ui-divider.html").flatMap(([, titles]) => titles)).not.toContain(
      "Vertical Divider"
    )
    const [attributes] = INDEX.search("circular", [], "components/ui-label.html").filter((g) => g.kind === "attribute")
    expect(attributes!.hits[0]!.entry.code).toBe("<ui-label>")
  })

  test("orders groups by their best hit;  the page shown's sections win a tie", () => {
    const here = SearchIndex.here(Fixture.render(PAGE))
    const groups = INDEX.search("vertical divider", here, "components/ui-divider.html")
    expect(groups[0]!.kind).toBe("here")
  })

  test("finds nothing for an empty query, and caps each group", () => {
    expect(INDEX.search("  ")).toEqual([])
    const many = new SearchIndex({
      data: { ...DATA, components: Array.from({ length: 12 }, (_, at) => siteTag(`Thing ${at}`, `ui-thing-${at}`)) }
    })
    expect(many.search("thing")[0]!.hits).toHaveLength(5)
  })
})

describe("SearchIndex.marks()", () => {
  test("marks the matched text:  the whole query, else each word", () => {
    expect(SearchIndex.marks("vertical divider", ["div"])).toEqual([[9, 12]])
    expect(SearchIndex.marks("vertical divider", ["ver", "div"])).toEqual([
      [0, 3],
      [9, 12]
    ])
    expect(SearchIndex.marks("abc", ["zz"])).toEqual([])
  })
})

describe("SearchIndex.fold()", () => {
  test("is blind to accents and case;  spacing collapses", () => {
    expect(SearchIndex.fold("  Ça  VA ")).toBe("ca va")
  })
})

describe("SearchIndex.compact()", () => {
  test("keeps letters and digits only:  `UI-Or` ~== `uior`", () => {
    expect(SearchIndex.compact("UI-Or")).toBe("uior")
  })
})

describe("SearchIndex.words()", () => {
  test("splits a query at spaces and `›`", () => {
    expect(SearchIndex.words("ui-button › circular")).toEqual(["ui-button", "circular"])
  })
})

describe("SearchIndex.wordStart()", () => {
  test("finds a needle only where it starts a word;  -1 when it never does", () => {
    expect(SearchIndex.wordStart("color circular", "c")).toBe(0)
    expect(SearchIndex.wordStart("color circular", "cir")).toBe(6)
    expect(SearchIndex.wordStart("ui-or", "or")).toBe(3)
    expect(SearchIndex.wordStart("color", "or")).toBe(-1)
  })
})

describe("PageOutline.trail()", () => {
  test("names a section's tab, then the sections around it, outermost first", () => {
    const sections = [
      { title: "Variations", tab: "examples" },
      { title: "Circular", parent: 0 },
      { title: "Small", parent: 1 }
    ]
    expect(PageOutline.trail(sections, 2, { examples: "Examples" })).toEqual(["Examples", "Variations", "Circular"])
    expect(PageOutline.trail(sections, 0, { examples: "Examples" })).toEqual(["Examples"])
    expect(PageOutline.trail(sections, 1)).toEqual(["Variations"])
  })
})

/** The titles found for `query`, group by group. */
function found(query: string, current?: string) {
  return INDEX.search(query, [], current).map((group) => [group.kind, group.hits.map((hit) => hit.entry.title)])
}

describe("SearchIndex.here()", () => {
  test("reads sections and headers with ids, their trail through tabs and parents, never a demo's", () => {
    const page = Fixture.render(`
      <main>
        ${PAGE}
        <ui-header level="2" id="intro">Intro <ui-header>sub</ui-header></ui-header>
        <h3 id="more">More</h3>
        <ui-section id="untitled"></ui-section>
      </main>`)
    const entries = SearchIndex.here(page)
    expect(entries.map((entry) => [entry.title, entry.context ?? "", entry.href])).toEqual([
      ["Types", "Examples", "#examples-types"],
      ["Divider", "Examples › Types", "#examples-types-divider"],
      ["Vertical Divider", "Examples › Types", "#examples-types-vertical-divider"],
      ["Keyboard", "Usage", "#usage-keyboard"],
      ["Intro", "", "#intro"],
      ["More", "", "#more"]
    ])
    expect(SearchIndex.here(undefined)).toEqual([])
  })
})
