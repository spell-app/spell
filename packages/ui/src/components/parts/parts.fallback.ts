import { proto } from "$/util"
import { NativeFallback, OwnerContext, type NativeFallbackRoot, type OwnerLookup } from "$/elements"

import { PART_VOCABULARIES, headerVocabulary } from "./parts.vocabulary.en"

/****************
 * ### `ContentPartFallback`
 * Any generic content part:  `<div class="<noun>" part="<noun>"><slot></slot></div>`, one class for all 13.
 * - The noun comes from the host's tag (`PART_VOCABULARIES`), so no per-part class is needed.
 * - Standalone `<ui-header>` is Fomantic's `<div class="ui ... header">`:  `<h1>` ... `<h6>` by `level`, `<a>`
 *   with `href`.  An OWNED header (in a card, another header ...) is the bare `header` class, with
 *   `role="heading"` + `aria-level` for a `level`.
 * - NOTE: `owners` knows only what parts own today (a header owns headers and contents);  add card / modal
 *   owners as they land.
 ****************/
export class ContentPartFallback extends NativeFallback {
  /** Which tags own a header. */
  static owners: OwnerLookup = OwnerContext.ownersOf(headerVocabulary.noun, PART_VOCABULARIES)

  @proto static degraded = ["owner-context states (`:state(in-card)`) that style owned parts"]

  constructor(host: HTMLElement, root: NativeFallbackRoot, error?: unknown, internals?: ElementInternals) {
    super(host, root, error, internals)
    // Shadows the prototype's placeholder vocabulary, see `@proto`.
    this.vocabulary = PART_VOCABULARIES.find((vocabulary) => vocabulary.tag === host.localName) ?? PART_VOCABULARIES[0]
  }

  protected override build() {
    const { noun } = this.vocabulary
    const level = this.host.getAttribute("level")
    if (noun !== headerVocabulary.noun)
      return [this.decorate(this.create("div", { class: this.classes() }, this.slot()), noun)]
    const owned = OwnerContext.find(this.host, ContentPartFallback.owners)
    if (owned) {
      const header = this.create(
        "div",
        { class: noun, role: level ? "heading" : null, "aria-level": level },
        this.slot()
      )
      return [this.decorate(header, noun)]
    }
    const href = this.host.getAttribute("href")
    const tag = href !== null ? "a" : level ? (`h${level}` as "h1") : "div"
    return [this.decorate(this.create(tag, { class: this.classes(), href }, this.slot()), noun)]
  }
}
