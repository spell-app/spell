/**
 * `epic-overview` family barrel:  defines `<epic-overview>` (SIDE EFFECT) and exports its class.
 * - Defines the families it draws in its shadow root first:  `<epic-review>`, `<epic-kickoff>` (epic `epic-engine` P75).
 */
import "spell/epic/components/epic-review"
import "spell/epic/components/epic-kickoff"

import { EpicOverview } from "./EpicOverview"

EpicOverview.define()

export { EpicOverview }
