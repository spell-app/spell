import { Dynamic, type JSX } from "@solidjs/web"

import { E } from "spell/ui/core"
import { linkVocabulary } from "./UILink.en"
import { UIText } from "./UIText"

import textCSS from "./UIText.css?inline"

/****************
 * ### `<ui-link>`
 * The component behind `<ui-link>`:  a link inside running text (epic `ui-gaps` P9).
 *
 * - `<ui-link link="help.html">help</ui-link>`:  the shared `link` (and `target`) every tag takes,
 *   as a tag of its own, for a drawing's sentence.  `<ui-text link>` draws the same.
 * - Its shadow DOM is one `<a class="ui … text" part="text" href>` around a slot, in `<ui-text>`'s look.
 *   - Without a `link`, or while `disabled`:  a span, faded when disabled.
 * - `font` words draw their elements inside it, as `<ui-text>`'s do.
 * - The element is `display: contents`:  the link IS the inline box, flowing with the sentence.
 ****************/
export class UILink extends E.UIComponent<typeof linkVocabulary> {
  @E.proto static vocabulary = linkVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { text: textCSS },
    delegatesFocus: false,
    // `disabled`:  faded, and the link dropped
    disabled: "its own",
    // a real `<a>`
    link: "its own"
  } satisfies Partial<E.ElementSetup>

  /** Where it goes:  `link`, unless `disabled`. */
  get linkAddress(): string | undefined {
    return this.disabled ? undefined : this.sharedLink
  }

  render(): JSX.Element {
    return (
      <Dynamic
        component={this.linkAddress ? "a" : "span"}
        class={this.rootClass}
        part={this.partForName("text")}
        href={this.linkAddress}
        target={(this.linkAddress && this.attributes.target) || undefined}
      >
        {UIText.styled(this.fontStates)}
      </Dynamic>
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UILink extends E.AttributeValues<typeof linkVocabulary> {}
