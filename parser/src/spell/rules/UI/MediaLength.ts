import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
// Import directly to avoid circular import
import { SpellExpression } from "spell/parser/spell/rules/expressions/SpellExpression"
import { Priority } from "spell/parser/spell/rules/rules.types"

/**
 * `media_length` rule:  how long a sound or video is -- `the length of the "intro" video` (epic `language` P65);
 * Spanish `la duración del vídeo "intro"`.
 * - A duration, in seconds (`SP.SECONDS`):  so `the length of the "intro" video as a duration` says `2 minutes`.
 * - Compiles to `core.mediaLength(...)`:  0 until the browser has loaded that far.
 * - Above a built-in `length` (`Priority.specific`):  a named one is no text or list.
 */
export class MediaLength extends SpellExpression<"media"> {
  @proto static datatype = "number"
  @proto static priority = Priority.specific

  getAST(match: P.MatchFor<this>) {
    return new P.ASTCoreMethodInvocation(match, {
      datatype: "number",
      methodName: "mediaLength",
      args: [P.asAST<P.ASTExpression>(match.groups.media.AST)]
    })
  }

  /** A duration in seconds. */
  getMeasure(_match: P.MatchFor<this>): P.Measure | undefined {
    return SP.SECONDS
  }
}
