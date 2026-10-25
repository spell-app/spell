import { E } from "spell-ui/core"
import { titleVocabulary } from "./UITitle.en"

/****************
 * ### `UITitle`
 * The component behind `<ui-title>`:  a title, `<div class="title">`, or `<a class="title">` with `link`.
 *
 * - A step's, an accordion panel's or a search result's title.
 ****************/
export class UITitle extends E.PartComponent<typeof titleVocabulary> {
  @E.proto static vocabulary = titleVocabulary

  protected get rootTag(): string {
    return this.link ? "a" : "div"
  }

  protected get rootHref(): string | undefined {
    return this.link
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UITitle extends E.AttributeValues<typeof titleVocabulary> {}
