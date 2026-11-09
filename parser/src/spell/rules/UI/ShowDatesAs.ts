import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Wording } from "spell/parser/spell/rules/expressions"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `show_dates_as` rule:  how the program shows every date it draws or joins to text, from then on.
 * - e.g. `dates are shown as short dates` => `core.showDatesAs("short")`:  `{its time}` draws `11/7/26`
 *   - `long dates`, `abbreviated dates`, `dates and times`, `timestamps`, `plain dates` (`November 7, 2026`, as at first)
 *   - `dates are shown as the reader's`:  as the reader's own browser says a date, `7 nov 2026` in Spain
 * - A date said one way on purpose keeps it:  `its time as a long date`, `the short date of its time`.
 */
export class ShowDatesAs extends SpellStatement<"style"> {
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>) {
    const style = new P.ASTStringLiteral(match, { value: Wording.meaningOf(match.groups.style)!.replace(/_/g, " "), quote: '"' })
    return new P.ASTCoreMethodInvocation(match, { methodName: "showDatesAs", args: [style] })
  }
}
