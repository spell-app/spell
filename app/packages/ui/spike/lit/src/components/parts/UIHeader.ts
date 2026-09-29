import { headerVocabulary } from "$/components/parts/parts.vocabulary.en"
import type { HeaderLevel } from "$/components/components.types"
import type { PartBox } from "../../elements"
import { PartElement } from "./PartElement"

/****************
 * ### `<ui-header>`
 * A header, two ways:
 * - STANDALONE:  Fomantic's `ui header`, `<div class="ui [size] [color] [keyOnly ...] header">`;  `level` makes
 *   it a page header, `<h1>` ... `<h6>`;  `href` an `<a>`.
 * - OWNED (in a card, modal, another header ...):  a bare `<div class="header">` with `:state(in-<owner>)`,
 *   as Fomantic's `.ui.card > .content > .header`.  `level` becomes `role=heading` + `aria-level`, so an owned
 *   header can still be a heading without the `<hN>` look.
 * - Owns `header` and `content` itself (`headerVocabulary.ownsParts`):  a nested `<ui-header>` is its sub
 *   header, a `<ui-content>` its text column beside an icon.
 ****************/
export class UIHeader extends PartElement.for(headerVocabulary) {
  protected override render() {
    const level = this.headingLevel()
    if (this.owner) {
      const heading = level ? { role: "heading", ariaLevel: String(level) } : {}
      return this.renderBox(this.vocabulary.noun, this.renderContent(), heading)
    }
    const box: PartBox = level ? `h${level}` : "div"
    return this.renderBox(this.classes(), this.renderContent(), {}, box)
  }

  /** `level` as a number, `undefined` without one. */
  private headingLevel(): HeaderLevel | undefined {
    return this.level ? (Number(this.level) as HeaderLevel) : undefined
  }
}
