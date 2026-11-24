import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/ui/core"
import { contentVocabulary } from "./UIContent.en"

/****************
 * ### `UIContent`
 * The component behind `<ui-content>`:  an owner's main block of content,
 * `<div class="[image] [scrolling] [text-align] [vertical-align] content">`.
 *
 * - `image` and `scrolling` are a modal's layouts;  `text-align` and `vertical-align` are Fomantic's
 *   `center aligned content` (in a card, an item, a list).
 * - No `floated` since epic `ui-gaps` P8:  a `<ui-stack>` places content left and right.
 * - `scrolling`:  the root is a keyboard stop (`tabindex=0`), as every scrollable region must be.
 * - `markdown` (epic `editor` T148):  its own words are read as Markdown, by `<ui-markdown>`, the one reader:
 *   - drawn in its shadow root, in place of its slot, so the light DOM keeps the words as written
 *     (an editor edits them there)
 *   - `<ui-markdown>`'s family loads the first time one is drawn (`onMarkdownChanged()`):  a page with no such
 *     content never loads it
 * - Finding its owner, the markup and the sheet all come from `PartComponent`.
 ****************/
export class UIContent extends E.PartComponent<typeof contentVocabulary> {
  @E.proto static vocabulary = contentVocabulary

  protected get rootTabIndex(): number | undefined {
    return this.scrolling ? 0 : undefined
  }

  ////////////////
  // ## Markdown
  ////////////////

  /**
   * Its own words as text, dedented, as `<ui-markdown>` reads its own:  followed as the page changes them.
   * - Read only while `markdown` draws them.
   */
  @E.watches({ childList: true, subtree: true, characterData: true })
  get ownWords(): string {
    return E.LoadableComponent.inlineTextOf(this.domElement)
  }

  /** `markdown`, the first time it's on:  load `<ui-markdown>`'s family, which draws the words. */
  @E.onChange("markdown")
  protected onMarkdownChanged(markdown: boolean | undefined) {
    if (markdown) void import("spell/ui/components/ui-markdown")
  }

  /** Its words as Markdown, with `markdown`;  else its slot. */
  protected content(): JSX.Element {
    // taken here:  inside the JSX, `super` would be the props object's, not this class's
    const slot = super.content()
    return (
      <Show when={this.markdown} fallback={slot}>
        <ui-markdown part={this.partForName("markdown")}>{this.ownWords}</ui-markdown>
      </Show>
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIContent extends E.AttributeValues<typeof contentVocabulary> {}
