// Import directly to avoid circular import
import { Thing } from "./Thing"

/**
 * `View`:  a `Thing` drawn as its own custom element -- what `a card is a view` extends.
 * - Below it:  `Page`, a view reached by its own address, and `TwoSidedView`, a view with a front and a back.
 * - Its tag starts with its project's or library's name, made singular:  `<solitaire-card>` in a solitaire app.
 * - The element comes from `core.defineElement()`, which the page running the program fills in:
 *   core may not import Solid or Spell UI.
 * - Its things may be dragged on the page only when its type says so, `a card can be dragged` (`canBeDragged`).
 * - Everything else as a `Thing`.
 */
export class View extends Thing {
  /**
   * May a page let people drag our things?  `a card can be dragged` says yes (epic `outline-spell` P28).
   * - Even then, only when the list holding one will give it up:  its `can give up` rule.
   */
  static canBeDragged = false

  /**
   * May a page let people select our things?  `a task can be selected` says yes (epic `outline-spell` P29).
   * - A click selects one in its list;  shift and command (ctrl) select more:  see `ViewableList.selection`.
   */
  static canBeSelected = false
}
