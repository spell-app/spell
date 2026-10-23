import h from "@solidjs/h"

import type { Drawing } from "spell-lang/core/drawing"
import { core } from "spell-lang/core/core"
// Import directly to avoid circular import
import { List } from "./List"

/**
 * `DrawableList`:  a `List` drawn as its own custom element, its items inside it --
 * what `a pile is a drawable list of cards` extends.
 * - Its element holds its items' elements as its CHILDREN, e.g. `<game-pile>` holding `<game-card>`s:
 *   the same shape in a program and in hand-written HTML.
 * - Two drawings, each overridable (epic `spanish` P20):
 *   - `draw()`, spell's `to draw it`:  the WRAPPER around its items, in the element's shadow root,
 *     with a `<slot>` where its items show -- just the slot, by default, so the wrapper itself shows nothing
 *   - `drawEachItem(item)`, spell's `to draw each item`:  the wrapper each item is drawn in --
 *     by default just the item's own drawing, or its text when it can't draw
 *   - Each in its own error boundary:  one that throws shows a stand-in, and the rest keeps drawing.
 * - Spell writes the slot `<children/>`, and compiles it to the web's `<slot>`.
 *   - A second, named place, `<children name="header"/>`, is filled by children written `in="header"`
 *     (`slot="header"` on the page).
 *   - The list's own items always go in the unnamed one.
 * - The element comes from `core.defineElement()`, as a `Drawable`'s does.
 * - Everything else as a `List`.
 */
export class DrawableList<T = unknown> extends List<T> {
  /**
   * May a page let people drop a thing on our lists?  `a pile can be dropped on` says yes (epic `outline-spell` P28).
   * - Even then, only what the list will take:  its `can take` rule.
   */
  static canBeDroppedOn = false

  /** May a page let people drag our lists themselves?  `a pile can be dragged` -- see `Drawable.canBeDragged`. */
  static canBeDragged = false

  /**
   * Its outside, with a `<slot>` where its items show -- by default the slot, and its placeholder while it's empty.
   * - Override it, e.g. `to draw it:  return <div class="pile"><children/></div>`:
   *   spell's `<children/>` is the web's `<slot>`, compiled to `h("slot")`.
   *   An override draws its own placeholder, if it wants one:  `{draw its placeholder}`.
   * - Its items are NOT drawn here:  they're its element's children -- see `core.drawThing()`.
   */
  draw(): Drawing {
    // the placeholder in a function of its own:  only it re-runs as the list empties and fills
    return [() => (this.isEmpty ? this.drawItsPlaceholder() : undefined), (h("slot") as unknown as () => Drawing)()]
  }

  /**
   * `item` drawn as one of ours -- by default its own drawing (`core.drawThing()`), or its text when it can't draw.
   * - Override it to wrap each item, e.g. `to draw each item:  return <div class="spot">{draw the card}</div>`.
   * - What `core.drawItems()` draws each item with, so each sits in our element's slot.
   */
  drawEachItem(item: T): Drawing {
    return core.drawThing(item) ?? (item == null ? null : String(item))
  }
}
