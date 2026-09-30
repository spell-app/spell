/**
 * Barrel for the modal -- also the `modal` lib entry (`@spell/ui/modal`), measured in `docs/report.md`.
 * - SIDE EFFECTS:
 *   - defines the content parts and `<ui-button>` (through `$/components/parts` and `$/components/button`:
 *     `UI.modals.*` builds its dialogs from them) and `<ui-modal>`, which registers as the owner of the `header`,
 *     `content`, `description` and `actions` parts
 *   - registers `ModalDialogs` as `UI.modals`' provider once the runtime has loaded, so `UI.modals.confirm()` /
 *     `alert()` / `prompt()` work
 */

import { isBrowser, UI } from "$/core"

import { UIModal } from "./UIModal"
import { ModalDialogs } from "./ModalDialogs"

import "$/components/parts"
import "$/components/button"

UIModal.define()
if (isBrowser()) void UI.load().then(() => UI.modals.register(new ModalDialogs()))

export { UIModal, ModalDialogs }
