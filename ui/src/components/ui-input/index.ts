/**
 * The input family:  defines `<ui-input>` and `<ui-textarea>`, and exports their components.
 * - Also the `input` lib entry (`spell/ui/ui-input`), measured in `notes/report.md`.
 * - SIDE EFFECT:  importing it defines the tags, and `<ui-button>`, which draws their clear button (`clearable`).
 */

import { UIInput } from "./UIInput"
import { UITextarea } from "./UITextarea"

import "spell/ui/components/ui-button"

UIInput.define()
UITextarea.define()

export { UIInput, UITextarea }
