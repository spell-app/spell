/**
 * `epic-change` family barrel:  defines `<epic-change>` (SIDE EFFECT) and exports its component, `EpicChange`.
 * - Defines the family it draws in its shadow root first:  `<epic-review>` (Accept, Reopen).
 */
import "spell-epic/components/epic-review"

import { EpicChange } from "./EpicChange"

EpicChange.define()

export { EpicChange }
