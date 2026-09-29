import { metaVocabulary } from "$/components/parts/parts.vocabulary.en"
import { PartElement } from "./PartElement"

/****************
 * ### `<ui-meta>`
 * Metadata:  `<div class="meta">`, a comment's `metadata`.
 ****************/
export class UIMeta extends PartElement.for(metaVocabulary) {}
