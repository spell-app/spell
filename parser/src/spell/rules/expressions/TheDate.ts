import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellExpression } from "./SpellExpression"
import { Wording } from "./Wording"

/**
 * `the_date` rule:  today's date or the time now, as text, the way HyperTalk says them.
 * - e.g. `the date` => `core.shortDate(core.now())`:  `11/7/26`
 *   - `the long date`:  `Saturday, November 7, 2026`;  `the abbreviated date` (`abbrev`, `abbr`):  `Sat, Nov 7, 2026`
 *   - `the time`:  `9:14 AM`;  `the long time`:  `9:14:42 AM`
 *   - `the timestamp`:  ISO 8601, in UTC, `2026-11-07T17:14:42.000Z`
 *   - `the time zone`, the person's:  `New York`;  `the short time zone`:  `EST`, or `GMT-5` where the browser has no
 *     letters for it;  `the long time zone`:  `Eastern Standard Time` (epic `language` P63) -- `core.timeZone("city")`
 * - Each in the program's language, the person's region and clock:  `17/11` in Spain, `21:14` on a 24-hour clock.
 * - A program's own `date` or `time` wins:  a thing's `the time` is its property (`Priority.overridable`).
 * - The date itself, to keep or work with:  `now` (`now` rule).
 */
export class TheDate extends SpellExpression<"form?|what"> {
  @proto static datatype = "text"
  @proto static priority = Priority.overridable

  getAST(match: P.MatchFor<this>) {
    const form = Wording.meaningOf(match.groups.form) ?? "short"
    const what = Wording.meaningOf(match.groups.what)
    if (what === "time_zone") {
      const said = match.groups.form ? (form === "long" ? "long" : "short") : "city"
      const args = [new P.ASTStringLiteral(match, { value: said, quote: '"' })]
      return new P.ASTCoreMethodInvocation(match, { datatype: "text", methodName: "timeZone", args })
    }
    const methodName =
      what === "timestamp"
        ? "timestamp"
        : what === "time"
          ? form === "long"
            ? "longTime"
            : "shortTime"
          : DATE_METHODS[form]!
    const now = new P.ASTCoreMethodInvocation(match, { datatype: "date", methodName: "now" })
    return new P.ASTCoreMethodInvocation(match, { datatype: "text", methodName, args: [now] })
  }
}

/** A `date_form`'s meaning => the `core` method that says a date that way. */
const DATE_METHODS: Record<string, string> = { short: "shortDate", long: "longDate", abbreviated: "abbreviatedDate" }
