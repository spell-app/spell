/****************
 * ### `CodeOrText`
 * A drawing's attribute value switched between TEXT, `color="blue"`, and CODE, `color={its color}`
 * (epic `editor` T74):  the same words, their two quotes turned into braces or back.
 * - Two ways in, which agree because both ask this class:
 *   - typing:  a `{` typed inside a quoted value makes it code;  a `"` typed right after a code value's `{` makes it
 *     text (the app's typing helps, `CodeOrTextTyping`)
 *   - the right-click menu and the light bulb:  "Make it code" / "Make it text" on the value the caret is in
 *     (`SpellLanguageService.codeActions()`), so VS Code has them too
 * - Only an attribute's value, after its `=`:  not a tag's quoted word (`<action "redo" />`), and not the words
 *   between tags, which have no quotes to turn.
 * - Plain functions of the text:  no parse, so it works on a tag half typed.
 ****************/
export class CodeOrText {
  /**
   * The attribute value `offset` (0-based, into `text`) is inside, between its quotes or its braces;
   * `undefined` anywhere else.
   * - `start`:  its `"` or `{`;  `end`:  just past its `"` or `}`.
   * - A value on one line:  a `{` with no `}` on its line (typed half way) isn't code yet.
   */
  static valueAt(text: string, offset: number): SwitchableValue | undefined {
    const tagStart = text.lastIndexOf("<", offset - 1)
    if (tagStart < 0 || offset - tagStart > TAG_REACH) return undefined
    const name = TAG_NAME.exec(text.slice(tagStart))
    if (!name) return undefined
    let at = tagStart + name[0].length
    while (at < offset) {
      const char = text[at]!
      if (char === ">" || char === "<") return undefined
      if (char !== "=") {
        // a tag's quoted word, `<action "redo" />`:  not a value, but stepped over whole
        if (char === '"') at = closingQuote(text, at) ?? text.length
        at++
        continue
      }
      const start = at + 1 + /^[ \t]*/.exec(text.slice(at + 1))![0].length
      const opener = text[start]
      const end = opener === '"' ? closingQuote(text, start) : opener === "{" ? closingBrace(text, start) : undefined
      if (end === undefined) {
        at = start
        continue
      }
      if (offset > start && offset <= end) return { kind: opener === '"' ? "text" : "code", start, end: end + 1 }
      at = end + 1
    }
    return undefined
  }

  /**
   * `value` of `text` switched:  text's words in braces, code's in quotes;  `undefined` when its words can't be:
   * text with a brace in it, code with a quote or a brace in it.
   */
  static switched(text: string, { kind, start, end }: SwitchableValue): string | undefined {
    const words = text.slice(start + 1, end - 1)
    if (kind === "text") return /[{}]/.test(words) ? undefined : `{${words}}`
    return /["{}]/.test(words) ? undefined : `"${words}"`
  }

  /**
   * What a `typed` character does at `offset` of `text` (the text BEFORE it was typed):  the value it switches,
   * and that value switched;  `undefined` when it's typed as any other character is.
   * - `{` anywhere inside a quoted value:  it becomes code.
   * - `"` right after a code value's `{`, where its opening quote would go:  it becomes text.
   *   Not further in:  a `"` there starts a string in the code, `{say "hi"}`.
   */
  static typing(text: string, offset: number, typed: string): { value: SwitchableValue; switched: string } | undefined {
    if (typed !== "{" && typed !== '"') return undefined
    const value = CodeOrText.valueAt(text, offset)
    if (!value) return undefined
    if (typed === "{" ? value.kind !== "text" : value.kind !== "code" || offset !== value.start + 1) return undefined
    const switched = CodeOrText.switched(text, value)
    return switched === undefined ? undefined : { value, switched }
  }
}

/** An attribute's value, text or code:  where it is in its text. */
export type SwitchableValue = {
  /** `"text"`, `color="blue"`;  or `"code"`, `color={its color}` */
  kind: "text" | "code"
  /** where its `"` or `{` is */
  start: number
  /** just past its closing `"` or `}` */
  end: number
}

/** How far back `CodeOrText.valueAt()` looks for its tag's `<`. */
const TAG_REACH = 4000

/** A tag's `<` and its name:  `<container`, `<ui-button`;  never a closing tag's `</`. */
const TAG_NAME = /^<[\p{L}][\p{L}\p{M}\d_.:-]*/u

/** Where the `"` closing the one at `start` is, on its line;  `undefined` if none. */
function closingQuote(text: string, start: number): number | undefined {
  for (let at = start + 1; at < text.length; at++) {
    if (text[at] === '"') return at
    if (text[at] === "\n") return undefined
  }
  return undefined
}

/**
 * Where the `}` closing the `{` at `start` is, on its line, past a `{…}` or `"…"` inside it, as the bubbly layout
 * reads code (`SP.BubblyLayout`);  `undefined` if none.
 */
function closingBrace(text: string, start: number): number | undefined {
  let depth = 0
  for (let at = start; at < text.length; at++) {
    const char = text[at]!
    if (char === "\n") return undefined
    if (char === '"') {
      const close = closingQuote(text, at)
      if (close === undefined) return undefined
      at = close
    } else if (char === "{") depth++
    else if (char === "}" && --depth === 0) return at
  }
  return undefined
}
