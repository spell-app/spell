import { proto } from "spell/util"
import { P } from "spell/parser/parser"

/**
 * `possessive_mark` rule:  the `'s` of a possessive, e.g. in `the character's name` (epic `language`, P16) --
 * or a plural's apostrophe alone, `the cards' names` (T23).
 * - `'s`:  an apostrophe, then `s`, touching each other and the word before:  `the character 's name` isn't one.
 * - An apostrophe alone, touching the word before, with a space after:  `the cards' names`, `the boss' name`.
 *   - Its word must end in `s`:  `the card' name` is still read as one, so `possessive_property` can refuse it,
 *     saying how to write it (`possessive-needs-s`).
 *   - A word touching it after is a contraction, not a possessive:  `doesn't`.
 *   - Nor before a lone `s`:  `the card' s suit` is a typo, which a possessive mustn't read as `s`.
 * - The curly apostrophe too, as phones and Macs type it:  `the character’s name`, `the cards’ names`.
 * - The tokenizer reads an apostrophe as a symbol of its own:  spell's text is only ever in double quotes.
 */
export class PossessiveMark extends P.Rule {
  @proto static highlightAs: P.HighlightKind = "operator"

  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    return PossessiveMark.lengthAt(tokens, start, false) > 0
  }

  /** `'s`, or an apostrophe alone:  `value` says which, as written straight. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const length = PossessiveMark.lengthAt(tokens, 0, false)
    if (!length) return undefined
    const mark = tokens.slice(0, length)
    const value = length === 2 ? "'s" : "'"
    return new P.Match({ rule: this, matched: mark, raw: P.Tokenizer.join(mark), value, tokens: mark, scope })
  }

  compile(match: P.MatchFor<this>) {
    return match.value
  }

  /**
   * Is there a possessive's `'s` -- or apostrophe alone -- at `index` of `tokens`?  See `lengthAt()`.
   * - Cheap:  a possessive's rules ask it of every token of a line.
   */
  static isAt(tokens: P.Token[], index: number, touching = true): boolean {
    return PossessiveMark.lengthAt(tokens, index, touching) > 0
  }

  /**
   * How many tokens a possessive's mark at `index` of `tokens` takes:  2 for `'s`, 1 for an apostrophe alone,
   * 0 for none -- see class docs.
   * - `touching`:  it must touch the token before it, a WORD for an apostrophe alone.
   *   Without, as `parse()` asks, its owner said so (`possessive_owner`).
   */
  static lengthAt(tokens: P.Token[], index: number, touching = true): 0 | 1 | 2 {
    const mark = tokens[index]
    if (!(mark instanceof P.SymbolToken) || !APOSTROPHES.has(mark.value)) return 0
    const before = tokens[index - 1]
    if (touching && before?.end !== mark.start) return 0
    const after = tokens[index + 1]
    const touchesAfter = after?.start === mark.end
    if (after instanceof P.WordToken && after.value === "s" && touchesAfter) return 2
    // a word touching it after:  a contraction, `doesn't`;  a lone `s` after:  a typo;  a plural's, only after a word
    if (touchesAfter || (after instanceof P.WordToken && after.value === "s")) return 0
    if (touching && !(before instanceof P.WordToken)) return 0
    return 1
  }

  /**
   * Is `mark`, a `possessive_mark` match, an apostrophe alone after a word NOT ending in `s`, e.g. `the card' name`?
   * - `owner`:  what it follows.
   */
  static needsS(owner: P.Match, mark: P.Match): boolean {
    if (mark.value !== "'") return false
    const word = owner.tokens.at(-1)
    return !(word instanceof P.WordToken && /s$/i.test(`${word.value}`))
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
