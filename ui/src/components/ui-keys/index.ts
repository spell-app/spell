/**
 * The keys family:  defines `<ui-keys>` and exports its component, `UIKeys`.
 * - SIDE EFFECT:  importing it defines the tag.
 * - Also the library's `spell-ui/ui-keys` entry (its size is in `notes/report.md`).
 */

import { UIKeys } from "./UIKeys"

UIKeys.define()

export { UIKeys }
