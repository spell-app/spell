/**
 * The stack family:  defines `<ui-stack>` and exports its component, `UIStack`.
 * - SIDE EFFECT:  importing it defines the tag.
 * - Also the library's `spell-ui/ui-stack` entry (its size is in `notes/report.md`).
 */

import { UIStack } from "./UIStack"

UIStack.define()

export { UIStack }
