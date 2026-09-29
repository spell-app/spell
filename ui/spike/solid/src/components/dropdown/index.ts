/**
 * Barrel for the spike's dropdown components -- also the `dropdown` library entry measured in `REPORT.md`.
 * - SIDE EFFECT:  defines `<ui-item>` (first, so the dropdown can read upgraded items) and `<ui-dropdown>`.
 */

import { UIDropdown } from "./UIDropdown"
import { UIItem } from "./UIItem"

UIItem.define()
UIDropdown.define()

export { UIDropdown, UIItem }
