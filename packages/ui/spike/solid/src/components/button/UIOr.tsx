import type { JSX } from "@solidjs/web"

import { proto } from "$/util"
import { orVocabulary } from "$/components/button/button.vocabulary.en"

import { UIElement } from "$spike/UIElement"

import buttonCSS from "$/components/button/button.css?inline"

/****************
 * ### `<ui-or>`
 * The round "or" between two buttons of a group:  `<span class="or" data-text="or">`, text from `UI.i18n`.
 ****************/
export class UIOr extends UIElement<typeof orVocabulary> {
  @proto static vocabulary = orVocabulary
  @proto static styles = { button: buttonCSS }

  protected hostStates() {
    return { or: true }
  }

  render(): JSX.Element {
    return <span class={this.classes()} part={this.part("or")} data-text={this.attrs.text ?? this.text("or")} />
  }
}
