/**
 * Barrel + side-effect entry for the spike's button family:  defines `<ui-button>`, `<ui-buttons>`, `<ui-or>`.
 * - One entry per component family, so `vite build` can size `ui-button` alone.
 */

import { UIButton } from "./UIButton"
import { UIButtons } from "./UIButtons"
import { UIOr } from "./UIOr"

export { UIButton, UIButtons, UIOr }

// SIDE EFFECT:  registration under the vocabulary tags
UIButton.define()
UIButtons.define()
UIOr.define()
