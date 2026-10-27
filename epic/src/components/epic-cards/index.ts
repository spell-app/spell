/**
 * `epic-cards` family barrel:  defines `<epic-cards>` (SIDE EFFECT) and exports its component, `EpicCards`.
 * - it draws the Epics page's list and cards (`epic-list`):  their barrel first, so they're defined wherever it is
 */
import "spell/epic/components/epic-list"

import { EpicCards } from "./EpicCards"

EpicCards.define()

export { EpicCards }
