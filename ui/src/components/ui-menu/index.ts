/**
 * The menu family:  defines `<ui-menu>` and exports its component, `UIMenu`.
 * - SIDE EFFECT:  importing it defines the tag, and `<ui-item>` first (through `spell/ui/components/ui-item`:
 *   menus hold generic items).  The menu registers as the owner of `item`, `menu` (sub-menus) and `header` parts.
 * - Also the library's `spell/ui/ui-menu` entry (its size is in `notes/report.md`).
 * - `SubMenuAim`:  keeps an open sub-menu open while the pointer heads for it, for menus that open sub-menus beside
 *   their rows on hover (the editor's bar menus).
 */

import { UIMenu } from "./UIMenu"
import { SubMenuAim, type SubMenuAimSetup } from "./SubMenuAim"

import "spell/ui/components/ui-item"

UIMenu.define()

export { UIMenu, SubMenuAim, type SubMenuAimSetup }
