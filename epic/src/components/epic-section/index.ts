/**
 * `epic-section` family barrel:  defines `<epic-section>` (SIDE EFFECT) and exports its class.
 * - Defines the families it draws in its shadow root first:  `<epic-review>`, `<epic-new-item>`, `<epic-state-filter>`.
 */
import "spell/epic/components/epic-review"
import "spell/epic/components/epic-new-item"
import "spell/epic/components/epic-state-filter"

import { EpicSection } from "./EpicSection"

EpicSection.define()

export { EpicSection }
