import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Wording } from "spell/parser/spell/rules/expressions"
import { TypeMethodArg } from "./TypeMethodArg"

/**
 * `bare_type_arg` rule:  a KNOWN type after `a` / `an`, with no parens, in a method's signature:
 * a parameter, as `(a card)` is.
 * - `to give a card to a pile` ~== `to give (a card) to (a pile)` => `Card.give_to_$pile(pile)`.
 * - "a card" is "any card", so it's what the method takes.
 * - A word that isn't a type stays words:  `to make a mess` => `makeAMess()`.
 *   So does anything after `the`:  `to reset the stock pile`.
 * - So does a type with a word after it saying it's a NEW one, the language's `new_after_type`:
 *   Spanish's `para guardar una tarea nueva titulada (título)` is English's `to keep a new task titled (title)`,
 *   words, not a task it takes (epic `language` T62).
 * - Read by `method_signature` exactly as `type_method_arg` is -- see `buildSignatureData()`.
 * - NOT a `method_arg`:  only `method_signature` takes it, outside parens.
 */
export class BareTypeArg extends TypeMethodArg {
  @proto static alias = []
  /** Editors colour its type's word, `card`, as the parameter it names. */
  @proto static highlightAs: P.HighlightKind = "parameter"

  /** As `type_method_arg`, but not before the language's word for a new one:  `una tarea nueva`. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens)
    if (match && Wording.lengthAt(scope, "new_after_type", tokens, match.length) > 0) return undefined
    return match
  }
}
