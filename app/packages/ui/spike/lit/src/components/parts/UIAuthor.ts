import { proto } from "../../core"
import { authorVocabulary } from "$/components/parts/parts.vocabulary.en"
import { PartElement } from "./PartElement"

/****************
 * ### `<ui-author>`
 * An author:  `<span class="author">`, `<a>` with `href` (a feed's `user`).
 ****************/
export class UIAuthor extends PartElement.for(authorVocabulary) {
  @proto static box = "span" as const
}
