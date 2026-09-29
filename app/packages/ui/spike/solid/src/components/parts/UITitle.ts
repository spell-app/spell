import { proto } from "$/util"
import { titleVocabulary } from "$/components/parts/parts.vocabulary.en"

import { ContentPart } from "$spike/ContentPart"

/****************
 * ### `<ui-title>`
 * A title:  `<div class="title">`, or `<a class="title">` with `href`.
 * - A step's, an accordion panel's or a search result's title.
 ****************/
export class UITitle extends ContentPart<typeof titleVocabulary> {
  @proto static vocabulary = titleVocabulary

  protected tag(): string {
    return this.attrs.href ? LINK : "div"
  }

  protected href(): string | undefined {
    return this.attrs.href
  }
}

/** Root of a linked title. */
const LINK = "a"
