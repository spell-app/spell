import { proto } from "spell/util"
import { MethodDefinition } from "./MethodDefinition"

/**
 * `to_do_something` rule:  defines a new method/statement:
 * e.g. `to foo the bar`, `to create a card`, `to create (a card)`, `to notify (message)`.
 * - Optional `test` keyword (`to test foo: ...`) marks the definition as a test method:
 *   see `MethodDefinition.processSignature()` / `getAST()`'s `asTest` handling.
 * - `inlineInitialType` is `true`:  the FIRST bare-type arg found, e.g. `(a card)` in `to create (a card)`,
 *   makes it an instance method on that type's prototype, instead of a call argument.
 * - Trailing `:` is optional,
 *   so both `to foo the bar` (no body) and `to foo the bar:` (body follows) parse.
 */
export class ToDoSomething extends MethodDefinition<"asTest?|signature|body?"> {
  @proto static alias = "statement"
  // promote the first captured type arg (e.g. `(a card)`) to an instance-method receiver
  @proto static inlineInitialType = true
}
