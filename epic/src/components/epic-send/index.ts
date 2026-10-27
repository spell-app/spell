/**
 * `epic-send` family barrel:  defines `<epic-send>` (SIDE EFFECT) and exports its component, `EpicSend`.
 * - Defines the family it draws in its shadow root first:  `<epic-send-buttons>`.
 */
import "spell/epic/components/epic-send-buttons"

import { EpicSend } from "./EpicSend"

EpicSend.define()

export { EpicSend }
