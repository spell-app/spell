import { html, nothing } from "lit"

import { proto } from "../../core"
import { avatarVocabulary } from "$/components/parts/parts.vocabulary.en"
import { PartElement } from "./PartElement"

/****************
 * ### `<ui-avatar>`
 * A small picture of a person:  `<span class="avatar"><img alt="">` from `src`, or a slotted `<img>`.
 * - `alt` defaults to `""`:  the person's name is right beside it, so the picture is decorative.
 ****************/
export class UIAvatar extends PartElement.for(avatarVocabulary) {
  @proto static box = "span" as const

  protected override renderContent() {
    const image = this.src
      ? html`<img part=${this.partName("image")} src=${this.src} alt=${this.alt ?? ""} />`
      : nothing
    return html`${image}<slot></slot>`
  }
}
