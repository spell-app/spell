/**
 * What the `ui-button` family's files share:  `DOMElementClick`, and the vocabularies' renamed values.
 * - No element code, so every file of the family may import it, its vocabularies included.
 * - A constant only `UIButton` reads sits below that class instead.
 */

////////////////
// ## Renamed attributes (epic `ui-gaps` P4, Owen's request r1)
////////////////

/** The old colour switches `color` replaces:  `<ui-button color="primary">` ~== `<ui-button color="primary">`. */
export const COLOR_SWITCHES = ["primary", "secondary", "positive", "negative"].map((value) => ({
  from: value,
  value
}))

/** `attach`'s class words:  `both` was the bare `attached`;  a side is `<side> attached`. */
export const ATTACH_CLASSES = {
  both: "attached",
  top: "top attached",
  bottom: "bottom attached",
  left: "left attached",
  right: "right attached"
} as const

////////////////
// ## Clicking the DOM element
////////////////

/****************
 * ### `DOMElementClick`
 * What `click()` on a `<ui-button>` does:  it presses the button inside, as `click()` on a native button would.
 * - Shared by the component and its native fallback.
 * - Static:  a press needs nothing but the inner control.
 ****************/
export class DOMElementClick {
  /**
   * `control.click()`, with its event stopped at the control's shadow root.
   * - The activation still runs:  submit, toggle, invoker command, link.
   * - No second click reaches the page, which already has the DOM element's own.
   * - SIDE EFFECT:  a `click` listener on the root while the (synchronous) call runs.
   */
  static press(control: HTMLElement) {
    const root = control.getRootNode()
    root.addEventListener("click", DOMElementClick.contain)
    try {
      control.click()
    } finally {
      root.removeEventListener("click", DOMElementClick.contain)
    }
  }

  /** Keep a click inside the root it reached. */
  private static contain(event: Event) {
    event.stopPropagation()
  }
}
