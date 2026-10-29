/**
 * `epic-update` family barrel:  defines `<epic-update>` (SIDE EFFECT) and exports its class.
 * - Defines the family it draws in its shadow root first:  `<epic-review>` (Seen).
 */
import "spell/epic/components/epic-review"

import { EpicUpdate } from "./EpicUpdate"

EpicUpdate.define()

export { EpicUpdate }
