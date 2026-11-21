import { describe, test, expect } from "vite-plus/test"

import { PY } from "spell/parser/py"
import { SP, spellParser } from "spell/parser/spell"

/** `text` with every old line-end note moved under its line, as `spell lint --fix` does. */
function moved(text: string): string {
  const block = spellParser.getScope("line-end-comments").parse(text, "block")!
  const edits = SP.LineEndComments.in(block.tokens).flatMap((comment) => SP.LineEndComments.moved(text, comment))
  edits.sort((one, other) => other.start - one.start)
  return edits.reduce((result, { start, end, newText }) => result.slice(0, start) + newText + result.slice(end), text)
}

/** The warnings parsing `text` notes. */
function warningsIn(text: string): string[] {
  const block = spellParser.getScope("line-end-comments-warned").parse(text, "block")!
  return SP.SpellWarnings.in(block).map(({ at, message }) => `${at.inputText}:  ${message}`)
}

describe("LineEndComments:  a note after a line's code, `// ...`, the old way (epic `language` T166)", () => {
  test("a declaration's note moves to the first line inside it, as `--`:  its description", () => {
    expect(moved('a card is a thing\n\tits "address" is text  // an address\n\tits "n" is a number\n')).toBe(
      'a card is a thing\n\tits "address" is text\n\t\t-- an address\n\tits "n" is a number\n'
    )
  })

  test("a line with lines under it:  the note is the first of them, at their indent", () => {
    expect(moved("to play  // the whole turn\n\tset x to 1\n")).toBe("to play\n\t-- the whole turn\n\tset x to 1\n")
  })

  test("a step's note goes under it too;  the last line of a file without a line break", () => {
    expect(moved("to play\n\tset x to 1 // so it runs")).toBe("to play\n\tset x to 1\n\t\t-- so it runs")
  })

  test("NOT a `--` at a line's end, a note on its own line, nor a `//` in text", () => {
    const text = 'to draw its placeholder  -- a grey ace\n\t// a step\n\tset x to "a // b"\n'
    expect(moved(text)).toBe(text)
  })

  test("the note compiles as it did:  a declaration's description", () => {
    const compile = (text: string) => spellParser.getScope("line-end-compile").parse(text, "block")!.compile()
    const before = 'a card is a thing\n\tits "hint" is text  // said beside\n'
    expect(compile(moved(before))).toContain("/** said beside */")
    expect(compile(before)).toContain("/** said beside */")
  })

  test("Python carries it the same:  the note, as the field's description", () => {
    const python = (text: string) =>
      String(PY.PyWriter.instance.writeMatch(spellParser.getScope("line-end-py").parse(text, "block")!))
    const before = 'a card is a thing\n\tits "hint" is text  // said beside\n'
    expect(python(before)).toMatch(/# said beside\n\s*# - its "hint" is text\n/)
    expect(python(moved(before))).toMatch(/# said beside\n\s*# - its "hint" is text\n\s*# {3}-- said beside\n/)
  })

  test("a warning on each, saying what to do", () => {
    expect(warningsIn("to play\n\tset x to 1  // so it runs\n\t// a step\n")).toEqual([
      '// so it runs:  This note uses the old style:  it starts with "//" and sits after the code.  ' +
        'Notes now go on the line under the code, and start with "--".  ' +
        "Spell 0.9 changed this.  Your program still runs, but this line will give an error from Spell 1.0 on, so it's best to fix it now."
    ])
  })
})
