/**
 * Tests of `PageStages` (epic `epic-engine` P29, P70):  an epic page's stage, read from its attribute, the order it
 * goes through, and which sections hide for being empty, on linkedom's DOM as the tool and the runtime both read it.
 */
import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { PageStages } from "spell/epic/phases"
import { NEW_KIND_LOOKS } from "spell/epic/components/epic-new-item/EpicNewItem.types"

/** Every section kind that hides when empty, in the page's order. */
const KINDS = ["phases", "questions", "judgements", "todos", "issues", "tests", "log"]

/** A page in `stage` (none:  no attribute), with the Overview and every section kind, each holding `inside`. */
function page(stage?: string, inside: (kind: string) => string = (kind) => `<p>in ${kind}</p>`): Element {
  const sections = KINDS.map((kind) => `<epic-section id="${kind}" kind="${kind}">${inside(kind)}</epic-section>`)
  const html =
    `<epic-page epic="x" title="X"${stage ? ` stage="${stage}"` : ""}>` +
    `<epic-overview id="overview"><epic-section id="o1" kind="overview-part"></epic-section></epic-overview>` +
    `${sections.join("")}</epic-page>`
  return parseHTML(`<html><body>${html}</body></html>`).document.querySelector("epic-page")!
}

/** A page in `stage` with every section empty. */
function emptyPage(stage?: string): Element {
  return page(stage, () => "")
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

  test("a section with anything in it shows at EVERY stage", () => {
    for (const stage of [undefined, "overview", "phases", "building"]) expect(shown(page(stage))).toHaveLength(8)
  })

  test("an empty section hides at EVERY stage;  the Overview and its sub-sections never do", () => {
    for (const stage of [undefined, "overview", "phases", "building"])
      expect(shown(emptyPage(stage))).toEqual(["overview"])
    expect(PageStages.hides(emptyPage().querySelector("#o1")!)).toBe(false)
  })

  test("while reviewed, an empty section with a New button stays;  an empty Judgement calls or Log still hides", () => {
    const reviewed = emptyPage("overview")
    reviewed.setAttribute("reviewing", "")
    expect(shown(reviewed)).toEqual(["overview", "phases", "questions", "todos", "issues", "tests"])
    expect(PageStages.canAddTo(reviewed.querySelector("#todos")!)).toBe(true)
    expect(PageStages.canAddTo(reviewed.querySelector("#judgements")!)).toBe(false)
    reviewed.removeAttribute("reviewing")
    expect(shown(reviewed)).toEqual(["overview"])
  })

  test("a section fills:  an item, a `source` part, or any child but a named slot's or one the runtime added", () => {
    const fills = emptyPage()
    const judgements = fills.querySelector("#judgements")!
    judgements.innerHTML = `<button slot="actions">C</button><epic-actions data-spell-added></epic-actions>`
    expect(PageStages.hides(judgements)).toBe(true)
    judgements.append(item(fills, "j1"))
    expect(PageStages.hides(judgements)).toBe(false)
    const log = fills.querySelector("#log")!
    log.setAttribute("source", "parts/log.html")
    expect(PageStages.hides(log)).toBe(false)
  })

  test("what's inside a hidden section is hidden too;  outside a page, nothing is", () => {
    const hidden = emptyPage()
    hidden.querySelector("#log")!.innerHTML = `<button slot="actions">C</button>`
    expect(PageStages.hides(hidden.querySelector("#log button")!)).toBe(true)
    const bare = parseHTML(`<epic-section id="todos" kind="todos"></epic-section>`).document.firstElementChild!
    expect(PageStages.hides(bare)).toBe(false)
  })

  test("every kind with a New button is one `TAKES_NEW` names, and the other way", () => {
    expect(
      Object.values(NEW_KIND_LOOKS)
        .map((look) => look.section)
        .sort()
    ).toEqual([...PageStages.TAKES_NEW].sort())
  })
})

/** An `<epic-item id>` made in `page`'s document. */
function item(page: Element, id: string): Element {
  const element = page.ownerDocument.createElement("epic-item")
  element.id = id
  return element
}
