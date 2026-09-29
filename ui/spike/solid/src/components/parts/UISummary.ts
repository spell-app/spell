import { proto } from "$/util"
import { summaryVocabulary } from "$/components/parts/parts.vocabulary.en"

import { ContentPart } from "$spike/ContentPart"

/****************
 * ### `<ui-summary>`
 * A summary:  `<div class="summary">`.
 * - A feed event's summary line;  a date inside it goes inline (`--ui-part: summary`).
 * - Everything else (owner context, markup, sheet) comes from `ContentPart`.
 ****************/
export class UISummary extends ContentPart<typeof summaryVocabulary> {
  @proto static vocabulary = summaryVocabulary
}
