import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Wording } from "spell/parser/spell/rules/expressions"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `stop_all_media` rule:  stop every sound, or every video, the program has played -- `stop all sounds`,
 * `stop all videos`, `stop all movies` (epic `language` P65);  Spanish `parar todos los sonidos`, `parar todos los vídeos`.
 * - Compiles to `core.stopAll("sound")`, `core.stopAll("video")`:  each goes back to its start, and its window closes.
 */
export class StopAllMedia extends SpellStatement<"kind"> {
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>) {
    const kind = new P.ASTStringLiteral(match, { value: `${Wording.meaningOf(match.groups.kind)}`, quote: '"' })
    return new P.ASTCoreMethodInvocation(match, { methodName: "stopAll", args: [kind] })
  }
}
