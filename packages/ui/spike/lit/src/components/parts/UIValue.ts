import { valueVocabulary } from "$/components/parts/parts.vocabulary.en"
import { PartElement } from "./PartElement"

/****************
 * ### `<ui-value>`
 * A statistic's value, a search result's price:  `<div class="value">`;  `text` for a word value.
 ****************/
export class UIValue extends PartElement.for(valueVocabulary) {}
