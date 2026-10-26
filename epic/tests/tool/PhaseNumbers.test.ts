/**
 * Tests of `PhaseNumbers`:  what names a phase by number follows when numbers change, the record keeping its own.
 */
import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { PhaseIds } from "spell-epic/phases"
import { PhaseNumbers } from "spell-epic/tool/PhaseNumbers"

/** Phases One to Four of epic `demo`, with `todo` (an item's words) and `rest` (more sections) after them. */
function page(todo: string, rest = ""): Document {
  const phases = ["One", "Two", "Three", "Four"]
    .map((name) => `<epic-phase id="p-${name.toLowerCase()}" title="${name}" status="todo"></epic-phase>`)
    .join("")
  return parseHTML(
    `<html><body><main><epic-page epic="demo" title="Demo"><epic-section id="phases" kind="phases">${phases}` +
      `</epic-section><epic-section id="todos" kind="todos"><epic-item id="t1" title="A todo" status="open">` +
      `${todo}</epic-item></epic-section>${rest}</epic-page></main></body></html>`
  ).document as unknown as Document
}

/** Put a new phase `name` in before phase `before` (1-based) of `document`, and follow;  returns whether it did. */
function insert(document: Document, name: string, before: number): boolean {
  const numbers = PhaseNumbers.snapshot(document)
  const phase = document.createElement("epic-phase")
  phase.id = `p-${name.toLowerCase()}`
  phase.setAttribute("title", name)
  PhaseIds.phasesIn(document)[before - 1]!.before(phase)
  return PhaseNumbers.follow(document, numbers)
}

/** The words of item `t1`. */
function words(document: Document): string {
  return document.getElementById("t1")!.textContent ?? ""
}

describe("PhaseNumbers.followMentions()", () => {
  test("a phase in before P2:  bare P2-P4 move down one, ALL AT ONCE (P2 => P3 never goes on to P4);  P1 stays", () => {
    const document = page("<p>P1 first, then P2, goes to P3;  the full builder, P4.</p>")
    expect(insert(document, "New", 2)).toBe(true)
    expect(words(document)).toBe("P1 first, then P3, goes to P4;  the full builder, P5.")
  })

  test("ranges at each end (P2-P4, P2–P4, P2-4), possessives (P4's), this epic's id (demo P3)", () => {
    const document = page("<p>P2-P4, P2–P4, P2 - P4 and P2-4;  P4's tint row, P4’s too;  demo P3, epic demo P3.</p>")
    insert(document, "New", 2)
    expect(words(document)).toBe("P3-P5, P3–P5, P3 - P5 and P3-5;  P5's tint row, P5’s too;  demo P4, epic demo P4.")
  })

  test("another epic's P-number is left:  ui-gaps P2, `seo` P2, epic seo P2, ui-gaps's P2, seo#P2;  nor P2.1 or IP2", () => {
    const said = "ui-gaps P2, <code>seo</code> P2, `seo` P2, epic seo P2, ui-gaps's P2, seo#P2, P2.1, IP2"
    const document = page(`<p>${said}</p>`)
    insert(document, "New", 2)
    expect(words(document)).toBe(said.replace("<code>seo</code>", "seo"))
  })

  test("the record keeps its numbers:  the log, an Original Discussion, commits, quotes, the kickoff prompt", () => {
    const record =
      `<epic-section id="log" kind="log"><epic-event>P2 Two added</epic-event></epic-section>` +
      `<epic-section id="overview" kind="overview"><epic-prompt><p>do P2 first</p></epic-prompt></epic-section>`
    const document = page(
      `<p>see P2</p><blockquote><p>Owen:  P2 next</p></blockquote><p>he said <q>P2</q></p>` +
        `<epic-commit sha="abc">P2:  Two</epic-commit><epic-original><p>P2 was it</p></epic-original>`,
      record
    )
    insert(document, "New", 2)
    expect(words(document)).toBe("see P3Owen:  P2 nexthe said P2P2:  TwoP2 was it")
    expect(document.querySelector("epic-event")!.textContent).toBe("P2 Two added")
    expect(document.querySelector("epic-prompt")!.textContent).toBe("do P2 first")
  })

  test("an item's title, `work` and an Update block's `summary` follow;  a phase's title is left", () => {
    const document = page(`<epic-update phase="1" summary="P3 split, P4 later"><p>P3 split</p></epic-update>`)
    const item = document.getElementById("t1")!
    item.setAttribute("title", "Fix P3's tint")
    item.setAttribute("work", "Queued for P4")
    PhaseIds.phasesIn(document)[2]!.setAttribute("title", "P3 Again")
    insert(document, "New", 2)
    expect([item.getAttribute("title"), item.getAttribute("work")]).toEqual(["Fix P4's tint", "Queued for P5"])
    expect(document.querySelector("epic-update")!.getAttribute("summary")).toBe("P4 split, P5 later")
    expect(document.getElementById("p-three")!.getAttribute("title")).toBe("P3 Again")
  })

  test("a move swaps numbers in one pass:  P4 to place 2 makes P2 => P3, P3 => P4, P4 => P2", () => {
    const document = page("<p>P2, P3 and P4;  P2-P4</p>")
    const numbers = PhaseNumbers.snapshot(document)
    const [, two, , four] = PhaseIds.phasesIn(document)
    two!.before(four!)
    expect(PhaseNumbers.follow(document, numbers)).toBe(true)
    expect(words(document)).toBe("P3, P4 and P2;  P3-P2")
  })

  test("a second run changes nothing:  no number changed since its snapshot", () => {
    const document = page("<p>P2, goes to P3</p>")
    insert(document, "New", 2)
    const after = document.documentElement.outerHTML
    expect(PhaseNumbers.follow(document, PhaseNumbers.snapshot(document))).toBe(false)
    expect(PhaseNumbers.relabelNames(document)).toBe(0)
    expect(document.documentElement.outerHTML).toBe(after)
  })
})
