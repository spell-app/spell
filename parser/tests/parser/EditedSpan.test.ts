import { describe, test, expect } from "vite-plus/test"

import { P } from "spell/parser/parser"

/** `text` with `from`..`to` replaced by `insert`, and its span. */
function edit(text: string, from: number, to: number, insert: string) {
  return { text: text.slice(0, from) + insert + text.slice(to), span: { from, to, toNew: from + insert.length } }
}

/** Is `span` right for `before` => `after`:  the texts the same outside it? */
function covers(span: P.EditedSpan, before: string, after: string): boolean {
  return before.slice(0, span.from) === after.slice(0, span.from) && before.slice(span.to) === after.slice(span.toNew)
}

describe("P.EditedSpan", () => {
  test("between():  the narrowest span", () => {
    expect(P.EditedSpan.between("abcdef", "abXdef")).toEqual({ from: 2, to: 3, toNew: 3 })
    expect(P.EditedSpan.between("abc", "abc")).toEqual({ from: 3, to: 3, toNew: 3 })
    expect(P.EditedSpan.between("aaa", "aaaa")).toEqual({ from: 3, to: 3, toNew: 4 })
    expect(P.EditedSpan.between("abc", "")).toEqual({ from: 0, to: 3, toNew: 0 })
  })

  test("joined():  one span for edits in a row, in the first text's offsets", () => {
    const start = "one\ntwo\nthree\nfour\n"
    const cases: Array<Array<[number, number, string]>> = [
      [
        [4, 4, "x"],
        [5, 5, "y"]
      ],
      [
        [14, 18, "FOUR"],
        [0, 3, "ONE"]
      ],
      [
        [0, 3, "ONE"],
        [14, 18, "4"]
      ],
      [
        [4, 7, ""],
        [4, 4, "2\n2"]
      ],
      [
        [8, 13, "3"],
        [7, 10, "--"]
      ],
      [
        [2, 2, "abcdef"],
        [3, 5, ""]
      ]
    ]
    for (const steps of cases) {
      let text = start
      let span: P.EditedSpan | undefined
      for (const [from, to, insert] of steps) {
        const edited = edit(text, from, to, insert)
        span = P.EditedSpan.joined(span, edited.span)
        text = edited.text
      }
      expect(P.EditedSpan.fits(span, start, text), JSON.stringify(steps)).toBe(true)
      expect(covers(span!, start, text), JSON.stringify(steps)).toBe(true)
    }
  })

  test("fits():  a span left over from other texts doesn't", () => {
    expect(P.EditedSpan.fits({ from: 1, to: 2, toNew: 3 }, "abc", "abXc")).toBe(true)
    expect(P.EditedSpan.fits({ from: 1, to: 2, toNew: 2 }, "abc", "abXc")).toBe(false)
    expect(P.EditedSpan.fits({ from: 1, to: 9, toNew: 10 }, "abc", "abXc")).toBe(false)
    expect(P.EditedSpan.fits(undefined, "abc", "abc")).toBe(false)
  })

  test("changesOneLine():  the same with a span as without", () => {
    const before = "a\n\tb\n\tc\nd"
    for (const after of [
      "a\n\tbx\n\tc\nd",
      "a\n\tb\nd",
      "a\n\tb\n\tb\n\tc\nd",
      "A\n\tB\n\tc\nd",
      before,
      "a\n\tb\n\tc\ndd"
    ]) {
      const span = P.EditedSpan.between(before, after)
      expect(P.EditedSpan.changesOneLine(before, after, span), after).toBe(P.EditedSpan.changesOneLine(before, after))
    }
  })
})
