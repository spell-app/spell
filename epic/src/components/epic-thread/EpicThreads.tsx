import type { JSX } from "@solidjs/web"

import { E } from "@spell-app/spell-element"

import { epicThreadsVocabulary } from "./EpicThreads.en"

import threadsCSS from "./EpicThreads.css?inline"

/****************
 * ### `EpicThreads`
 * The component behind `<epic-threads>`:  the comment threads under one block of a page, in order.
 * - A column of its threads (`<epic-thread>`s, its children), 6px apart, 8px below its block, 12px above the next.
 * - Its edges are the block's it's under:  the page's sheet sets them, where it knows the block
 *   (`spell-comments.css`:  an epic page item's note box, a guide paragraph's measure).
 * - Made by the docs runtime's comments (`spell-doc-comments.js`), marked `data-spell-added`, so a live patch steps
 *   around it and the anchors never count it.
 ****************/
export class EpicThreads extends E.UIComponent<typeof epicThreadsVocabulary> {
  @E.proto static vocabulary = epicThreadsVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-threads": threadsCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  render(): JSX.Element {
    return (
      <div class={BASE} part={this.partForName("base")}>
        <slot />
      </div>
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicThreads extends E.AttributeValues<typeof epicThreadsVocabulary> {}

/** Class of its box. */
const BASE = "base"
