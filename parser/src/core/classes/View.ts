import { noAbilities } from "spell/parser/core/abilities"
// Import directly to avoid circular import
import { Thing } from "./Thing"

/**
 * `View`:  a `Thing` drawn as its own custom element -- what `a card is a view` extends.
 * - Below it:  `Page`, a view reached by its own address, and `TwoSidedView`, a view with a front and a back.
 * - Its tag starts with its project's or library's name, made singular:  `<solitaire-card>` in a solitaire app.
 * - The element comes from `core.defineElement()`, which the page running the program fills in:
 *   core may not import Solid or Spell UI.
 * - Its things may be dragged, clicked or selected on the page only when its type says so:
 *   `<spell-view "card" draggable>`, `- it is clickable when it is face down`, or an event that implies it,
 *   `- on click:` (`core.isAble()`).
 * - Everything else as a `Thing`.
 */
export class View extends Thing {
  /**
   * May a page let people drag our things?  `- it is draggable` says yes (epic `outline-spell` P28, `debut` P27).
   * - Even then, only when the list holding one will give it up:  its `can give up` rule.
   * - "No" until a type says, or its `- on drag:` implies it:  see `core.isAble()`.
   */
  static draggable = false

  /**
   * May a page let people click our things?  `- it is clickable` says yes, or its `- on click:` (epic `debut` P27).
   * - Clickable, it shows the pointer;  `- clickable when it is face down` runs its click only then.
   */
  static clickable = false

  /**
   * May a page let people select our things?  `- it is selectable` says yes (epic `outline-spell` P29).
   * - A click selects one in its list;  shift and command (ctrl) select more:  see `ViewableList.selection`.
   */
  static selectable = false

  static {
    noAbilities(this)
  }
}
