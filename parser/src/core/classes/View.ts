import h from "@solidjs/h"

import { prop } from "spell/util"
import { noAbilities } from "spell/parser/core/abilities"
import { core } from "spell/parser/core/core"
import type { Drawing } from "spell/parser/core/drawing"
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
 * - A picture of it, its `thumbnail`, draws while it has no drawing of its own (epic `mockup` P16).
 * - Everything else as a `Thing`.
 */
export class View extends Thing {
  /**
   * A picture of it, a file of its project:  `snapshots/terms.jpg`.
   * - `<spell-page "terms" thumbnail="snapshots/terms.jpg"/>`, or `- its thumbnail is "..."`.
   * - A type may have data of its own called this, a thing as much as text:  only text is a picture's file.
   */
  @prop()
  accessor thumbnail: string | undefined

  /**
   * Draw our thumbnail:  what a view with no drawing of its own shows.
   * - Compiled spell's own `to draw it` replaces this, so writing any content replaces the picture.
   * - throws:  no thumbnail, as a thing with no `to draw` can't be drawn.
   */
  draw(): Drawing {
    return typeof this.thumbnail === "string" ? this.drawThumbnail() : super.draw()
  }

  /**
   * Our thumbnail, as an image:  what `draw its thumbnail` places.
   * - Nothing when we have none.
   * - Its file is found from the running project's folder, so no page says where its project is.
   */
  drawThumbnail(): Drawing {
    const { thumbnail } = this
    if (typeof thumbnail !== "string") return null as unknown as Drawing
    return h("img", { src: core.addressOfFile(thumbnail), alt: "", style: "max-width: 100%" }) as unknown as Drawing
  }

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
