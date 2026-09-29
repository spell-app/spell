import { proto } from "$/util"
import { contentVocabulary } from "$/components/parts/parts.vocabulary.en"

import { ContentPart } from "$spike/ContentPart"

/****************
 * ### `<ui-content>`
 * A content block:  `<div class="[image] [scrolling] content">`.
 * - The main content block of an owner;  `image` / `scrolling` are modal layouts.
 * - `scrolling`:  the root is a keyboard stop (`tabindex=0`), as every scrollable region must be.
 * - Everything else (owner context, markup, sheet) comes from `ContentPart`.
 ****************/
export class UIContent extends ContentPart<typeof contentVocabulary> {
  @proto static vocabulary = contentVocabulary

  protected tabIndex(): number | undefined {
    return this.attrs.scrolling ? 0 : undefined
  }
}
