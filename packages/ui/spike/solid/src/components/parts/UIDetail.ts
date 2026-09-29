import { proto } from "$/util"
import { detailVocabulary } from "$/components/parts/parts.vocabulary.en"

import { ContentPart } from "$spike/ContentPart"

/****************
 * ### `<ui-detail>`
 * A label's dimmer second value:  `<span class="detail">`, owned by `<ui-label>` (`:state(in-label)`).
 * - A tab on an image label:  `label.css` sets `--ui-label-layout: image`, which `parts.css` style-queries.
 ****************/
export class UIDetail extends ContentPart<typeof detailVocabulary> {
  @proto static vocabulary = detailVocabulary

  protected tag(): string {
    return "span"
  }
}
