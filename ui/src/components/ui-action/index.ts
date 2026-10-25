/**
 * The action family:  defines `<ui-action>` and exports its component, `UIAction`.
 * - SIDE EFFECT:  importing it defines the tag.
 *   `UIAction` imports the item family first, which defines `<ui-item>`:  an action extends the item.
 * - Also the library's `spell-ui/ui-action` entry.
 */

import { UIAction } from "./UIAction"

UIAction.define()

export { UIAction, type ActionToDraw } from "./UIAction"
