import { proto } from "spell/util"
import { P } from "spell-parser/parser"
import { Priority } from "spell-parser/spell/rules/rules.types"
import { Negatable, Wording } from "spell-parser/spell/rules/expressions"
// Import directly to avoid circular import
import { SpellStatement } from "spell-parser/spell/rules/Statement"

/**
 * `drag_and_drop` rule:  which things a page lets people drag, and which lists they may drop them on
 * (epic `outline-spell` P28).
 * - `a card can be dragged`:  its things may be dragged, with a mouse or a finger
 * - `a pile can be dropped on`:  things may be dropped on its lists
 * - In a type's outline body, `it` or no subject:  `- it can be dragged`, `- can be dropped on`.
 * - Or as adjectives:  `a card is draggable`, `- it is droppable`;
 *   and `is not` turns one off, e.g. for a sub-type:  `a joker is not draggable`.
 * - Nothing drags without them:  dragging is opt-in, so a list of tasks doesn't turn draggable by itself.
 * - They only open the door:  the lists' own rules still decide each move.
 *   - A thing is dragged only when the list holding it will give it up (`a tableau can give up a card if: ...`).
 *   - A list takes the drop only when it will take the thing (`can take a card if: ...`).
 *   - The program hears the drop as `<thing>-drop`, e.g. `on card drop with a card and a pile`.
 * - Spanish:  `una carta se puede arrastrar`, `una pila se puede soltar encima`;  `es arrastrable`, `no es soltable`.
 * - Compiles to a flag on the class:  `Card.canBeDragged = true`, `Pile.canBeDroppedOn = true`;  `false` for `is not`.
 *   The runtime's drawable classes say `false`;  a sub-type inherits its super-type's.
 */
export class DragAndDrop extends SpellStatement<"type|what|is?"> {
  @proto static priority = Priority.declaration
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>): P.ASTPatchedMember {
    const flag = new P.ASTStaticDefinition(match, {
      type: P.matchAST<P.ASTTypeExpression>(match.groups.type),
      name: Wording.meaningOf(match.groups.what) === "dropped_on" ? "canBeDroppedOn" : "canBeDragged",
      value: new P.ASTBooleanLiteral(match, !Negatable.isNegated(match.groups.is))
    })
    return new P.ASTPatchedMember(match, { member: flag })
  }
}
