/**
 * The popup family:  defines `<ui-popup>` and exports its component, `UIPopup`.
 * - SIDE EFFECT:  importing it defines `<ui-popup>`, the owner of the `header` and `content` parts.
 * - NOTE: the tooltip (`data-tooltip`) needs no family:  the runtime's `DataTooltips` shows it;  with no script it's `native.css`'s, a page sheet.
 * - Also the library's `spell/ui/ui-popup` entry (its size is in `notes/report.md`).
 */

import { UIPopup } from "./UIPopup"

UIPopup.define()

export { UIPopup }
