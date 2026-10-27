import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E, UIT } from "spell-ui/core"

/****************
 * ### `CloseButton`
 * THE close button of a box that closes:  `<button class="close" part="close">`, its icon and its name,
 * drawn while the box can be closed.
 * - `<ui-message dismissible>`, `<ui-toast closable>`, `<ui-nag closable>`, a dialog's `closable`.
 * - A component holds one as a field, handed what differs, and draws it where it goes (`draw()`):
 *   ```ts
 *   readonly closeButton = new E.CloseButton({
 *     owner: this,
 *     shows: () => this.closable,
 *     label: () => this.translationForKey("close"),
 *     part: this.partForName("close"),
 *     onClick: (event) => this.close("close", event)
 *   })
 *   ```
 * - Its icon is `UIT.CLOSE_ICON`, loaded through the owner's icon packs (`IconGlyph`).
 * - MUST be created under the element's owner, as a field:  its icon creates an effect.
 ****************/
export class CloseButton {
  /** What differs from box to box. */
  private readonly props: CloseButtonProps

  /** The icon, while it shows. */
  private readonly glyph: E.IconGlyph

  constructor(props: CloseButtonProps) {
    this.props = props
    this.glyph = new E.IconGlyph({ owner: props.owner, name: () => (props.shows() ? UIT.CLOSE_ICON : undefined) })
  }

  /** The button, while the box can be closed;  nothing otherwise. */
  draw(): JSX.Element {
    const { shows, label, part, onClick } = this.props
    return (
      <Show when={shows()}>
        <button type="button" class={UIT.CLOSE_CLASS} part={part} aria-label={label()} onClick={onClick}>
          {this.glyph.svg}
        </button>
      </Show>
    )
  }
}

/** What a `CloseButton` is made from. */
export type CloseButtonProps = {
  /** the component drawing it (its icon loads through the component's packs) */
  owner: E.IconGlyphOwner
  /** can the box be closed now?  Tracked:  the button shows while it can */
  shows: () => boolean
  /** its accessible name, in the page's language;  tracked */
  label: () => string
  /** its `part`, translated on a translated tag (`partForName()`) */
  part: string
  /** what a click does:  close the box */
  onClick: (event: MouseEvent) => void
}
