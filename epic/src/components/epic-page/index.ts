/**
 * `epic-page` family barrel:  defines `<epic-page>` (SIDE EFFECT) and exports its class.
 * - Defines the families it draws in its shadow root first:  `<epic-agents>`, `<epic-send-buttons>`,
 *   `<epic-state-filter>`, `<epic-focus>` (Focus mode).
 */
import "spell/epic/components/epic-agents"
import "spell/epic/components/epic-send-buttons"
import "spell/epic/components/epic-state-filter"
import "spell/epic/components/epic-focus"

import { EpicPage } from "./EpicPage"

EpicPage.define()

export { EpicPage }
