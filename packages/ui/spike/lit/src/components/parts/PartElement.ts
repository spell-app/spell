import { proto } from "$/util"
import { ContentPart, PARTS_SHEET } from "../../elements"

import partsCSS from "$/components/parts/parts.css?inline"

/**
 * `ContentPart` bound to `parts.css`:  the one sheet every generic content part adopts.
 * - Why a class of its own:  the element core (`ContentPart`) stays CSS-free, and the sheet is registered
 *   under `PARTS_SHEET`, the name a statistic's `<ui-label>` adopts it by.
 * - Each part is `class UIMeta extends PartElement.for(metaVocabulary) {}` plus, at most, its root element.
 */
export class PartElement extends ContentPart {
  @proto static sheets = [[PARTS_SHEET, partsCSS]] as const
}
