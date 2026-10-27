/**
 * `epic-run` family barrel:  defines `<epic-run>` (SIDE EFFECT) and exports its component, `EpicRun`.
 * - Defines the families it draws in its shadow root first:  `<epic-run-row>` (each row), `<epic-send-buttons>` (Send).
 */
import "spell/epic/components/epic-run-row"
import "spell/epic/components/epic-send-buttons"

import { EpicRun } from "./EpicRun"

EpicRun.define()

export { EpicRun }
