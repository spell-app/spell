import { proto } from "spell/util"
import { MethodDefinition } from "./MethodDefinition"

/**
 * `create_animation` rule:  defines an animation method:
 * `animation deal the cards`, or `create animation deal the cards`.
 * - `create` is optional filler:  `asAnimation` just records that the `animation` keyword matched,
 *   it doesn't distinguish the two spellings.
 * - `inlineInitialType` is `true`, same promotion-to-instance-method behavior as `to_do_something`.
 * - SIDE EFFECT: `MethodDefinition.getAST()`'s `asAnimation` handling makes the method `async`.
 * - What runs once at a time is the queue's job, where a person's action enters (`ActionQueue`, `core`):
 *   the compiled code holds no guard of its own.
 */
export class CreateAnimation extends MethodDefinition<"asAnimation|signature|body?"> {
  @proto static alias = "statement"
  // promote the first captured type arg (e.g. `(a card)`) to an instance-method receiver
  @proto static inlineInitialType = true
}
