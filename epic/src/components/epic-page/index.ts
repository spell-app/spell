/**
 * `epic-page` family barrel:  defines `<epic-page>` (SIDE EFFECT) and exports its class.
 * - Defines the families it draws in its shadow root first:  `<epic-agents>`, `<epic-state-filter>`.
 */
import "$/epics/components/epic-agents"
import "$/epics/components/epic-state-filter"

import { EpicPage } from "./EpicPage"

EpicPage.define()

export { EpicPage }
