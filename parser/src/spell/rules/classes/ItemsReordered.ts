import { proto } from "spell/util"
import { P } from "spell-parser/parser"
import { Priority } from "spell-parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellStatement } from "spell-parser/spell/rules/Statement"

/**
 * `items_reordered` rule:  people may reorder a list's items on the page, by dragging them (epic `outline-spell` P30).
 *
 * ```spell
 * a "checklist" is a drawable list of tasks where:
 * 	- its items can be reordered
 * ```
 * - Dragged over the list, a blue line shows where the dragged items would go;  the items stay where they are, dimmed.
 * - Once the pointer rests there 2 seconds, they move there, while the drag goes on;  let go, and they move at once.
 * - Another wait:  `- its items can be reordered after 1.5 seconds`.
 * - Or none, `... immediately` (`right away`):  no line, the items move as the pointer does.
 *   The page may say otherwise for one list, its element's `move-delay="1"`.
 * - A selected item drags with every other selected one (`a task can be selected`).
 * - The items must be draggable themselves:  `a task can be dragged`.
 * - The list's `when a task is dropped on it:` still runs, after the items moved.
 * - Spanish:  `- sus elementos se pueden reordenar`, `... después de 1.5 segundos`, `... de inmediato`.
 * - Only in a list type's outline body.
 * - Compiles to the seconds to wait, on the class:  `static reorderItemsAfter = 2`.
 *   The runtime's lists say `undefined`:  they don't reorder.
 */
export class ItemsReordered extends SpellStatement<"type|seconds?|now?"> {
  @proto static priority = Priority.declaration
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>): P.ASTPatchedMember {
    const { seconds, now } = match.groups
    const after = new P.ASTStaticDefinition(match, {
      type: P.matchAST<P.ASTTypeExpression>(match.groups.type),
      name: "reorderItemsAfter",
      value: new P.ASTNumericLiteral(match, now ? 0 : seconds ? Number(seconds.value) : DEFAULT_SECONDS)
    })
    return new P.ASTPatchedMember(match, { member: after })
  }
}

/** How long the pointer rests before dragged items move, when the line names no time. */
const DEFAULT_SECONDS = 2
