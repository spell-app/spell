/**
 * The app menu family:  defines `<ui-app-menu>` and exports its component, `UIAppMenu`.
 * - SIDE EFFECT:  importing it defines the tag.
 *   `UIAppMenu` imports the menu family first, which defines `<ui-menu>` and `<ui-item>`:
 *   an app menu extends the menu, and holds generic items.
 * - Also the library's `spell/ui/ui-app-menu` entry.
 */

import { UIAppMenu } from "./UIAppMenu"

UIAppMenu.define()

export { UIAppMenu }
