/**
 * The toast family:  defines `<ui-toast>` and exports its component, `UIToast`, and its DOM element, `DOMToastElement`.
 * - SIDE EFFECTS:
 *   - defines `<ui-toast>`, and `<ui-button>` / `<ui-buttons>` too
 *     (through `spell-ui/components/ui-button`:  `UI.toast()` builds its actions from them)
 *   - registers `ToastStack` as `UI.toasts`' provider once the runtime has loaded, so `UI.toast({…})` works
 * - Also the library's `spell-ui/ui-toast` entry (its size is in `notes/report.md`).
 */

import { E, UI } from "spell-ui/core"
import { DOMToastElement, UIToast } from "./UIToast"
import { ToastStack } from "./ToastStack"

import "spell-ui/components/ui-button"

UIToast.define()
if (E.isBrowser()) void UI.load().then(() => UI.toasts.register(new ToastStack()))

export { UIToast, DOMToastElement, ToastStack }
