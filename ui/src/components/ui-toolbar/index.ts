/**
 * The toolbar family:  defines `<ui-toolbar>` and exports its component, `UIToolbar`.
 * - SIDE EFFECT:  importing it defines the tag.
 *   `UIToolbar` imports the menu family first, which defines `<ui-menu>` and `<ui-item>`:
 *   a toolbar extends the menu, and holds generic items.
 * - Also the library's `spell-ui/ui-toolbar` entry (its size is in `notes/report.md`).
 */

import { UIToolbar } from "./UIToolbar"

UIToolbar.define()

export { UIToolbar }
