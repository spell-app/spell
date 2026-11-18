/**
 * `epic-kickoff` family barrel:  defines `<epic-kickoff>` (SIDE EFFECT) and exports its component, `EpicKickoff`.
 * - Defines the families it draws in its shadow root first:  `<epic-text-box>` (its box), `<epic-picture>` (its
 *   pictures).
 */
import "spell/epic/components/epic-text-box"
import "spell/epic/components/epic-picture"

import { EpicKickoff } from "./EpicKickoff"

EpicKickoff.define()

export { EpicKickoff }
