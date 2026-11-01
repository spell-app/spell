/**
 * The JSON data family:  defines `<ui-json>` and exports its component, `UIJson`, its DOM element class,
 * `DOMJsonElement`, and `JsonChild`, how another element reads one.
 * - SIDE EFFECT:  importing it defines the tag.
 *   It draws nothing, so unlike the other source elements it needs no `<ui-loader>` or `<ui-message>`.
 * - Also the library's `spell/ui/ui-json` entry (its size is in `notes/report.md`).
 */

import { JsonChild } from "./JsonChild"
import { DOMJsonElement, UIJson } from "./UIJson"

UIJson.define()

export { DOMJsonElement, JsonChild, UIJson }
