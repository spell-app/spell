import type { JSX } from "@solidjs/web"

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
 * - Its shadow DOM is one `<a class="ui … text" part="text" href>` around a slot, in `<ui-text>`'s look:
 *   `<ui-text>`'s own inline box (`UIText.inlineBox()`).
 *   - Without a `link`, or while `disabled`:  a span, faded when disabled.
 * - `font` words draw their elements inside it, as `<ui-text>`'s do.
 * - The element is `display: contents`:  the link IS the inline box, flowing with the sentence.
 * - Holding only an icon (`:state(icon-only)`, a header's "octocat [GitHub icon]"):  it never wraps alone onto a line
 *   of its own, and, in a header, keeps a small gap from the word before it (`UIText.css`).
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

  /**
   * It holds only icons:  an icon link after a word, as in a card's header.
   * - Icons are the elements defined as icons (`<ui-icon>`, or a translated tag);  blank text doesn't count.
   */
  @E.cssState("icon-only")
  @E.watches({ childList: true, characterData: true, subtree: true })
  get isIconOnly(): boolean {
    const nodes = [...this.domElement.childNodes]
    const isIcon = (node: Node) =>
      node.nodeType === E.NodeType.element &&
      E.UIComponent.registry.definitions.get((node as Element).localName)?.vocabulary.noun === ICON
    const isBlank = (node: Node) => node.nodeType === E.NodeType.text && !node.textContent?.trim()
    return nodes.some(isIcon) && nodes.every((node) => isIcon(node) || isBlank(node))
  }

  render(): JSX.Element {
    return UIText.inlineBox(this)
  }
}

/** The noun of an icon's definition (`<ui-icon>`, or its translated tag). */
const ICON = "icon"

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UILink extends E.AttributeValues<typeof linkVocabulary> {}
