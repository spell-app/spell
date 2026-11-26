import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { PostfixOperatorSuffix, Precedence, SuffixLeft, type OperatorOperands } from "spell/parser/spell/rules/expressions"
import { isItemScope } from "./lists.shared"

/** What `, sorted here` notes on the sort it follows (`ListSortedHere`):  it's meant to be done on the Spell server. */
export type SortedHereData = { sortedHere?: boolean }

/**
 * `list_sorted_here` rule:  a read of a place sorted on the Spell server, when its server can't sort it that way.
 * - e.g. `every measurement, sorted by completion, oldest first, sorted here`;  Spanish `, ordenado aquí`
 * - It reads every row, and sorts them:  so a read says it means to (`ListSortedBy`), as `, filtered here` does for
 *   a `where` (`ListFilteredHere`).
 * - Compiles to the list as it is:  the sort still goes in the read's question, and what the place doesn't do, the
 *   Spell server does, over every page (`PlaceQuery`).
 * - A postfix suffix, as `, sorted by ...` is.
 */
export class ListSortedHere extends PostfixOperatorSuffix {
  @proto static precedence = Precedence.ternary
  @proto static datatype: P.Datatype | undefined = undefined
  /** The same list. */
  @proto static handsOnItsLeft = true

  /** Not inside a predicate or a key;  SIDE EFFECT:  the sort it follows notes it, for its errors. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    if (isItemScope(scope)) return undefined
    const match = super.parse(scope, tokens)
    if (!match) return undefined
    const left = SuffixLeft.current
    if (left) for (const sort of sortsIn(left)) (sort.data as SortedHereData).sortedHere = true
    return match
  }

  /** The same list. */
  getResultDatatype(_match: P.MatchFor<this>, lhs: P.Datatype | undefined): P.Datatype | undefined {
    return lhs
  }

  compileASTExpression(_match: P.MatchFor<this>, { lhs }: OperatorOperands): P.ASTExpression {
    return lhs!
  }
}

/** The sorts in `left`, a few steps down:  what the suffix follows, through a `, filtered here`. */
function sortsIn(left: P.Match, depth = 3): P.Match[] {
  if (left.rule.name === "list_sorted_by") return [left]
  if (!depth) return []
  return left.matched.flatMap((item) => (item instanceof P.Match ? sortsIn(item, depth - 1) : []))
}
