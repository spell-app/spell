import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Negatable } from "spell/parser/spell/rules/expressions"
// Import directly to avoid circular import
import { SpellExpression } from "spell/parser/spell/rules/expressions/SpellExpression"
import { Priority } from "spell/parser/spell/rules/rules.types"

/**
 * `media_is` rule:  is a sound or video playing, or done -- `if the "intro" video is playing`,
 * `if sound "card slide" is not done` (epic `language` P65);  Spanish `si el vídeo "intro" está sonando`,
 * `... está terminado`.
 * - Only of a named one (`media_named`):  `if it is done` is still a thing's own `done`.
 * - Compiles to `core.isPlaying(...)`, `core.isDone(...)`, negated for `is not`.
 * - Done:  played to its end;  stopped, or never played, isn't.
 */
export class MediaIs extends SpellExpression<"media|operator|playing?|done?"> {
  @proto static datatype = "choice"
  @proto static priority = Priority.specific

  getAST(match: P.MatchFor<this>) {
    const { media, operator, playing } = match.groups
    const call = new P.ASTCoreMethodInvocation(match, {
      datatype: "choice",
      methodName: playing ? "isPlaying" : "isDone",
      args: [P.asAST<P.ASTExpression>(media.AST)]
    })
    return Negatable.isNegated(operator) ? new P.ASTNotExpression(match, { expression: call }) : call
  }
}
