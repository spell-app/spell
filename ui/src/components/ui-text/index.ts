/**
 * The text family:  defines `<ui-text>` and `<ui-link>`, and exports their components, `UIText` and `UILink`.
 * - SIDE EFFECT:  importing it defines the tag.
 * - Also the library's `spell-ui/ui-text` entry (its size is in `notes/report.md`).
 */

import { UIText } from "./UIText"
import { UILink } from "./UILink"

UIText.define()
UILink.define()

export { UIText, UILink }
