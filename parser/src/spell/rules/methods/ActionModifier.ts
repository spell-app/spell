import { P } from "spell/parser/parser"

/**
 * `action_modifier` rule:  one thing an action's HEAD line says about it, after `with` (epic `language` P48, Q6):
 * `to "deal the cards" with title "Deal", icon "card", shortcut "meta+N"`.
 * - Each says what the same line indented under the action says (`action_detail`):
 *   - `title "Deal"`:  `titled "Deal"`
 *   - `icon "card"`:  `icon "card"`
 *   - `shortcut "meta+N"`:  `shortcut meta+N`, its keys quoted, as a comma follows them
 *   - `undoable`:  `undoable`
 *   - `undoable as "Move Card"`:  `undoable as "Move Card"`
 * - Matched only:  its action's definition reads them with its body's lines (`ActionDetail.detailsOf()`).
 */
export class ActionModifier extends P.Sequence<"title?|icon?|keys?|undoable?|undoneAs?"> {
  /** Compiles to nothing:  the action's description gathers it. */
  compile(): string {
    return ""
  }
}

/**
 * `action_modifiers` rule:  the things an action's head line says, after its quoted name -- see `action_modifier`.
 * - `with title "Deal", icon "card"`:  `with`, then one or more, each after a comma or `and`.
 * - Or a comma first, instead of `with`, its name quoted or not (Owen):  `to put a card on a pile, undoable as "Move Card"`.
 */
export class ActionModifiers extends P.Sequence {
  /** Compiles to nothing:  the action's description gathers them. */
  compile(): string {
    return ""
  }

  /** Each `action_modifier` match in `match`, in order. */
  static modifiersIn(match: P.Match | undefined): P.Match[] {
    const found: P.Match[] = []
    const visit = (it: P.Match) => {
      if (it.rule instanceof ActionModifier) found.push(it)
      else for (const child of it.matched) if (child instanceof P.Match) visit(child)
    }
    if (match) visit(match)
    return found
  }
}
