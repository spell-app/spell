import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SpellConstant } from "spell/parser/spell/rules/constants"
import { IsEqual, SuffixLeft } from "spell/parser/spell/rules/expressions"
import { Priority } from "spell/parser/spell/rules/rules.types"

/**
 * `answer_word` rule:  a button's own answer, a bare word, compared with `the result` (epic `language` P64).
 * - e.g. `discard` in `if the result is discard`, after `<action discard title="Discard your changes" />`
 * - Only right after `the result is` (`is_equal`'s right side, `SuffixLeft`), and only a word nothing else reads:
 *   `Priority.overridable`, so a variable, a constant or a call of those words wins.
 *   `is_equal` compares the word itself either way, unless it's a variable (`IsEqual.parse()`).
 * - `ok` and `cancel` (Spanish's `aceptar`, `cancelar`) are answers too, read the same way.
 * - Compiles to the word as text, `"discard"`:  `core.resultIs("discard")`.
 * - NOT checked against the program's buttons:  a misspelt answer is never the result.
 */
export class AnswerWord extends SpellConstant {
  @proto static alias = "expression"
  @proto static priority = Priority.overridable

  /** A word, not the language's own, right after `the result is`. */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    return IsEqual.isLastAnswer(SuffixLeft.current) && super.test(scope, tokens, start)
  }

  /** The word as text. */
  getAST(match: P.MatchFor<this>): P.ASTConstantExpression {
    return new P.ASTConstantExpression(match, { name: `${match.value}`, value: `${match.value}` })
  }
}
