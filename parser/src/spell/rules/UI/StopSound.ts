import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { Priority } from "spell/parser/spell/rules/rules.types"

/**
 * `stop_sound` rule:  stop a sound `play` started (epic `data` Q40, T145).
 * - e.g. `stop its sound`
 * - Compiles to `core.stop(sound)`;  a sound that isn't playing:  nothing.
 * - A project's own method of the same words wins (`Priority.overridable`):  a clock's `stop it`, `stop search`.
 */
export class StopSound extends SpellStatement<"sound"> {
  @proto static alias = "statement"
  @proto static priority = Priority.overridable

  getAST(match: P.MatchFor<this>) {
    const { sound } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "stop",
      args: [P.asAST<P.ASTExpression>(sound.AST)]
    })
  }
}
