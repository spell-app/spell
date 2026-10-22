/**
 * `epic-overview` family barrel:  defines `<epic-overview>` (SIDE EFFECT) and exports its class.
 * - Defines the family it draws in its shadow root first:  `<epic-review>`.
 */
import "spell-epic/components/epic-review"

import { EpicOverview } from "./EpicOverview"

EpicOverview.define()

export { EpicOverview }
