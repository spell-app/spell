/**
 * `epic-new-item` family barrel:  defines `<epic-new-item>` (SIDE EFFECT) and exports its component, `EpicNewItem`.
 * - Defines the family it draws in its shadow root first:  `<epic-text-box>` (a new item's note).
 */
import "spell-epic/components/epic-text-box"

import { EpicNewItem } from "./EpicNewItem"

EpicNewItem.define()

export { EpicNewItem }
