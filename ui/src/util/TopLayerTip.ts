/****************
 * ### `TopLayerTip`
 * Puts a component's CSS tooltip in the browser's top layer while it shows, so no parent frame can cut it off.
 * - A tip is a `role="tooltip"` element in the component's shadow root:
 *   `<ui-field>`'s under its info icon, `<ui-section>`'s under its title bar.
 * - Each sheet still decides how it looks and when it fades in, on `:hover` and `:focus-visible`.
 *   This only makes it a `popover` for as long as it shows, which the sheet places with CSS anchor positioning.
 * - So a tip with no script behind it, in plain markup, still shows:  in its frame, as it always did.
 * - Plain DOM:  no Solid, no runtime, a few listeners on an element they die with.
 * - In `spell/ui/util`, so `core` carries it:  `E.TopLayerTip`, for every family's tip.
 * - STATIC and instance-free on purpose:  a tip has nothing to remember between showings.
 ****************/
export class TopLayerTip {
  /**
   * Show the tip inside `container` while the pointer's on a `trigger`, or one has keyboard focus.
   * - `container`:  an element holding the tip and every trigger;  a tip that comes and goes is found each time.
   * - `trigger`:  a selector inside the same shadow root.
   * - Escape hides it, until the pointer or the focus comes back.
   * - NEVER throws.
   */
  static showIn(container: HTMLElement, trigger: string): void {
    const isOnTrigger = (event: Event) => event.composedPath().some((target) => (target as Element).matches?.(trigger))
    let isHovering = false
    let isFocused = false
    const update = () => {
      const tip = container.querySelector<HTMLElement>(TIP)
      if (tip) TopLayerTip.setShown(tip, isHovering || isFocused)
    }

    container.addEventListener("pointerover", (event) => {
      isHovering = isOnTrigger(event)
      update()
    })
    container.addEventListener("pointerleave", () => {
      isHovering = false
      update()
    })
    container.addEventListener("focusin", (event) => {
      isFocused = isOnTrigger(event) && (event.composedPath()[0] as Element).matches(":focus-visible")
      update()
    })
    container.addEventListener("focusout", () => {
      isFocused = false
      update()
    })
    container.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !(isHovering || isFocused)) return
      isHovering = isFocused = false
      update()
    })
  }

  /** Put `tip` in the top layer, or take it out.  NEVER throws:  one the browser can't show stays in its frame. */
  private static setShown(tip: HTMLElement, isShown: boolean): void {
    if (!tip.isConnected || !("popover" in tip)) return
    const isOpen = tip.matches(":popover-open")
    if (isShown === isOpen) return
    // `manual`:  a tip inside an open popup mustn't close it, and it has no click to close on
    tip.popover ||= "manual"
    if (isShown) tip.showPopover()
    else tip.hidePopover()
  }
}

/** How a component's tip is found:  its role. */
const TIP = '[role="tooltip"]'
