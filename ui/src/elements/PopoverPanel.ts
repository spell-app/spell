import { E, UI } from "spell/ui/core"
// Import directly to avoid circular import:  spell-element imports nothing of Spell UI, so it has always loaded first
import { Disclosure } from "spell/element"

/****************
 * ### `PopoverPanel`
 * The panel a control opens under itself:  a dropdown's menu, a calendar's popup, a search's results,
 * an icon picker's grid (epic `coherence` P8), a shrinkable menu's overflow menu (P17).
 * - A `Disclosure` (the kit's `spell/element`):  the open state, `request()` with the cancelable
 *   `ui-opening` / `ui-closing`, `aria-expanded`;  plus, on top, what every such panel does the same way:
 *   - the box as a popover, shown in the top layer while it shows (`follow()`)
 *   - its `UI.overlays` entry meanwhile:  Escape and a click outside close it (`overlay`)
 *   - the anchor it hangs from:  a name of its own per element, written inline,
 *     on the anchor box (`anchorStyle`:  its `anchor-name`) and on the panel (`panelStyle`:  its `position-anchor`);
 *     so no control's sheet names an anchor, and the panel's place, size and look stay its sheet's
 * - What differs stays the component's:  which box, what opening resets (`onChange`), where focus goes,
 *   the panel's own place and size (its sheet).
 * - A component holds one as a field, and follows it in one `@onChange`:
 *   ```ts
 *   readonly popover = new F.PopoverPanel({ component: this, member: "isOpen", restoreFocus: false })
 *
 *   @E.onChange("isOpen", "isConnected", "isReady")
 *   protected onOpenChanged(isOpen: boolean, isConnected: boolean, isReady: boolean) {
 *     return this.popover.follow(this.menu, isOpen && isConnected && isReady)
 *   }
 *   ```
 * - In the `core` entry since epic `coherence` P17, beside `Disclosure`:  a menu opens one too, and it has no value
 *   (in `forms`, every page with a shrinkable menu would load the form controls' chunk).
 ****************/
export class PopoverPanel extends Disclosure {
  constructor(private readonly panelSetup: PopoverPanelSetup) {
    super(panelSetup)
  }

  /**
   * This element's `UI.overlays` entry, open while the panel shows:
   * Escape or a click outside asks it to close (`onDismiss`, else `close()`).
   */
  get overlay(): E.OverlayEntry {
    const { component, restoreFocus, onDismiss } = this.panelSetup
    return (this.overlayEntry ??= {
      element: component.domElement,
      kind: "popover",
      restoreFocus,
      onDismiss: onDismiss ?? (() => void this.close())
    })
  }
  private overlayEntry?: E.OverlayEntry

  /**
   * Show `box` as a popover, and open the overlay entry, while `isShowing`;  returns what undoes both.
   * - For the component's `@onChange`, which runs it again as `isShowing` changes, and the cleanup in between.
   * - `isShowing`:  open AND connected AND drawn, as the component decides
   *   (`keepAlive` keeps a removed element's state, but the page must not keep its overlay entry).
   * - Nothing for a box that isn't a popover:  a simple dropdown's menu, a server render's.
   */
  follow(box: HTMLElement | undefined, isShowing: boolean): (() => void) | undefined {
    if (!isShowing || !box || !box.popover) return undefined
    if (!box.matches(POPOVER_OPEN)) box.showPopover()
    const { overlay } = this
    UI.overlays.open(overlay)
    return () => {
      if (box.matches(POPOVER_OPEN)) box.hidePopover()
      UI.overlays.close(overlay)
    }
  }

  /** The anchor box's inline style:  `{ "anchor-name": "--ui-dropdown-7" }`. */
  get anchorStyle(): Record<string, string> {
    return { "anchor-name": this.anchorName }
  }

  /** The panel's inline style:  `{ "position-anchor": "--ui-dropdown-7" }`. */
  get panelStyle(): Record<string, string> {
    return { "position-anchor": this.anchorName }
  }

  /** The anchor's name:  its own per element, from `UI.ids` on first read, so two controls never share one. */
  private get anchorName(): string {
    return (this.anchorId ??= `--${UI.ids.next(this.panelSetup.component.vocabulary.tag)}`)
  }
  private anchorId?: string
}

/** What a `PopoverPanel` is handed:  a `Disclosure`'s setup, its component required. */
export type PopoverPanelSetup = E.DisclosureSetup & {
  /** the control:  its element, its events, its tag for the anchor's name */
  component: E.UIComponent
  /** focus back where it was once closed (`OverlayEntry.restoreFocus`).  Default:  `true` */
  restoreFocus?: boolean
  /** Escape or a click outside:  default `close()` */
  onDismiss?: E.OverlayEntry["onDismiss"]
}

/** A popover in the top layer. */
const POPOVER_OPEN = ":popover-open"
