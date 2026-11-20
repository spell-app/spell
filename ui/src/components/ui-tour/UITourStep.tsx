import type { JSX } from "@solidjs/web"

import { E } from "spell/ui/core"
import { tourStepVocabulary } from "./UITourStep.en"

/****************
 * ### `DOMTourStepElement`
 * The DOM element of `<ui-tour-step>`:  it adds `targetElement`, what the step points at when a script names it
 * as an element rather than by its `target` name.
 * - Above the component:  its `elementSetup` reads this class while the component is defined.
 ****************/
export class DOMTourStepElement extends E.DOMElement<UITourStep> {
  /** What the step points at, set by script:  wins over `target`. */
  get targetElement(): Element | undefined {
    return TARGET_ELEMENTS.get(this)
  }

  set targetElement(element: Element | undefined) {
    if (element) TARGET_ELEMENTS.set(this, element)
    else TARGET_ELEMENTS.delete(this)
  }
}

/****************
 * ### `UITourStep`
 * The component behind `<ui-tour-step>`:  one step of a `<ui-tour>`, what it says in its content.
 * - It draws only its content (a slot):  the tour shows it in its box while it's the step showing,
 *   and keeps the others `hidden`.
 * - Its attributes say where the tour points and how it goes on (`target`, `placement`, `dim`, `wait-for`):
 *   `UITour` reads them.
 ****************/
export class UITourStep extends E.UIComponent<Vocabulary> {
  @E.proto static vocabulary = tourStepVocabulary
  @E.protoMerged static elementSetup = {
    DOMElement: DOMTourStepElement,
    // shown and hidden by its tour, at once:  the box around it moves anyway
    animation: "none"
  } satisfies Partial<E.ElementSetup>

  render(): JSX.Element {
    return <slot />
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UITourStep extends E.AttributeValues<Vocabulary> {}

/** Each step's `targetElement`:  a DOM element class keeps no fields of its own. */
const TARGET_ELEMENTS = new WeakMap<DOMTourStepElement, Element>()

/** The vocabulary type, for brevity. */
type Vocabulary = typeof tourStepVocabulary
