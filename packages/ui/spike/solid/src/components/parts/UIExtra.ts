import { proto } from "$/util"
import { extraVocabulary } from "$/components/parts/parts.vocabulary.en"

import { ContentPart } from "$spike/ContentPart"

/****************
 * ### `<ui-extra>`
 * Extra content:  `<div class="[text] extra">`.
 * - Set apart from the main content, e.g. a card's footer;  `text` in a feed.
 * - Everything else (owner context, markup, sheet) comes from `ContentPart`.
 ****************/
export class UIExtra extends ContentPart<typeof extraVocabulary> {
  @proto static vocabulary = extraVocabulary
}
