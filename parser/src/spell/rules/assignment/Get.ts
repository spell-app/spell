import { proto } from "spell/util"
import { P } from "spell-parser/parser"
import { NewThing } from "spell-parser/spell/rules/classes"
// Import directly to avoid circular import
import { SpellStatement } from "spell-parser/spell/rules/Statement"
import { AssignmentStatement } from "./AssignmentStatement"

/**
 * `get` rule:  `get {value}` -- assign `value` to a NEW `it`.
 * - e.g. `get thing`
 * - SIDE EFFECT: `mutateScope()` declares that `it`:  plain `it` the first time, then `it_2`, `it_3`...
 *   so a callback which captured an earlier `it` keeps it -- see `AssignmentStatement.declareIt()`.
 * - Compiles to `let it = value`, `let it_2 = value`, ...
 */
export class Get extends SpellStatement<"value", GetMatchData> {
  @proto static alias = ["assignment", "statement"]
  @proto static changesScope: P.ScopeChanges = "internal"

  /**
   * Declare a new `it`, holding what `value` is -- see `AssignmentStatement.declareIt()`.
   * - And count a new thing's name given in so many words -- see `NewThing.noteNameGiven()`.
   */
  mutateScope(match: P.MatchFor<this>) {
    // `match.scope` is typed as `P.Scope`, whose `.variables` getter can be `undefined` -- we know it's a block.
    const scope = match.scope as P.BlockScope
    match.data.itVar = AssignmentStatement.declareIt(scope, match, match.groups.value.datatype)
    // `get a new foundation with name = "clubs"`:  for `foundation "clubs"`'s warning -- see `NewThing.noteNameGiven()`
    NewThing.noteNameGiven(match.groups.value, match)
  }
  /** Build `P.ASTAssignmentStatement` declaring our new `it` as `value`. */
  getAST(match: P.MatchFor<this>): P.ASTAssignmentStatement {
    const { value } = match.groups
    const { itVar } = match.data
    return new P.ASTAssignmentStatement(match, {
      thing: new P.ASTVariableExpression(match, { name: itVar?.output ?? "it" }),
      value: value.AST as P.ASTExpression,
      isNewVariable: true
    })
  }
}

/** What `get` stashes on its match. */
type GetMatchData = {
  /** The NEW `it` variable we declared -- see `AssignmentStatement.declareIt()`. */
  itVar?: P.ScopeVariable
}
