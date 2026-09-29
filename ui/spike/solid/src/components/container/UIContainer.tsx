import type { JSX } from "@solidjs/web"

import { proto } from "$/util"
import { containerVocabulary } from "$/components/container/container.vocabulary.en"

import { UIElement } from "$spike/UIElement"

import containerCSS from "$/components/container/container.css?inline"

/****************
 * ### `<ui-container>`
 * A container:  `<div class="ui … container" part="container"><slot></slot></div>`, centred page width.
 * - `scrolling`:  the root is a keyboard stop (`tabindex=0`), as every scrollable region must be.
 ****************/
export class UIContainer extends UIElement<typeof containerVocabulary> {
  @proto static vocabulary = containerVocabulary
  @proto static styles = { container: containerCSS }

  render(): JSX.Element {
    return (
      <div class={this.classes()} part={this.part("container")} tabindex={this.attrs.scrolling ? 0 : undefined}>
        <slot />
      </div>
    )
  }
}
