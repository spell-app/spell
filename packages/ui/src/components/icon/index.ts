/**
 * Barrel for the icon components -- also the `icon` lib entry (`@spell/ui/icon`), measured in `docs/report.md`.
 * - SIDE EFFECT:  defines `<ui-icons>` (first, so it is a registered owner when icons resolve) and `<ui-icon>`.
 */

import { UIIcon } from "./UIIcon"
import { UIIcons } from "./UIIcons"

UIIcons.define()
UIIcon.define()

export { UIIcon, UIIcons }
