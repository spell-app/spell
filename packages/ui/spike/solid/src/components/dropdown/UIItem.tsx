import type { JSX } from "@solidjs/web"

import { proto, UIElement } from "$spike/core"
import { itemVocabulary } from "$/components/dropdown/dropdown.vocabulary.en"

/****************
 * ### `<ui-item>`
 * One option (or header / divider) of a dropdown -- DATA, read by the owning dropdown.
 * - Renders only `<slot>`:  as long as the dropdown doesn't project it, it isn't in the flat tree at all;
 *   a RICH item (element children) is projected into its menu row, where this slot shows its content live.
 * - Its attributes are real, reflecting properties (`item.value = "x"` works), via the same element core.
 ****************/
export class UIItem extends UIElement<typeof itemVocabulary> {
  @proto static vocabulary = itemVocabulary
  /** Nothing focusable inside. */
  @proto static delegatesFocus = false

  render(): JSX.Element {
    return <slot />
  }

  protected hostStates() {
    return { selected: this.attrs.selected, disabled: this.attrs.disabled }
  }
}
