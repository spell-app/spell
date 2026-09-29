import { proto, ContentPart, PARTS_SHEET } from "../../core"
import { ContentPartFallback } from "$/components/parts/parts.fallback"

import partsCSS from "$/components/parts/parts.css?inline"

/**
 * `ContentPart` bound to `parts.css`:  the one sheet every generic content part adopts, and to
 * `ContentPartFallback`, the one native fallback all 13 share (it reads the noun from the host's tag).
 * - Why a class of its own:  the element core (`ContentPart`) stays CSS-free, and the sheet is registered
 *   under `PARTS_SHEET`, the name a statistic's `<ui-label>` adopts it by.
 * - Each part is `class UIMeta extends PartElement.for(metaVocabulary) {}` plus, at most, its root element.
 */
export class PartElement extends ContentPart {
  @proto static sheets = [[PARTS_SHEET, partsCSS]] as const
  @proto static Fallback = ContentPartFallback
}
