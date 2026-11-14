import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { MethodDefinition } from "./MethodDefinition"

/**
 * `to_do_something` rule:  defines a new method/statement:
 * e.g. `to foo the bar`, `to create a card`, `to create (a card)`, `to notify (message)`.
 * - Optional `test` keyword (`to test foo: ...`) marks the definition as a test method:
 *   see `MethodDefinition.processSignature()` / `getAST()`'s `asTest` handling.
 * - `inlineInitialType` is `true`:  the FIRST bare-type arg found, e.g. `(a card)` in `to create (a card)`,
 *   makes it an instance method on that type's prototype, instead of a call argument.
 * - Its name may be quoted, then what it says about itself on its line (epic `language` P48, Q6):
 *   `to "deal the cards" with title "Deal", icon "card", shortcut "meta+N"` -- see `action_modifier`.
 * - Trailing `:` is optional,
 *   so both `to foo the bar` (no body) and `to foo the bar:` (body follows) parse.
 */
export class ToDoSomething extends MethodDefinition<"asTest?|signature|modifiers?|body?"> {
  @proto static alias = "statement"
  // promote the first captured type arg (e.g. `(a card)`) to an instance-method receiver
  @proto static inlineInitialType = true
  // each method it makes is an action, one undo step (Q60):  a top-level one too (J149)
  @proto static undoableByDefault = true

  /** As any method's;  a quoted name (`to "deal the cards" with ...`) by its words, as the same name unquoted. */
  getDeclaration(match: P.MatchFor<this>): P.Declaration | undefined {
    const declaration = super.getDeclaration(match)
    if (declaration) declaration.name = declaration.name.replace(/^"(.*)"$/, "$1")
    return declaration
  }
}
