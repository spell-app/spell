/**
 * `epic-section` family barrel:  defines `<epic-section>` (SIDE EFFECT) and exports its class.
 * - Defines the families it draws in its shadow root first:  `<epic-review>`, `<epic-new-item>`, `<epic-state-filter>`.
 */
import "$/epics/components/epic-review"
import "$/epics/components/epic-new-item"
import "$/epics/components/epic-state-filter"

import { EpicSection } from "./EpicSection"

EpicSection.define()

export { EpicSection }
