/**
 * `epic-option-form` family barrel:  defines `<epic-option-form>` (SIDE EFFECT) and exports its component.
 * - Defines the family it draws in its shadow root first:  `<epic-text-box>` (the option's note).
 */
import "spell/epic/components/epic-text-box"

import { EpicOptionForm, type OptionFormSaved } from "./EpicOptionForm"

EpicOptionForm.define()

export { EpicOptionForm, type OptionFormSaved }
