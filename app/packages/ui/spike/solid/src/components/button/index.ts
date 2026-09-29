/**
 * Barrel for the spike's button components -- also the `button` library entry measured in `REPORT.md`.
 * - SIDE EFFECT:  defines `<ui-button>`, `<ui-buttons>`, `<ui-or>`.
 */

import { UIButton } from "./UIButton"
import { UIButtons } from "./UIButtons"
import { UIOr } from "./UIOr"

UIButton.define()
UIButtons.define()
UIOr.define()

export { UIButton, UIButtons, UIOr }
