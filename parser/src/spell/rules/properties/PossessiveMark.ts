import { proto } from "spell/util"
import { P } from "spell/parser/parser"

/**
 * `possessive_mark` rule:  the `'s` of a possessive, e.g. in `the character's name` (epic `language`, P16).
 * - An apostrophe, then `s`, touching each other and the word before:  `the character 's name` isn't one.
 * - The curly apostrophe too, as phones and Macs type it:  `the character’s name`.
 * - The tokenizer reads an apostrophe as a symbol of its own:  spell's text is only ever in double quotes.
 */
export class PossessiveMark extends P.Rule {
  @proto static highlightAs: P.HighlightKind = "operator"

  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    return PossessiveMark.isAt(tokens, start, false)
  }

  parse(scope: P.Scope, tokens: P.Token[]) {
    if (!PossessiveMark.isAt(tokens, 0, false)) return undefined
    const mark = tokens.slice(0, 2)
    return new P.Match({ rule: this, matched: mark, raw: "'s", value: "'s", tokens: mark, scope })
  }

  compile(match: P.MatchFor<this>) {
    return match.value
  }

  /**
   * Is there a possessive's `'s` at `index` of `tokens` -- touching the token before it, when `touching`?
   * - Cheap:  a possessive's rules ask it of every token of a line.
   */
  static isAt(tokens: P.Token[], index: number, touching = true): boolean {
    const mark = tokens[index]
    const s = tokens[index + 1]
    if (!(mark instanceof P.SymbolToken) || !APOSTROPHES.has(mark.value)) return false
    if (!(s instanceof P.WordToken) || s.value !== "s" || s.start !== mark.end) return false
    return !touching || tokens[index - 1]?.end === mark.start
  }

  /**
   * Is there a possessive's `'s` in `tokens`, after `start`?  See `isAt()`.
   * - HOT:  every operand of every line asks.  Most lines have none, so it remembers, by a line's last token,
   *   from where it found none:  a later ask of the same line's tail needs no scan.
   */
  static isIn(tokens: P.Token[], start = 0): boolean {
    const last = tokens.at(-1)
    const from = tokens[start + 1]?.start
    if (!last || from === undefined) return false
    if (from >= (NONE_FROM.get(last) ?? Infinity)) return false
    for (let index = start + 1; index < tokens.length - 1; index++) {
      if (PossessiveMark.isAt(tokens, index)) return true
    }
    NONE_FROM.set(last, from)
    return false
  }
}

/** By a line's last token:  where in its text it was scanned from, finding no `'s` up to it -- see `isIn()`. */
const NONE_FROM = new WeakMap<P.Token, number>()

/** The apostrophes a possessive may be written with:  straight, and curly. */
const APOSTROPHES = new Set(["'", "’"])
