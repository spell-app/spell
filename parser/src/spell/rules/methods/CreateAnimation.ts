import { proto } from "spell/util"
import { MethodDefinition } from "./MethodDefinition"

/**
 * `create_animation` rule:  defines an animation method:
 * `animation deal the cards`, or `create animation deal the cards`.
 * - `create` is optional filler:  `asAnimation` just records that the `animation` keyword matched,
 *   it doesn't distinguish the two spellings.
 * - `inlineInitialType` is `true`, same promotion-to-instance-method behavior as `to_do_something`.
 * - SIDE EFFECT: `MethodDefinition.getAST()`'s `asAnimation` handling makes the method `async`,
 *   and wraps its body in `StartProcessInvocation` (`exclusive: true`)
 *   and `try { ... } finally { StopProcessInvocation }`.
 *   - That makes re-invoking a running animation a no-op
 *     (see `core.processIsRunning()` in the compiled output).
 *   - And it always stops the process on the way out.
 */
export class CreateAnimation extends MethodDefinition<"asAnimation|signature|body?"> {
  @proto static alias = "statement"
  // promote the first captured type arg (e.g. `(a card)`) to an instance-method receiver
  @proto static inlineInitialType = true
}
