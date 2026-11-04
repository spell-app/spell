/**
 * The dimension family:  defines `<ui-dimension>` and exports its component, `UIDimension`.
 * - SIDE EFFECT:  importing it defines the tag.
 * - Also the library's `spell/ui/ui-dimension` entry.
 */

import { UIDimension } from "./UIDimension"

UIDimension.define()

export { UIDimension }
