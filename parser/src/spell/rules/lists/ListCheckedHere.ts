import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import {
  PostfixOperatorSuffix,
  Precedence,
  SuffixLeft,
  type OperatorOperands
} from "spell/parser/spell/rules/expressions"
import { EveryThing } from "spell/parser/spell/rules/classes/EveryThing"
import type { CheckedHereData } from "spell/parser/spell/rules/classes/EveryThingWhere"
import { isItemScope } from "./lists.shared"

/**
 * `list_checked_here` rule:  a read of a place whose `where` is checked here, in the page, all of it:
 * nothing of it is asked of the place.
 * - e.g. `every job where its session id is the session's id, checked here`;  Spanish `, filtrando aquí`
 * - For when the place's own filter isn't what's meant:  it matches ids exactly, or capitals its own way;
 *   or the list is small, and one read beats many.
 * - So it reads every page, and its `where` warns of nothing (`EveryThingWhere.warnAboutWhere()`);  after a sort
 *   too, `, sorted by its title, checked here`, and after `there are ... where`.
 * - Compiles to the read made again with nothing handed over (`EveryThing.checkedHereAST()`):
 *   `core.filter(await core.savedThings(Job, {}, "looks through"), (job) => ...)`.
 * - After anything else, the list as it is:  a list in memory is always checked here.
 * - A postfix suffix, as `, sorted by ...` is:  not inside a `where`, whose comma it would take.
 */
export class ListCheckedHere extends PostfixOperatorSuffix {
  @proto static precedence = Precedence.ternary
  @proto static datatype: P.Datatype | undefined = undefined
  /** The same list:  `, sorted by its created at` after it knows its items. */
  @proto static handsOnItsLeft = true

  /** Not inside a predicate or a key;  SIDE EFFECT:  the read it follows notes it, for its warnings. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    if (isItemScope(scope)) return undefined
    const match = super.parse(scope, tokens)
    if (!match) return undefined
    const left = SuffixLeft.current
    if (left) for (const read of readsIn(left)) (read.data as CheckedHereData).checkedHere = true
    return match
  }

  /** The same list:  only where it's checked changes. */
  getResultDatatype(_match: P.MatchFor<this>, lhs: P.Datatype | undefined): P.Datatype | undefined {
    return lhs
  }

  compileASTExpression(match: P.MatchFor<this>, { lhs }: OperatorOperands): P.ASTExpression {
    return EveryThing.checkedHereAST(match as P.Match, lhs!) ?? lhs!
  }
}

/** The matches in `left`, a few steps down, of a read with a `where`:  what the suffix follows. */
function readsIn(left: P.Match, depth = 3): P.Match[] {
  if (/^(?:every_thing_where|first_few_where|first_thing_where|there_are_things)$/.test(left.rule.name ?? ""))
    return [left]
  if (!depth) return []
  return left.matched.flatMap((item) => (item instanceof P.Match ? readsIn(item, depth - 1) : []))
}
