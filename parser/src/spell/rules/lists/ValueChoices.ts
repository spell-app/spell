import { P } from "spell-lang/parser"
import { IdentifierList } from "./IdentifierList"

/**
 * `value_choices` rule:  two or more KNOWN values joined by `or`, e.g. `diamonds or hearts`, `jack, queen or king`
 * -- for `it is diamonds or hearts` (`is_in`):  the same as `it is one of diamonds or hearts`.
 * - Only known constants and numbers:  `x is red or y is 2` stays two comparisons.
 * - The last item must come after an `or`:  the delimiter in the syntax's `or` group, e.g. `(,|(or:or))`.
 *   So it never reads the word, and a translation brings its own, e.g. `(,|(or:o|u))`.
 * - Fixes `its suit is diamonds or hearts`, which compiled to `(this.suit == 'diamonds') || 'hearts'`:
 *   always true (epic page `outline-spell`, P2;  was `agents/SUSPECTED-BUGS.md`).
 */
export class ValueChoices extends IdentifierList {
  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens)
    if (!match || match.items.length < 2) return undefined
    // `matched` holds the delimiters too:  the one before the last item
    const lastDelimiter = match.matched[match.matched.indexOf(match.items.at(-1)!) - 1]
    return lastDelimiter instanceof P.Match && lastDelimiter.name === "or" ? match : undefined
  }
}
