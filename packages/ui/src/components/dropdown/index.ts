/**
 * Barrel for the dropdown components -- also the `dropdown` lib entry (`@spell/ui/dropdown`),
 * measured in `docs/report.md`.
 * - SIDE EFFECT:  defines `<ui-item>` (first, so the dropdown can read upgraded items) and `<ui-dropdown>`.
 */

import { UIDropdown } from "./UIDropdown"
import { UIItem } from "./UIItem"

UIItem.define()
UIDropdown.define()

export { UIDropdown, UIItem }
