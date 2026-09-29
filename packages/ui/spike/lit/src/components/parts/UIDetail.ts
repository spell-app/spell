import { proto } from "$/util"
import { detailVocabulary } from "$/components/parts/parts.vocabulary.en"
import { PartElement } from "./PartElement"

/****************
 * ### `<ui-detail>`
 * A label's dimmer second value:  `<span class="detail">`.
 ****************/
export class UIDetail extends PartElement.for(detailVocabulary) {
  @proto static box = "span" as const
}
