import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellExpression } from "spell/parser/spell/rules/expressions/SpellExpression"

/**
 * `event_part` rule:  in an event's handler, who it concerns (epic `elemental-spell` P9, Q26).
 * - `sender`:  the thing that sent it, `event.sender`
 * - `target`:  the thing whose handler is running, `event.target`
 * - `the original target`:  the thing it was sent to, `event.originalTarget`
 *   - a card's press passed up to its pile:  the pile's handler's `target` is the pile, its original target the card
 * - Only inside a handler (its scope has the `event` argument):  elsewhere `target` is just a word.
 * - Each word is its own registration, `specialize()`d with which part it reads (`reads`).
 */
export class EventPart extends SpellExpression {
  /** What `specialize()` takes:  which part of the event it reads. */
  declare static readonly SpecializeWith: { reads: EventPartName }
  /** Which part of the event this registration reads. */
  @proto static reads: EventPartName = "target"
  @proto static datatype = "thing"

  parse(scope: P.Scope, tokens: P.Token[]) {
    if (!inHandler(scope)) return undefined
    return super.parse(scope, tokens)
  }

  getAST(match: P.MatchFor<this>) {
    return new P.ASTPropertyExpression(match, { object: eventVariable(match), property: this.reads })
  }
}

/** Declared, so a `specialize()`d instance reads its own. */
export interface EventPart {
  reads: EventPartName
}

/** The parts of an event a handler can name. */
export type EventPartName = "sender" | "target" | "originalTarget"

/** Is `scope` inside an event's handler:  does it have the handler's `event` argument? */
export function inHandler(scope: P.Scope): boolean {
  return scope.variables?.get("event")?.kind === "argument"
}

/** The handler's `event` argument, as an expression. */
export function eventVariable(match: P.AnyMatch): P.ASTVariableExpression {
  return new P.ASTVariableExpression(match, { name: "event", type: "argument" })
}
