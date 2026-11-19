import { P } from "spell/parser/parser"
import { Wording } from "spell/parser/spell/rules/expressions"

/** Each speed word's meaning, as a number:  `media_speed_word`'s. */
export const MEDIA_SPEEDS: Readonly<Record<string, number>> = { half: 0.5, normal: 1, double: 2 }

/**
 * `media_speed` rule:  how fast to play a sound or video -- `at 1.5x`, `at half speed`, `at double speed`
 * (epic `language` P65);  Spanish `a 1.5x`, `a media velocidad`, `al doble de velocidad`.
 * - Compiles to the speed, a number:  1 is normal.
 * - Its words' meanings are `MEDIA_SPEEDS`' (`media_speed_word`).
 */
export class MediaSpeed extends P.Sequence<"speed?|word?"> {
  getAST(match: P.MatchFor<this>): P.ASTExpression {
    const { speed, word } = match.groups
    if (speed) return P.asAST<P.ASTExpression>(speed.AST)
    return new P.ASTNumericLiteral(match, { value: MEDIA_SPEEDS[`${Wording.meaningOf(word)}`] ?? 1 })
  }
}
