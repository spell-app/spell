import { proto } from "$/util"
import { actionsVocabulary } from "$/components/parts/parts.vocabulary.en"

import { ContentPart } from "$spike/ContentPart"

/****************
 * ### `<ui-actions>`
 * Actions:  `<div class="actions">`.
 * - A modal's or toast's buttons, a comment's reply links.
 * - Everything else (owner context, markup, sheet) comes from `ContentPart`.
 ****************/
export class UIActions extends ContentPart<typeof actionsVocabulary> {
  @proto static vocabulary = actionsVocabulary
}
