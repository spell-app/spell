/**
 * Tests of `PhaseIds`:  a phase's stable id from its name, its number from its place, finding one as people name it,
 * and an old address landing.
 */
import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { PhaseIds } from "spell-epic/phases/PhaseIds"

/** A page of three phases:  one with a stable id, one renamed since (its id from its old name), one old (`p3`). */
function page(): Document {
  return parseHTML(
    `<html><body><main><epic-page epic="x" title="X"><epic-section id="phases" kind="phases">` +
      `<epic-phase id="p-epic-migrate" title="Epic Migrate" status="done"></epic-phase>` +
      `<epic-phase id="p-old-name" status="todo"><span slot="title">Saga Pages</span></epic-phase>` +
      `<epic-phase id="p3" title="Docs" status="todo"></epic-phase>` +
      `</epic-section></epic-page></main></body></html>`
  ).document as unknown as Document
}

describe("PhaseIds", () => {
  test("a slug:  lower case, words joined by `-`, anything else dropped;  an apostrophe joins its word", () => {
    expect(
      ["Epic Migrate", "Owen's <epic-link>", "Café 2.0", "  Runtime + Index ", "!!!"].map(PhaseIds.slugOf)
    ).toEqual(["epic-migrate", "owens-epic-link", "cafe-2-0", "runtime-index", "phase"])
  })

  test("a new id:  `p-<slug>`, a clash `-2`, `-3`", () => {
    expect(PhaseIds.make("Epic Migrate", new Set())).toBe("p-epic-migrate")
    expect(PhaseIds.make("Epic Migrate", new Set(["p-epic-migrate", "p-epic-migrate-2"]))).toBe("p-epic-migrate-3")
  })

  test("which ids are phase ids:  stable, or old (`p7`, its number)", () => {
    expect(["p-epic-migrate", "p7", "p-", "p-Epic", "j7", "phases"].map(PhaseIds.isPhaseId)).toEqual([
      true,
      true,
      false,
      false,
      false,
      false
    ])
    expect([PhaseIds.oldNumber("p7"), PhaseIds.oldNumber("p-7")]).toEqual([7, undefined])
  })

  test("a phase's number is its place;  found by number, id, name or slug (today's title too)", () => {
    const phases = PhaseIds.phasesIn(page())
    expect(phases.map(PhaseIds.labelOf)).toEqual(["P1", "P2", "P3"])
    const found = (ref: string | number) => PhaseIds.find(phases, ref)?.id
    expect([found(2), found("P2"), found("#p2"), found("p-old-name"), found("old-name")]).toEqual(
      Array(5).fill("p-old-name")
    )
    expect([found("Saga Pages"), found("saga-pages"), found("epic migrate"), found("p9"), found("nope")]).toEqual([
      "p-old-name",
      "p-old-name",
      "p-epic-migrate",
      undefined,
      undefined
    ])
  })

  test("an old address lands on the phase at that place, unless an element has that id", () => {
    const document = page()
    expect(PhaseIds.landing(document, "p2")).toBe("p-old-name")
    expect(PhaseIds.landing(document, "p3")).toBe("p3")
    expect(PhaseIds.landing(document, "p9")).toBe("p9")
    expect(PhaseIds.landing(document, "j1")).toBe("j1")
  })
})

// epic `epic-engine` P39 wrote decimal phases;  I126 made them whole, but one not migrated yet still reads
describe("PhaseIds:  old decimal phases", () => {
  /** Phases `numbers`, in order:  `""` a whole one (its number its place), else its own decimal. */
  function phases(...numbers: string[]): Element[] {
    const html = numbers
      .map(
        (number, at) => `<epic-phase id="p-${at}" title="P ${at}"${number ? ` number="${number}"` : ""}></epic-phase>`
      )
      .join("")
    const { document } = parseHTML(
      `<html><body><epic-page><epic-section kind="phases">${html}</epic-section></epic-page></body></html>`
    )
    return PhaseIds.phasesIn(document as unknown as Document)
  }

  test("numbers:  the whole ones counted by place, a decimal its own;  found by either", () => {
    const list = phases("", "1.1", "1.2", "", "")
    expect(list.map(PhaseIds.labelOf)).toEqual(["P1", "P1.1", "P1.2", "P2", "P3"])
    expect([PhaseIds.find(list, "P1.2")?.id, PhaseIds.find(list, 2)?.id, PhaseIds.find(list, "1.3")]).toEqual([
      "p-2",
      "p-3",
      undefined
    ])
    // an old address lands on the phase numbered so
    expect(PhaseIds.landing(list[0]!.ownerDocument, "p2")).toBe("p-3")
  })
})
