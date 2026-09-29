import { summaryVocabulary } from "$/components/parts/parts.vocabulary.en"
import { PartElement } from "./PartElement"

/****************
 * ### `<ui-summary>`
 * A feed summary line:  `<div class="summary">`.
 ****************/
export class UISummary extends PartElement.for(summaryVocabulary) {}
