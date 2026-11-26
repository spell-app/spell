/**
 * `epic-bells` family barrel:  defines `<epic-bells>` (SIDE EFFECT) and exports its component, `EpicBells`, and its
 * DOM element, `DOMEpicBellsElement`.
 * - `<epic-page>` draws it (Bells & Whistles, in its header's gear);  never written in a page.
 */
import { DOMEpicBellsElement, EpicBells } from "./EpicBells"

EpicBells.define()

export { DOMEpicBellsElement, EpicBells }
