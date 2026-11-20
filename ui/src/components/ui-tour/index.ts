/**
 * The tour family:  defines `<ui-tour>` and `<ui-tour-step>`, and exports their components and DOM elements,
 * and `TourMemory`, where a tour remembers it was taken.
 * - SIDE EFFECT:  importing it defines the tags, and the elements a tour draws with:
 *   a segment, a header, text, buttons and steps.
 * - SIDE EFFECT:  it puts the page's tour control on `globalThis[Symbol.for("spell-ui:tours")]`, which Spell's tour
 *   words call (`start tour "x"` ...;  the parser's core, `tours.ts`):  compiled Spell never imports Spell UI.
 * - Also the library's `spell/ui/ui-tour` entry.
 */

import { DOMTourElement, UITour, type TourControl, type TourEndReason } from "./UITour"
import { DOMTourStepElement, UITourStep } from "./UITourStep"
import { TourMemory } from "./TourMemory"

import "spell/ui/components/ui-button"
import "spell/ui/components/ui-parts"
import "spell/ui/components/ui-segment"
import "spell/ui/components/ui-step"
import "spell/ui/components/ui-text"

UITour.define()
UITourStep.define()

if (typeof globalThis !== "undefined") {
  ;(globalThis as Record<symbol, unknown>)[Symbol.for("spell-ui:tours")] = UITour.control
}

export { UITour, DOMTourElement, UITourStep, DOMTourStepElement, TourMemory, type TourControl, type TourEndReason }
