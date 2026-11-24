import { Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { UIT } from "spell/ui/core"

/****************
 * ### `ClearButton`
 * THE clear button of a text field:  a small basic `<ui-button>` with an `x`, at the field's end,
 * drawn while the field has text to clear.
 * - `<ui-input clearable>` (on by default for `type="search"`) and every `<ui-search>`.
 * - Its box, `<span class="clear" part="clear">`, is laid out by `UIInput.css`:
 *   over the end of the native control, where a trailing icon would be (which it hides while it shows).
 * - A press on it never takes focus from the field (`mousedown` is cancelled),
 *   and it's out of the Tab order (`tabindex="-1"`), as the browser's own clear button is:
 *   the field's handler empties it and puts the focus back in the field.
 * - Never in a server render (`spell/ui/static`):  a page with no script can't clear a field.
 * - STATIC and instance-free on purpose:  it holds no state, and `<ui-button>` loads its own icon.
 *   The family that draws it imports `spell/ui/components/ui-button` (its `index.ts`).
 ****************/
export class ClearButton {
  /** The button, while `shows()`;  nothing otherwise. */
  static draw(props: ClearButtonProps): JSX.Element {
    return (
      <Show when={!isServer && props.shows()}>
        <span class={UIT.CLEAR_CLASS} part={props.part} onMouseDown={ClearButton.keepFocus}>
          <ui-button
            icon={UIT.CLOSE_ICON}
            size="mini"
            appearance="basic"
            padding="compact"
            tabindex="-1"
            aria-label={props.label()}
            onClick={(event: MouseEvent) => props.onClear(event)}
          />
        </span>
      </Show>
    )
  }

  /** A press on the button leaves the focus in the field. */
  private static keepFocus(event: MouseEvent) {
    event.preventDefault()
  }
}

/** What a `ClearButton` is drawn from. */
export type ClearButtonProps = {
  /** does the field have text to clear now?  Tracked:  the button shows while it does */
  shows: () => boolean
  /** its accessible name, in the page's language;  tracked */
  label: () => string
  /** its box's `part`, translated on a translated tag (`partForName()`) */
  part: string
  /** what a click does:  empty the field, as typing would, and focus it */
  onClear: (event: MouseEvent) => void
}
