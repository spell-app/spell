import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { getKnownType } from "spell/parser/spell/rules/types"
// Import directly to avoid circular import
import { SpellExpression } from "spell/parser/spell/rules/expressions"

/**
 * `thing_by_id` rule:  one thing of a saved type, by its id, a number (epic `data` P50, Q77, Q91).
 * - e.g. `complete job 7151`:  job 7151 is read first, unless it's held, then completed.
 * - Spanish:  `completar trabajo 7151`.
 * - Held already:  that one, as it is;  to be sure of a fresh copy, read it first (`reload ...`).
 * - The place has none:  every action called on it runs only its failure steps, with "not found"
 *   (`core.savedThingOrMissing()`), so `if completing a job fails` hears of it.
 * - Only a saved type's:  another type's `tableau 1` reads as nothing here.
 * - `the job whose id is 7151` (`thing_with_id`) reads one too, nothing if there's none.
 */
export class ThingById extends SpellExpression<"type|id"> {
  @proto static priority = Priority.specific

  /** Only a saved type's:  see the class docs. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    return getKnownType(match.groups.type).savedPlace() ? match : undefined
  }

  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    return SP.typeName(`${match.groups.type.value}`)
  }

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { type, id } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "savedThingOrMissing",
      args: [P.matchAST<P.ASTTypeExpression>(type), P.matchAST(id)]
    })
  }
}
