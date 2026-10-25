import { Show } from "solid-js"
import { Dynamic, type JSX } from "@solidjs/web"

import { E, UIT } from "spell-ui/core"
import { textVocabulary } from "./UIText.en"

import textCSS from "./UIText.css?inline"

/****************
 * ### `UIText`
 * The component behind `<ui-text>`:  inline text in a hue, a status colour or a size.
 *
 * - Its shadow DOM is one span, `<span class="ui … text" part="text">`, around a slot for the text.
 *   - With a `link`, that box is a real link instead, `<a href>`:  a link in running text (epic `ui-gaps` P3).
 *     `disabled` drops the link:  a span again.
 *   - With `paragraph`, a `<p>` (epic `ui-gaps` P9):  a block, with the body's line height;
 *     a `link` is then an `<a>` inside it.
 * - Each `font` word written is drawn as its HTML element around the slot (`<strong>`, `<em>`, `<code>` ...),
 *   so screen readers hear it;  `UIText.css` gives code and highlight their look.
 * - The element is `display: contents`:  the span IS the inline box, flowing with the text around it.
 * - `:state(disabled)` is for the page's styles;  `UIText.css` keys on the `disabled` class.
 ****************/
export class UIText extends E.UIComponent<typeof textVocabulary> {
  @E.proto static vocabulary = textVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { text: textCSS },
    delegatesFocus: false,
    // `disabled`:  only a look
    disabled: "its own",
    // a real `<a>`
    link: "its own",
    cssStates: ["paragraph"]
  } satisfies Partial<E.ElementSetup>

  /** Where it links:  `link`, unless `disabled`. */
  get linkAddress(): string | undefined {
    return this.disabled ? undefined : this.sharedLink
  }

  render(): JSX.Element {
    return (
      <Show
        when={this.paragraph}
        fallback={
          <Dynamic
            component={this.linkAddress ? "a" : "span"}
            class={this.rootClass}
            part={this.partForName("text")}
            href={this.linkAddress}
            target={(this.linkAddress && this.attributes.target) || undefined}
          >
            {UIText.styled(this.fontStates)}
          </Dynamic>
        }
      >
        <p class={this.rootClass} part={this.partForName("text")}>
          <Show when={this.linkAddress} fallback={UIText.styled(this.fontStates)}>
            <a href={this.linkAddress} target={this.attributes.target || undefined}>
              {UIText.styled(this.fontStates)}
            </a>
          </Show>
        </p>
      </Show>
    )
  }

  /**
   * The slot, inside the HTML element of each `font` word written, outermost first:  `<strong><em><slot>`.
   * - Static:  `<ui-link>` draws its text the same way.
   */
  static styled(states: Record<string, boolean>): JSX.Element {
    let content: JSX.Element = <slot />
    for (const word of [...UIT.FontWords].reverse()) {
      const tag = FONT_ELEMENTS[word]
      if (!tag || !states[`font-${word}`]) continue
      const inner = content
      content = <Dynamic component={tag}>{inner}</Dynamic>
    }
    return content
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIText extends E.AttributeValues<typeof textVocabulary> {}

/**
 * The HTML element each `font` word draws inside running text.
 * - `underline` has none that means it (`<u>` means "misspelt"):  only the look, from `reset.css`.
 */
const FONT_ELEMENTS: Record<UIT.FontWord, string | undefined> = {
  bold: "strong",
  italic: "em",
  underline: undefined,
  strikethrough: "s",
  code: "code",
  highlight: "mark",
  subscript: "sub",
  superscript: "sup"
}
