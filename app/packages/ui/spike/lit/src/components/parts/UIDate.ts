import { proto } from "../../core"
import { dateVocabulary } from "$/components/parts/parts.vocabulary.en"
import { PartElement } from "./PartElement"

/****************
 * ### `<ui-date>`
 * When something happened:  `<time class="date" datetime>`, machine-readable through `datetime`.
 ****************/
export class UIDate extends PartElement.for(dateVocabulary) {
  @proto static box = "time" as const

  protected override render() {
    return this.renderBox(this.classes(), this.renderContent(), { datetime: this.datetime || undefined })
  }
}
