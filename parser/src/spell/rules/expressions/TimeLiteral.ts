import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SpellExpression, type SpellExpressionProps } from "./SpellExpression"

/** `9am`'s `am` or `pm`, any case. */
const MERIDIEM = /^(am|pm)$/i
/** `9pm`'s `pm`:  12 hours on. */
const AFTER_NOON = /^pm$/i

/** A time's minutes, two digits:  `9:05`, not `9:5`. */
const TWO_DIGITS = /^\d\d$/

/**
 * `time_literal` rule:  a time today, written as people write it -- `9am`, `9:30am`, `9 am`, `9:30 PM`, any case;
 * `if now is after 9am` (epic `language` J252).
 * - Compiles to `core.todayAt(21, 30)` for `9:30 PM`:  a date, today, at that time.
 * - `12am` is midnight, `12pm` noon.
 * - The `:` and the minutes touch the hour:  `9:30`, never `9 : 30`.
 * - A 24-hour time, `21:30`, only where the language says so (`clock24`, Spanish's):  English `9:30` alone could be
 *   morning or evening.
 * - No clash with a measure:  `am` and `pm` are no unit's names, and `9m` stays 9 meters.
 */
export class TimeLiteral extends SpellExpression {
  @proto static datatype = "date"
  @proto static highlightAs: P.HighlightKind = "number"
  /** Does a time with no `am` or `pm` read as a 24-hour time, `21:30`? */
  @proto static clock24 = false
  declare clock24: boolean
  /** TYPE-ONLY:  `specialize()` takes `clock24` too. */
  declare readonly Props: TimeLiteralProps

  /** Quick test:  a whole number, then `:` or a word. */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    const [hour, next] = [tokens[start], tokens[start + 1]]
    if (!(hour instanceof P.NumberToken) || !Number.isInteger(hour.value) || !next) return false
    return `${next.value}` === ":" || MERIDIEM.test(`${next.value}`)
  }

  /** The hour, its minutes, its `am` or `pm` -- see class docs. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    if (this.test(scope, tokens) === false) return undefined
    const [hourToken, colon, minuteToken] = tokens as [P.NumberToken, P.Token | undefined, P.Token | undefined]
    let [hour, minute, at] = [hourToken.value, 0, 1]
    const hasMinutes =
      `${colon?.value}` === ":" &&
      minuteToken instanceof P.NumberToken &&
      TWO_DIGITS.test(`${minuteToken.raw}`) &&
      hourToken.end === colon!.start &&
      colon!.end === minuteToken.start
    if (hasMinutes) [minute, at] = [minuteToken.value, 3]
    if (minute > 59) return undefined
    const said = tokens[at]
    if (said instanceof P.WordToken && MERIDIEM.test(`${said.value}`)) {
      if (hour < 1 || hour > 12) return undefined
      hour = (hour % 12) + (AFTER_NOON.test(`${said.value}`) ? 12 : 0)
      at++
    } else if (!(hasMinutes && this.clock24 && hour <= 23)) {
      return undefined
    }
    const matched = tokens.slice(0, at)
    return new P.Match({
      rule: this,
      matched,
      raw: matched.map((token) => token.raw ?? token.value).join(""),
      value: [hour, minute],
      tokens: matched,
      scope
    })
  }

  getAST(match: P.MatchFor<this>) {
    const [hour, minute] = match.value as [number, number]
    const number = (value: number) => new P.ASTNumericLiteral(match, { value })
    const args = minute ? [number(hour), number(minute)] : [number(hour)]
    return new P.ASTCoreMethodInvocation(match, { datatype: "date", methodName: "todayAt", args })
  }
}

/** What `time_literal` is registered with:  a `SpellExpression`'s, and `clock24`. */
export type TimeLiteralProps = SpellExpressionProps & { clock24?: boolean }
