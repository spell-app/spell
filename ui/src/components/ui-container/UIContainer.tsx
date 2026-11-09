import type { JSX } from "@solidjs/web"

import { E } from "spell/ui/core"
import { containerVocabulary } from "./UIContainer.en"

import containerCSS from "./UIContainer.css?inline"

/****************
 * ### `UIContainer`
 * The component behind `<ui-container>`:  a centred column of page width that holds a page's content.
 *
 * - Its shadow DOM is one box, `<div class="ui … container" part="container">`, around a slot for the content.
 * - `scrolling`:  the box is a keyboard stop (`tabindex=0`), as every scrollable region must be.
 * - `width`:  the box's width, a CSS length, through `--_container-set-width` and the class `set-width`
 *   (its rule in the sheet, centred and never wider than the page;  epic `language` T76).
 ****************/
export class UIContainer extends E.UIComponent<typeof containerVocabulary> {
  @E.proto static vocabulary = containerVocabulary
  @E.protoMerged static elementSetup = { styleSheets: { container: containerCSS } } satisfies Partial<E.ElementSetup>

  /** A width of its own (`width`):  the class its rule keys on. */
  protected override get extraClass(): string | undefined {
    return this.width ? SET_WIDTH : undefined
  }

  render(): JSX.Element {
    return (
      <div
        class={this.rootClass}
        part={this.partForName("container")}
        tabindex={this.scrolling ? 0 : undefined}
        style={this.width ? { "--_container-set-width": this.width } : undefined}
      >
        <slot />
      </div>
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIContainer extends E.AttributeValues<typeof containerVocabulary> {}

/** The box's class while it has a width of its own:  `UIContainer.css` sizes it. */
const SET_WIDTH = "set-width"
