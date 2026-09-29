/**
 * Barrel + side-effect entry for the spike's dropdown family:  defines `<ui-item>` (first, so items parse
 * upgraded) and `<ui-dropdown>`.
 */

import { UIItem } from "./UIItem"
import { UIDropdown } from "./UIDropdown"

export { UIItem, UIDropdown }
export type { MenuEntry } from "./UIItem"

// SIDE EFFECT:  registration under the vocabulary tags
UIItem.define()
UIDropdown.define()
