import { describe, test, expect } from "vite-plus/test"

import { P } from "spell-parser/parser"

describe("P.offsetForPosition()", () => {
  const text = "one\ntwo\n\nfour"
  const lineStarts = P.getLineStarts(text)

  test("`positionForOffset()` the other way round", () => {
    for (let offset = 0; offset <= text.length; offset++) {
      expect(P.offsetForPosition(lineStarts, P.positionForOffset(lineStarts, offset), text.length)).toBe(offset)
    }
  })

  test("a `ch` past its line's end:  the line's end;  a `line` past the last:  the text's end", () => {
    expect(P.offsetForPosition(lineStarts, { line: 0, ch: 99 }, text.length)).toBe(3)
    expect(P.offsetForPosition(lineStarts, { line: 2, ch: 5 }, text.length)).toBe(8)
    expect(P.offsetForPosition(lineStarts, { line: 3, ch: 99 }, text.length)).toBe(text.length)
    expect(P.offsetForPosition(lineStarts, { line: 9, ch: 0 }, text.length)).toBe(text.length)
  })
})
