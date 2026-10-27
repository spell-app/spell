/****************
 * ### `OwnControls`
 * Did a click land on a control inside an element -- a button, a link, a field -- rather than on the element itself?
 * - A click on a control inside is that control's:
 *   a linked element doesn't follow its `link` (`UIComponent`), a folding title doesn't fold,
 *   a toast that closes on a click stays open (Spell UI's `<ui-section>`, `<ui-accordion>`, `<ui-toast>`).
 * - ONE list of what counts as a control, and ONE walk:  the click's path, innermost first.
 * - Plain DOM, no Solid:  it reads only the event.
 * - STATIC and instance-free on purpose:  a question about one event, nothing to keep.
 ****************/
export class OwnControls {
  /**
   * Did `event` land on a control, inside `upTo` and before `before`?
   * - `upTo`:  the element whose controls count;  the walk stops there (default:  the whole path).
   * - `before`:  a selector the walk stops at, saying no:  a title's own toggle (`summary`, its fold button).
   * - Climbs `composedPath()`, so a control in a shadow root, or slotted in, counts.
   */
  static isClicked(event: Event, { upTo, before }: OwnControlsWalk = {}): boolean {
    for (const target of event.composedPath()) {
      if (target === upTo) return false
      // elements only:  the path ends in shadow roots, the document and the window, which can't `matches()`
      const element = target as Partial<Element>
      if (!element.matches) continue
      if (before && element.matches(before)) return false
      if (element.matches(CONTROLS)) return true
    }
    return false
  }
}

/** Where `OwnControls.isClicked()` walks. */
export type OwnControlsWalk = {
  /** the element whose controls count:  the walk stops there */
  upTo?: Element
  /** a selector the walk stops at, saying no:  the element's own toggle */
  before?: string
}

/**
 * What counts as a control of its own:  links, buttons, fields and labels, `<details>`, anything editable or focusable,
 * and anything that says it's a button or a link.
 */
const CONTROLS =
  "a, button, input, select, textarea, label, details, summary, [contenteditable], [tabindex], [role=button], [role=link]"
