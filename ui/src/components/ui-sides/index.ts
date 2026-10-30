/**
 * The sides family:  defines `<ui-sides>`, and exports its component and its DOM element class, `DOMSidesElement`.
 * - Also the `sides` lib entry (`spell/ui/ui-sides`).
 * - SIDE EFFECT:  importing it defines the tag.
 */

import { DOMSidesElement, UISides } from "./UISides"

UISides.define()

export { UISides, DOMSidesElement }
