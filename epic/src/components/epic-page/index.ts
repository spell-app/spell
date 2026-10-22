/**
 * `epic-page` family barrel:  defines `<epic-page>` (SIDE EFFECT) and exports its class.
 * - Defines the families it draws in its shadow root first:  `<epic-agents>`, `<epic-state-filter>`,
 *   `<epic-test-run>`.
 */
import "spell-epic/components/epic-agents"
import "spell-epic/components/epic-state-filter"
import "spell-epic/components/epic-test-run"

import { EpicPage } from "./EpicPage"

EpicPage.define()

export { EpicPage }
