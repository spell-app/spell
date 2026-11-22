/**
 * `epic-item` family barrel:  defines `<epic-item>` (SIDE EFFECT) and exports its class.
 * - Defines the family it draws in its shadow root first:  `<epic-review>`, `<epic-clarify>` (its body's icon, T76),
 *   `<epic-update>` (its UPDATE label, T149).
 */
import "spell/epic/components/epic-review"
import "spell/epic/components/epic-clarify"
import "spell/epic/components/epic-update"

import { EpicItem } from "./EpicItem"

EpicItem.define()

export { EpicItem }
