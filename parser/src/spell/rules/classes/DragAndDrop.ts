import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { Priority } from "spell-lang/spell/rules/rules.types"
import { Negatable, Wording } from "spell-lang/spell/rules/expressions"
// Import directly to avoid circular import
import { SpellStatement } from "spell-lang/spell/rules/Statement"

/**
 * `drag_and_drop` rule:  which things a page lets people drag, and which lists they may drop them on
 * (epic `outline-spell` P28).
 * - `a card can be dragged`:  its things may be dragged, with a mouse or a finger
 * - `a pile can be dropped on`:  things may be dropped on its lists
 * - `a task can be selected`:  a click selects one of its things in its list;  shift and command (ctrl) select more
 *   (epic `outline-spell` P29) -- see the list's `selection`
 * - In a type's outline body, `it` or no subject:  `- it can be dragged`, `- can be dropped on`.
 * - Or as adjectives:  `a card is draggable`, `- it is droppable`;
 *   and `is not` turns one off, e.g. for a sub-type:  `a joker is not draggable`.
 * - Nothing drags without them:  dragging is opt-in, so a list of tasks doesn't turn draggable by itself.
 * - They only open the door:  the lists' own rules still decide each move.
 *   - A thing is dragged only when the list holding it will give it up (`a tableau can give up a card if: ...`).
 *   - A list takes the drop only when it will take the thing (`can take a card if: ...`).
 *   - The list hears the drop by its own `- when a card is dropped on it:` (`DragHandler`);
 *     a list with none, the program hears it as `<thing>-drop`, e.g. `on card drop with a card and a pile`.
 * - Spanish:  `una carta se puede arrastrar`, `una pila se puede soltar encima`;  `es arrastrable`, `no es soltable`.
 * - Compiles to a flag on the class:  `Card.canBeDragged = true`, `Pile.canBeDroppedOn = true`, `Task.canBeSelected = true`;
 *   `false` for `is not`.
 *   The runtime's drawable classes say `false`;  a sub-type inherits its super-type's.
 */
export class DragAndDrop extends SpellStatement<"type|what|is?"> {
  @proto static priority = Priority.declaration
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>): P.ASTPatchedMember {
    const flag = new P.ASTStaticDefinition(match, {
      type: P.matchAST<P.ASTTypeExpression>(match.groups.type),
      name: FLAGS[Wording.meaningOf(match.groups.what) as keyof typeof FLAGS],
      value: new P.ASTBooleanLiteral(match, !Negatable.isNegated(match.groups.is))
    })
    return new P.ASTPatchedMember(match, { member: flag })
  }
}

/** The flag each meaning sets on the class. */
const FLAGS = { dragged: "canBeDragged", dropped_on: "canBeDroppedOn", selected: "canBeSelected" } as const
