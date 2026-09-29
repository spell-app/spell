/**
 * Barrel + side-effect entry for the spike's icon family:  defines `<ui-icons>` (first, so it's a known owner
 * when icons connect) and `<ui-icon>`.
 */

import { UIIcon } from "./UIIcon"
import { UIIcons } from "./UIIcons"

export { UIIcon, UIIcons }

// SIDE EFFECT:  registration under the vocabulary tags
UIIcons.define()
UIIcon.define()
