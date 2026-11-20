import { describe, expect, test } from "vite-plus/test"

import { LSP } from "spell/app/lsp"

const { SpellTyping } = LSP

/** What `quotedValueAt()` finds in `line`, the caret at its `|`:  the value's text, or `undefined`. */
function valueAt(line: string, end?: LSP.QuotedValueEnd, after?: LSP.QuotedValueAfter): string | undefined {
  const column = line.indexOf("|")
  const text = line.replace("|", "")
  const found = SpellTyping.quotedValueAt(text, column, end, after)
  return found && text.slice(found.from, found.to)
}

/**
 * The attribute value at the caret (`SpellTyping.quotedValueAt()`):  what both editors' choices strip and picker
 * take as the value, from its line and the caret's column.
 */
describe("SpellTyping.quotedValueAt()", () => {
  test("the caret anywhere in a value, its quotes' text", () => {
    expect(valueAt(`\t<container spacing="x|s">`)).toBe("xs")
    expect(valueAt(`\t<container spacing="|xs">`)).toBe("xs")
    expect(valueAt(`\t<container spacing="xs|">`)).toBe("xs")
    expect(valueAt(`\t<text color="|">Hi</text>`)).toBe("")
  })

  test("the columns, inside the quotes", () => {
    expect(SpellTyping.quotedValueAt(`<container spacing="xs">`, 21)).toEqual({ from: 20, to: 22 })
  })

  test("the value the caret is in, of several on the line", () => {
    expect(valueAt(`<text color="red" size="l|g">`)).toBe("lg")
    expect(valueAt(`<text color="r|ed" size="lg">`)).toBe("red")
  })

  test("outside a value:  none", () => {
    expect(valueAt(`<text color="red"| size="lg">`)).toBeUndefined()
    expect(valueAt(`<te|xt color="red">`)).toBeUndefined()
    expect(valueAt(`<text color={r|ed}>`)).toBeUndefined()
  })

  test("a quoted name isn't a value:  no attribute's `name=` before it", () => {
    expect(valueAt(`\tgroup "Ra|nk"`)).toBeUndefined()
    expect(valueAt(`\t<action "auto| play" />`)).toBeUndefined()
  })

  test("no closing quote:  none, unless the value may run to the caret (the picker's)", () => {
    expect(valueAt(`<text color="re|`)).toBeUndefined()
    expect(valueAt(`<text color="re|`, "closing-quote-or-caret")).toBe("re")
    expect(valueAt(`<text color="re|d"`, "closing-quote-or-caret")).toBe("red")
  })

  test("after a word, the sound picker's:  `play \"card s|\"`, though no attribute's (epic `mockup` P28)", () => {
    expect(valueAt(`\t\tplay "cli|ck"`, "closing-quote-or-caret", "word")).toBe("click")
    expect(valueAt(`\t\treproducir "deslizar c|`, "closing-quote-or-caret", "word")).toBe("deslizar c")
    expect(valueAt(`\t\tplay "cli|ck"`, "closing-quote-or-caret")).toBeUndefined()
    expect(valueAt(`\t\tplay "click"|`, "closing-quote-or-caret", "word")).toBeUndefined()
  })
})
