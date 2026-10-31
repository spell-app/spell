/**
 * The split panel family:  defines `<ui-split-panel>` and exports its component, `UISplitPanel`.
 * - SIDE EFFECT:  importing it defines the tag.
 * - Also the library's `spell/ui/ui-split-panel` entry.
 */

import { UISplitPanel } from "./UISplitPanel"

UISplitPanel.define()

export { UISplitPanel }
