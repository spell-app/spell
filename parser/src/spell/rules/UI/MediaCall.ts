import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `media_call` rule:  pause a sound or video, or go on playing it -- `pause video "intro"`, `resume video "intro"`
 * (epic `language` P65);  Spanish `pausar el vídeo "intro"`, `reanudar el vídeo "intro"`.
 * - Only a named one (`media_named`):  `pause for 2 seconds` is still a pause of the program (`pause`).
 * - Compiles to `core.pause(core.mediaNamed("intro", "video"))`, `core.resume(...)`:  `resume` goes on from where it
 *   was paused.
 * - Each verb is its own registration, `specialize()`d with the core's method (`methodName`).
 */
export class MediaCall extends SpellStatement<"media"> {
  /** What `specialize()` takes:  the core's method it calls. */
  declare static readonly SpecializeWith: { methodName: "pause" | "resume" }
  /** The core's method this registration calls. */
  @proto static methodName = "pause"
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>) {
    return new P.ASTCoreMethodInvocation(match, {
      methodName: this.methodName,
      args: [P.asAST<P.ASTExpression>(match.groups.media.AST)]
    })
  }
}

/** Declared, so a `specialize()`d instance reads its own. */
export interface MediaCall {
  methodName: string
}
