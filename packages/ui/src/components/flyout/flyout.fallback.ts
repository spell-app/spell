import { proto } from "$/core"
import { ModalFallback } from "$/components/modal"

import { FLYOUT_WORD_WIDTHS, flyoutVocabulary } from "./flyout.vocabulary.en"

/****************
 * ### `FlyoutFallback`
 * `ModalFallback` with a flyout's names:  the same native `<dialog>` shown with `showModal()` while the host has
 * `open` (focus trap, dimmer, Escape, approve / deny), in the flyout's class grammar (`ui left visible flyout`),
 * `part="flyout"`.
 ****************/
export class FlyoutFallback extends ModalFallback {
  // same dialog vocabulary shape as the modal's (see `DialogElement`);  TypeScript only knows the modal's literals
  @proto static vocabulary = flyoutVocabulary as unknown as typeof ModalFallback.prototype.vocabulary
  @proto static rootPart = "flyout"
  @proto static degraded = [
    ...ModalFallback.prototype.degraded,
    "the slide-in:  it appears at once;  a word `width` (`thin`) warns in dev, as the class grammar only knows columns"
  ]

  /**
   * The class grammar, plus:
   * - the default `position` (`left`) when the host has none -- `NativeFallback` reads attributes only
   * - a word width after the noun, as the element adds it
   */
  protected override classes(extra?: string): string {
    const width = this.host
      .getAttribute(WIDTH)
      ?.trim()
      .replace(/[\s-]+/g, " ")
    const word = FLYOUT_WORD_WIDTHS.find((each) => each === width)
    const classes = super.classes([word, extra].filter(Boolean).join(" ") || undefined)
    return this.host.hasAttribute(POSITION) ? classes : classes.replace(UI_WORD, `$&${DEFAULT_POSITION} `)
  }
}

/** The attribute with word values. */
const WIDTH = "width"

/** The position attribute, its default (the vocabulary's), and where it goes:  right after `ui`. */
const POSITION = "position"
const DEFAULT_POSITION = "left"
const UI_WORD = /^ui /
