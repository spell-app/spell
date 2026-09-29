import { proto } from "$/util"
import { authorVocabulary } from "$/components/parts/parts.vocabulary.en"

import { ContentPart } from "$spike/ContentPart"

/****************
 * ### `<ui-author>`
 * An author:  `<span class="author">`, or `<a class="author">` with `href` (a profile link).
 * - Fomantic's comment `.author` and feed `.user`.
 ****************/
export class UIAuthor extends ContentPart<typeof authorVocabulary> {
  @proto static vocabulary = authorVocabulary

  protected tag(): string {
    return this.attrs.href ? "a" : "span"
  }

  protected href(): string | undefined {
    return this.attrs.href
  }

  protected target(): string | undefined {
    return this.attrs.href ? this.attrs.target : undefined
  }
}
