/**
 * `epic-item` family barrel:  defines `<epic-item>` (SIDE EFFECT) and exports its class.
 * - Defines the family it draws in its shadow root first:  `<epic-review>`.
 */
import "spell/epic/components/epic-review"

import { EpicItem } from "./EpicItem"

EpicItem.define()

export { EpicItem }
