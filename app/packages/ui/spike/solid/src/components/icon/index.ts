/**
 * Barrel for the spike's icon components -- also the `icon` library entry measured in `REPORT.md`.
 * - SIDE EFFECT:  defines `<ui-icons>` (first, so it is a registered owner when icons resolve) and `<ui-icon>`.
 */

import { UIIcon } from "./UIIcon"
import { UIIcons } from "./UIIcons"

UIIcons.define()
UIIcon.define()

export { UIIcon, UIIcons }
