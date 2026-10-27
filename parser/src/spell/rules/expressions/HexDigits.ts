import { NONE } from "spell/util"
import { P } from "spell/parser/parser"

/** Hex digits, and nothing else. */
const HEX_DIGITS = /^[0-9a-f]+$/i

/**
 * `hex_digits` rule:  a number written in hex, e.g. `1F0A0`, `ff`, `A0` -- the digits of `hex 1F0A0`.
 * - Its digits written together:  `1F0A0` is a number token and a word token, side by side, joined here.
 * - Not a known variable:  `hex A0` reads the variable `A0` if there is one.
 * - Up to the biggest whole number javascript holds exactly (`Number.MAX_SAFE_INTEGER`).
 * - Its match's `value` is the number, its `raw` the digits as written.
 * - A sub-class takes fewer numbers by `accepts()`, e.g. `unicode_code`, a code point.
 */
export class HexDigits extends P.Pattern {
  constructor(props?: Partial<P.PatternProps>) {
    super({ pattern: /^[0-9a-z]+$/i, ...props })
  }

  /** Quick test:  a number or word first. */
  test(_scope: P.Scope, tokens: P.Token[], start = 0) {
    const first = tokens[start]
    return first instanceof P.NumberToken || first instanceof P.WordToken
  }

  /** The hex digits, as one number -- see the class docstring. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    let length = 0
    let digits = ""
    for (const token of tokens) {
      if (!(token instanceof P.NumberToken || token instanceof P.WordToken)) break
      // written together:  a token's `whitespace` is what comes AFTER it, so the one before must have none
      if (length && tokens[length - 1]!.whitespace) break
      digits += `${token.raw}`
      length++
    }
    if (!length || !HEX_DIGITS.test(digits)) return undefined
    const value = Number.parseInt(digits, 16)
    if (!this.accepts(value, digits)) return undefined
    if (length === 1 && tokens[0] instanceof P.WordToken && (scope.variables?.get(digits) ?? NONE) !== NONE)
      return undefined
    const taken = tokens.slice(0, length)
    return new P.Match({ rule: this, matched: taken, raw: digits, value, tokens: taken, scope })
  }

  /** Do we take `value`, written as hex `digits`?  Any whole number javascript holds exactly. */
  accepts(value: number, digits: string): boolean {
    return Number.isSafeInteger(value)
  }
}
