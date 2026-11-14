/**
 * The menu family:  defines `<ui-menu>` and `<ui-submenu>`, and exports their components, `UIMenu` and `UISubmenu`.
 * - SIDE EFFECT:  importing it defines the tags, and `<ui-item>` first (through `spell/ui/components/ui-item`:
 *   menus hold generic items, and a submenu is one).
 *   The menu registers as the owner of `item`, `menu` (sub-menus) and `header` parts.
 * - Also the library's `spell/ui/ui-menu` entry (its size is in `notes/report.md`).
 * - `<ui-submenu>`:  a menu's row that opens a fly-out beside it, the items inside it or a menu named by id.
 * - `SubMenuAim`:  keeps an open sub-menu open while the pointer heads for it, for menus that open sub-menus beside
 *   their rows on hover (`<ui-submenu>`, the editor's bar menus).
 */

import { UIMenu } from "./UIMenu"
import { UISubmenu } from "./UISubmenu"
import { SubMenuAim, type SubMenuAimSetup } from "./SubMenuAim"

import "spell/ui/components/ui-item"

UIMenu.define()
UISubmenu.define()

export { UIMenu, UISubmenu, SubMenuAim, type SubMenuAimSetup }
