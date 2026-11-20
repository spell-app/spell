/**
 * The dial family:  defines `<ui-dial>`, and exports its component.
 * - Also the library's `spell/ui/ui-dial` entry.
 * - SIDE EFFECT:  importing it defines the tag.
 * - NOTE: `DialArc` (the ring's geometry) is exported too;  its value maths is the slider's `SliderScale`.
 */

import { UIDial } from "./UIDial"
import { DialArc } from "./DialArc"

UIDial.define()

export { UIDial, DialArc }
