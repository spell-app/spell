import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellExpression } from "spell/parser/spell/rules/expressions/SpellExpression"
import { Negatable } from "spell/parser/spell/rules/expressions"

/**
 * `input_state` rule:  the mouse and the keys, readable anywhere -- core's `input`, `input.ts`.
 * - Epic `elemental-spell` P9, Q31, Q32;  HyperCard's `the shiftKey`.
 * - e.g. `the shift key is down`:  `core.input.shiftKey`;  `the mouse isn't down`:  `!core.input.button`
 * - `the meta key`:  command on a Mac, control elsewhere, by the system the program runs on (Q31)
 * - `the button` (the left), `the right button`, `the center button`
 * - `the mouse is still down` (held a second, barely moving)
 * - `space is down`, a named key
 * - Not tied to an event:  read in any step, a handler's or not.  A handler that waits reads it as it is THEN.
 * - Each form is its own registration, `specialize()`d with what it reads (`reads`), and a named key with `key`.
 */
export class InputState extends SpellExpression<"operator?"> {
  /** What `specialize()` takes:  what it reads, a named key's name, and a datatype other than a choice. */
  declare static readonly SpecializeWith: { reads: string; key?: string; datatype?: string }
  /** What `core.input` says for this form, e.g. `shiftKey`, or `isKeyDown` for a named key. */
  @proto static reads = "button"
  /** A named key's name as the browser gives it (`" "` for space), for `reads: "isKeyDown"`. */
  @proto static key = ""
  @proto static datatype = "choice"

  getAST(match: P.MatchFor<this>) {
    const input = new P.ASTPropertyExpression(match, { object: new P.ASTCoreExpression(match), property: "input" })
    const read =
      this.reads === "isKeyDown"
        ? new P.ASTScopedMethodInvocation(match, {
            thing: input,
            methodName: "isKeyDown",
            args: [new P.ASTQuotedExpression(match, this.key)]
          })
        : new P.ASTPropertyExpression(match, { object: input, property: this.reads })
    if (!Negatable.isNegated(match.groups.operator)) return read
    return new P.ASTNotExpression(match, { expression: read })
  }
}

/** Declared, so a `specialize()`d instance reads its own. */
export interface InputState {
  reads: string
  key: string
}
