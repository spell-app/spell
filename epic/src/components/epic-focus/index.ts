/**
 * `epic-focus` family barrel:  defines `<epic-focus>` (SIDE EFFECT) and exports its component, `EpicFocus`, and its
 * DOM element, `DOMEpicFocusElement`.
 * - Defines the families it draws in its shadow root first:  `<epic-review>`, `<epic-state-filter>`.
 * - `<epic-page>` draws it (Focus mode, in its header's gear);  never written in a page.
 */
import "spell/epic/components/epic-review"
import "spell/epic/components/epic-state-filter"

import { DOMEpicFocusElement, EpicFocus } from "./EpicFocus"

EpicFocus.define()

export { DOMEpicFocusElement, EpicFocus }
