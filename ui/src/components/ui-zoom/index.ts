/**
 * The zoom family:  defines `<ui-zoom>` and exports its component, `UIZoom`, and `ImageZoom`, which opens a page's
 * screenshots in it.
 * - SIDE EFFECT:  importing it defines the tag, and `<ui-modal>` (what it shows things full size in).
 * - Also the library's `spell-ui/ui-zoom` entry (its size is in `notes/report.md`).
 * - `ImageZoom` alone, with no element:  `spell-ui/components/ui-zoom/ImageZoom` (the docs runtime's import).
 */

import { UIZoom } from "./UIZoom"
import { ImageZoom } from "./ImageZoom"

import "spell-ui/components/ui-modal"

UIZoom.define()

export { UIZoom, ImageZoom }
