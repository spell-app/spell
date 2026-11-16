import { describe, expect, test } from "vite-plus/test"

import { LSP } from "spell/app/lsp"

/** `line`, its caret at `|` taken out:  the text and the caret's offset. */
function caret(line: string): [string, number] {
  return [line.replace("|", ""), line.indexOf("|")]
}

/** The value the caret `|` of `line` is in, as its own text and kind. */
function valueAt(line: string): string | undefined {
  const [text, offset] = caret(line)
  const value = LSP.CodeOrText.valueAt(text, offset)
  return value && `${value.kind} ${text.slice(value.start, value.end)}`
}

/** `typed` at the caret `|` of `line`:  the line it makes, or `undefined` when it's typed as itself. */
function typing(line: string, typed: string): string | undefined {
  const [text, offset] = caret(line)
  const result = LSP.CodeOrText.typing(text, offset, typed)
  return result && text.slice(0, result.value.start) + result.switched + text.slice(result.value.end)
}

describe("CodeOrText", () => {
  test("the attribute value the caret is in, between its quotes or its braces;  its ends included", () => {
    expect(valueAt('<text color="bl|ue">')).toBe('text "blue"')
    expect(valueAt('<text color="|blue">')).toBe('text "blue"')
    expect(valueAt('<text color="blue|">')).toBe('text "blue"')
    expect(valueAt('<button onClick={say "hi"} padding={its |size} />')).toBe("code {its size}")
    expect(valueAt('<button onClick={say "h|i"} />')).toBe('code {say "hi"}')
    expect(valueAt('<container\n\tcolumns="7"\n\tspacing="x|s">')).toBe('text "xs"')
  })

  test("nowhere else:  outside its quotes, a tag's quoted word, between tags, a Spell line", () => {
    expect(valueAt('<text |color="blue">')).toBeUndefined()
    expect(valueAt('<text color="blue"|>')).toBeUndefined()
    expect(valueAt('<action "re|do" />')).toBeUndefined()
    expect(valueAt('<text color="blue">{its |size}</text>')).toBeUndefined()
    expect(valueAt('its "si|ze" is "small"')).toBeUndefined()
    // a `{` with no `}` on its line:  not code yet
    expect(valueAt('<text padding={sm|all spacing="xs">')).toBeUndefined()
  })

  test("switched:  the same words, in braces or in quotes;  not when its words hold a brace, or code a quote", () => {
    const switched = (line: string) => {
      const [text, offset] = caret(line)
      return LSP.CodeOrText.switched(text, LSP.CodeOrText.valueAt(text, offset)!)
    }
    expect(switched('<text color="bl|ue">')).toBe("{blue}")
    expect(switched("<text color={its |color}>")).toBe('"its color"')
    expect(switched('<button onClick={say "h|i"} />')).toBeUndefined()
  })

  test("typing:  a `{` anywhere in a quoted value makes it code;  a `\"` right after a code value's `{` makes it text", () => {
    expect(typing('<text color="bl|ue">', "{")).toBe("<text color={blue}>")
    expect(typing('<text color="|">', "{")).toBe("<text color={}>")
    expect(typing("<text color={|its color}>", '"')).toBe('<text color="its color">')
    // further in, a `"` starts a string in the code
    expect(typing("<button onClick={say |} />", '"')).toBeUndefined()
    // anything else is typed as itself
    expect(typing('<text color="bl|ue">', '"')).toBeUndefined()
    expect(typing("<text color={its |color}>", "{")).toBeUndefined()
    expect(typing('its "si|ze" is "small"', "{")).toBeUndefined()
  })
})
