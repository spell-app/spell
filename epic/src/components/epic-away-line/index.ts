/**
 * `epic-away-line` family barrel:  defines `<epic-away-line>` (SIDE EFFECT) and exports its component, `EpicAwayLine`.
 * - Defines the family it draws in its shadow root first:  `<epic-review>` (Read).
 */
import "spell/epic/components/epic-review"

import { EpicAwayLine } from "./EpicAwayLine"

EpicAwayLine.define()

export { EpicAwayLine }
