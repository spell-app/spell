import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { Priority } from "spell/parser/spell/rules/rules.types"

/**
 * `play_sound` rule:  play a sound file, from its start, as a click or a key asks (epic `data` Q40, T145).
 * - e.g. `play its sound`
 * - Compiles to `core.play(sound)`:  one player per sound file, played inside the click,
 *   so browsers that want sound to start from a click (Safari, phones) let it.
 * - A project's own method of the same words wins (`Priority.overridable`):  `play fizzbuzz`, `play from the stock`.
 */
export class PlaySound extends SpellStatement<"sound"> {
  @proto static alias = "statement"
  @proto static priority = Priority.overridable

  getAST(match: P.MatchFor<this>) {
    const { sound } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "play",
      args: [P.asAST<P.ASTExpression>(sound.AST)]
    })
  }
}
