import { proto } from "$/util"
import { descriptionVocabulary } from "$/components/parts/parts.vocabulary.en"

import { ContentPart } from "$spike/ContentPart"

/****************
 * ### `<ui-description>`
 * Descriptive text:  `<div class="description">`.
 * - Card / item / modal / list / step / search text, a comment's text.
 * - Everything else (owner context, markup, sheet) comes from `ContentPart`.
 ****************/
export class UIDescription extends ContentPart<typeof descriptionVocabulary> {
  @proto static vocabulary = descriptionVocabulary
}
