/**
 * The icon picker family:  defines `<ui-icon-picker>`, and exports its component, `UIIconPicker`,
 * with `IconCatalog` (the icons a picker offers, how they're grouped, and how a search finds them).
 * - Also the library's `spell/ui/ui-icon-picker` entry.
 * - SIDE EFFECTS:  importing it defines the tag, and the `<ui-button>` its panel draws (Browse).
 */

import { UIIconPicker } from "./UIIconPicker"
import { IconCatalog } from "./IconCatalog"

import "spell/ui/components/ui-button"

UIIconPicker.define()

export { UIIconPicker, IconCatalog }
export type { IconCategory, IconChoice, IconGroup, IconSearchTerms, IconSearchWords } from "./IconCatalog"
