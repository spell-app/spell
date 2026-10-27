/**
 * The icon picker family:  defines `<ui-icon-picker>`, and exports its component, `UIIconPicker`,
 * with `IconCatalog` (the icons a picker offers, how they're grouped, and how a search finds them).
 * - Also the library's `spell-ui/ui-icon-picker` entry.
 * - SIDE EFFECT:  importing it defines the tag.
 */

import { UIIconPicker } from "./UIIconPicker"
import { IconCatalog } from "./IconCatalog"

UIIconPicker.define()

export { UIIconPicker, IconCatalog }
export type { IconCategory, IconChoice, IconGroup, IconSearchTerms, IconSearchWords } from "./IconCatalog"
