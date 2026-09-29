import { proto } from "$/util"
import { valueVocabulary } from "$/components/parts/parts.vocabulary.en"

import { ContentPart } from "$spike/ContentPart"

/****************
 * ### `<ui-value>`
 * A value:  `<div class="[text] value">`.
 * - A statistic's value;  a search result's price.
 * - Everything else (owner context, markup, sheet) comes from `ContentPart`.
 ****************/
export class UIValue extends ContentPart<typeof valueVocabulary> {
  @proto static vocabulary = valueVocabulary
}
