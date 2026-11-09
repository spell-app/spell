import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { getKnownType } from "spell/parser/spell/rules/types"

/**
 * `keeps_no_times` rule:  a saved type does without its `created` and `modified` (epic `data` T57).
 * - e.g. `- it keeps no times`, `a recipe keeps no times`
 * - Every type with a place has those two, by itself:  this is the way to say it doesn't want them.
 * - Compiles to nothing of its own:  `saved_in_place` writes no times for the type.
 */
export class KeepsNoTimes extends SpellStatement<"type"> {
  @proto static alias = "statement"
  @proto static priority = Priority.declaration + 1

  /** SIDE EFFECT:  our type keeps no times -- see `P.TypeScope.declareKeepsNoTimes()`. */
  mutateScope(match: P.MatchFor<this>) {
    getKnownType(match.groups.type).declareKeepsNoTimes(match)
  }

  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    return new P.ASTStatementGroup(match, { statements: [] })
  }
}
