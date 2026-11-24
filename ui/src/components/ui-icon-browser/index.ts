/**
 * The icon browser family:  defines `<ui-icon-browser>`, and exports its component, `UIIconBrowser`.
 * - Also the library's `spell/ui/ui-icon-browser` entry.
 * - SIDE EFFECTS:  importing it defines the tag, and what it draws in its shadow root:
 *   `<ui-button>` and `<ui-buttons>` (the pack switch, the tiles), `<ui-input>` (the search), `<ui-message>` (the
 *   usage line) and `<ui-label>` (the count);  and `<ui-icon-picker>`, whose `IconCatalog` it lists the icons with.
 */

import { UIIconBrowser } from "./UIIconBrowser"

import "spell/ui/components/ui-button"
import "spell/ui/components/ui-input"
import "spell/ui/components/ui-message"
import "spell/ui/components/ui-label"

UIIconBrowser.define()

export { UIIconBrowser }
