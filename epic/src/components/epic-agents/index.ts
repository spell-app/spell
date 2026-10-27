/**
 * `epic-agents` family barrel:  defines `<epic-agents>` (SIDE EFFECT) and exports its component, `EpicAgents`.
 * - Defines the family it draws in its shadow root first:  `<epic-text-box>` (an agent's redirect note).
 */
import "spell/epic/components/epic-text-box"

import { EpicAgents } from "./EpicAgents"

EpicAgents.define()

export { EpicAgents }
