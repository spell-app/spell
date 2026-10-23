// Import directly to avoid circular import
import { Thing } from "./Thing"

/**
 * `Drawable`:  a `Thing` drawn as its own custom element -- what `a card is a drawable thing` extends.
 * - Its tag starts with its project's or library's name, made singular:  `<solitaire-card>` in a solitaire app.
 * - The element comes from `core.defineElement()`, which the page running the program fills in:
 *   core may not import Solid or Spell UI.
 * - Its things may be dragged on the page only when its type says so, `a card can be dragged` (`canBeDragged`).
 * - Everything else as a `Thing`.
 */
export class Drawable extends Thing {
  /**
   * May a page let people drag our things?  `a card can be dragged` says yes (epic `outline-spell` P28).
   * - Even then, only when the list holding one will give it up:  its `can give up` rule.
   */
  static canBeDragged = false
}
