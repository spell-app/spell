/**
 * The dropdown family:  defines `<ui-dropdown>`, and exports its component.
 * - Also the `dropdown` lib entry (`spell/ui/ui-dropdown`), measured in `notes/report.md`.
 * - SIDE EFFECT:  importing it defines `<ui-item>` (through `spell/ui/components/ui-item`, first,
 *   so the dropdown can read upgraded items), then `<ui-dropdown>`.
 * - `UIItem` belongs to the `item` family (`spell/ui/ui-item`, shared with list and menu):
 *   it isn't exported here.
 */

import { UIDropdown } from "./UIDropdown"

import "spell/ui/components/ui-item"

UIDropdown.define()

export { UIDropdown }
