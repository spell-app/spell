import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SpellType } from "spell/parser/spell/rules/types"
import { MethodDefinition } from "./MethodDefinition"

/**
 * `create_animation` rule:  RETIRED words for an action, as spell waits by itself (epic `language` P13, Q9):
 * `animation deal the cards`, or `create animation deal the cards`.
 * - Reads as `to deal the cards` does, as an error which `spell lint --fix` puts right:
 *   see `SpellType.noteRetiredLiterals()`.
 * - `inlineInitialType` is `true`, same promotion-to-instance-method behavior as `to_do_something`.
 */
export class CreateAnimation extends MethodDefinition<"signature|body?"> {
  @proto static alias = "statement"
  // promote the first captured type arg (e.g. `(a card)`) to an instance-method receiver
  @proto static inlineInitialType = true

  /** Notes its old words -- see the class's docs. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens)
    return match && SpellType.noteRetiredLiterals(match)
  }
}
