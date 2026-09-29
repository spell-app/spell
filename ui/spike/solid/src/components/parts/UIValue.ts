import { proto } from "$spike/core"
import { valueVocabulary } from "$/components/parts/parts.vocabulary.en"

import { PartElement } from "./PartElement"

/****************
 * ### `<ui-value>`
 * A value:  `<div class="[text] value">`.
 * - A statistic's value;  a search result's price.
 * - Everything else (owner context, markup, sheet) comes from `ContentPart`.
 ****************/
export class UIValue extends PartElement<typeof valueVocabulary> {
  @proto static vocabulary = valueVocabulary
}
