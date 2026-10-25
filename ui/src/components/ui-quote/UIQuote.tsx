import { Dynamic, type JSX } from "@solidjs/web"

import { E } from "spell-ui/core"
import { quoteVocabulary } from "./UIQuote.en"

import quoteCSS from "./UIQuote.css?inline"

/****************
 * ### `<ui-quote>`
 * The component behind `<ui-quote>`:  someone else's words (epic `ui-gaps` P9).
 *
 * - A block quote by default:  `<blockquote class="ui quote" part="quote">` around a slot,
 *   in the Markdown pages' look (a bar on its leading edge, muted text).
 * - `inline`:  a `<q>` inside a sentence, its quotation marks the browser's for the text's language.
 * - `cite` names where the words come from, on the element as the platform's own `cite`:  not shown.
 * - The element is `display: contents`:  the quote IS the box.
 ****************/
export class UIQuote extends E.UIComponent<typeof quoteVocabulary> {
  @E.proto static vocabulary = quoteVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { quote: quoteCSS },
    delegatesFocus: false,
    cssStates: ["inline"]
  } satisfies Partial<E.ElementSetup>

  render(): JSX.Element {
    return (
      <Dynamic
        component={this.inline ? "q" : "blockquote"}
        class={this.rootClass}
        part={this.partForName("quote")}
        cite={this.cite || undefined}
      >
        <slot />
      </Dynamic>
    )
  }

  /** `inline` before the noun:  `ui inline quote`, which the sheet doesn't need, but a page's styles may. */
  protected get extraClass(): string | undefined {
    return this.inline ? INLINE : undefined
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIQuote extends E.AttributeValues<typeof quoteVocabulary> {}

/** The class word while `inline`. */
const INLINE = "inline"
