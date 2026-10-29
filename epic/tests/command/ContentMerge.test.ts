import { describe, expect, test } from "vite-plus/test"

import { ContentMerge } from "spell/epic/command/ContentMerge"

/** A file with one conflict, diff3 style:  `ours` (the remote's), `base`, `theirs` (this machine's). */
function conflicted(ours: string[], base: string[], theirs: string[]): string {
  return [
    "before",
    "<<<<<<< HEAD",
    ...ours,
    "||||||| base",
    ...base,
    "=======",
    ...theirs,
    ">>>>>>> 05e063c",
    "after"
  ].join("\n")
}

describe("ContentMerge.resolve()", () => {
  test("only a date changed on both:  the LATER one, for `updated` and `recent-since`", () => {
    const text = conflicted(
      ['  updated="2026-10-30"', '  recent-since="2026-10-29T08:00:36-04:00"'],
      ['  updated="2026-10-28"', '  recent-since="2026-10-28T08:00:36-04:00"'],
      ['  updated="2026-10-29"', '  recent-since="2026-10-29T09:00:00-04:00"']
    )
    expect(ContentMerge.resolve(text)).toBe(
      ["before", '  updated="2026-10-30"', '  recent-since="2026-10-29T09:00:00-04:00"', "after"].join("\n")
    )
  })

  test("both added at one place:  both kept, the remote's first, even where the formatter folded the line before", () => {
    const text = conflicted(
      ['<epic-section id="todos" kind="todos"', '  ><epic-item id="t1"></epic-item', "></epic-section>"],
      ['<epic-section id="todos" kind="todos"></epic-section>'],
      ['<epic-section id="todos" kind="todos"', '  ><epic-item id="t2"></epic-item', "></epic-section>"]
    )
    expect(ContentMerge.resolve(text)).toBe(
      [
        "before",
        '<epic-section id="todos" kind="todos"',
        '  ><epic-item id="t1"></epic-item',
        "",
        '  ><epic-item id="t2"></epic-item',
        "></epic-section>",
        "after"
      ].join("\n")
    )
  })

  test("both changed the same words:  NOT settled;  nor a conflict without its base", () => {
    expect(ContentMerge.resolve(conflicted(['title="Ana"'], ['title="old"'], ['title="Ben"']))).toBeUndefined()
    expect(ContentMerge.resolve(["<<<<<<< HEAD", "a", "=======", "b", ">>>>>>> x"].join("\n"))).toBeUndefined()
  })
})

describe("ContentMerge.sortLog()", () => {
  test("two runs a union merge left side by side:  one, by time, equal times as they were;  the opening comment kept", () => {
    const log = [
      "<!-- plan-doc part:  #log's body -->",
      '<epic-event at="2026-10-29T08:00-04:00">Ana 1</epic-event>',
      '<epic-event at="2026-10-29T08:20-04:00"',
      "  >Ana 2</epic-event",
      '><epic-event at="2026-10-29T08:10-04:00">Ben 1</epic-event>',
      '<epic-event at="2026-10-29T08:20-04:00">Ben 2</epic-event>',
      ""
    ].join("\n")
    expect(ContentMerge.sortLog(log)).toBe(
      [
        "<!-- plan-doc part:  #log's body -->",
        '<epic-event at="2026-10-29T08:00-04:00">Ana 1</epic-event>',
        '<epic-event at="2026-10-29T08:10-04:00">Ben 1</epic-event>',
        '<epic-event at="2026-10-29T08:20-04:00"\n  >Ana 2</epic-event\n>',
        '<epic-event at="2026-10-29T08:20-04:00">Ben 2</epic-event>',
        ""
      ].join("\n")
    )
  })

  test("anything but events in it (a broken merge):  left for a person", () => {
    expect(ContentMerge.sortLog('<epic-event at="x">a</epic-event>\n<p>stray</p>\n')).toBeUndefined()
  })
})
