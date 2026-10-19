/**
 * `epic-page` family barrel:  defines `<epic-page>` (SIDE EFFECT) and exports its class.
 * - Defines the families it draws in its shadow root first:  `<epic-agents>`, `<epic-state-filter>`,
 *   `<epic-test-run>`.
 */
import "$/epics/components/epic-agents"
import "$/epics/components/epic-state-filter"
import "$/epics/components/epic-test-run"

import { EpicPage } from "./EpicPage"

EpicPage.define()

export { EpicPage }
