/**
 * The JSON data family:  defines `<ui-json>` and exports its component, `UIJson`, its DOM element class,
 * `DOMJsonElement`, and `JsonChild`, how another element reads one.
 * - SIDE EFFECTS:  importing it defines the tag, and the ones its outline draws with:
 *   `<ui-icon>` (the toggles' chevrons), `<ui-button>` (Copy, quotes), `<ui-loader>` and `<ui-message>` (loading, errors).
 *   - The editors' families (`<ui-input>`, `<ui-select>`, `<ui-checkbox>`) load the first time something is edited.
 * - Also the library's `spell/ui/ui-json` entry (its size is in `notes/report.md`).
 */

import { JsonChild } from "./JsonChild"
import { DOMJsonElement, JSON_EDITOR_KINDS, UIJson, type JsonEditorKind, type JsonNavigateDetail } from "./UIJson"

import "spell/ui/components/ui-icon"
import "spell/ui/components/ui-button"
import "spell/ui/components/ui-loader"
import "spell/ui/components/ui-message"

UIJson.define()

export { DOMJsonElement, JSON_EDITOR_KINDS, JsonChild, UIJson, type JsonEditorKind, type JsonNavigateDetail }
