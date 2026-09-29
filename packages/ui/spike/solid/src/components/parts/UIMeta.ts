import { proto } from "$/util"
import { metaVocabulary } from "$/components/parts/parts.vocabulary.en"

import { ContentPart } from "$spike/ContentPart"

/****************
 * ### `<ui-meta>`
 * Metadata:  `<div class="meta">`.
 * - A date or a category;  Fomantic's comment `metadata`.
 * - Everything else (owner context, markup, sheet) comes from `ContentPart`.
 ****************/
export class UIMeta extends ContentPart<typeof metaVocabulary> {
  @proto static vocabulary = metaVocabulary
}
