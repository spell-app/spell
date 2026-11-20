/**
 * Every name `<ui-dial>` uses:  tag, attributes (kind + allowed values), events, parts, states.
 * Schema:  `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - Class words come out through `ClassBuilder`:
 *   `<ui-dial size="small" color="orange" ticks readonly>` => `ui small orange ticked read-only dial`.
 * - `min` / `max` / `step` / `value` are a slider's:  a dial is the same number line, bent round.
 */

import type { E } from "spell/ui/core"
import * as UIT from "spell/ui/components/components.types"

/****************
 * ### `<ui-dial>`
 * A dial:  a round control that picks a number, by dragging its handle round an open ring.
 ****************/
export const dialVocabulary = {
  tag: "ui-dial",
  icon: "gauge",
  snippet: '<ui-dial label="Volume"></ui-dial>',
  formControl: true,
  topics: ["inputs", "forms", "controls", "modules"],
  aka: ["knob", "rotary knob", "radial slider", "circular slider", "gauge", "arc slider"],
  skeleton: "inline 10 x 11.5",
  noun: "dial",
  partOfSpeech: "action",
  description: "A dial lets people pick a number by turning it, with its value in the middle and its label under it.",
  attributes: [
    {
      name: "label",
      group: "name",
      kind: "string",
      description:
        "The words under the dial;  also its name for screen readers, unless `aria-label` or a `<label for>` names it."
    },
    {
      name: "size",
      group: "appearance",
      kind: "size",
      description: "Size of the whole dial, `mini` ... `massive`."
    },
    {
      name: "color",
      group: "appearance",
      kind: "color",
      description: "Hue of the arc and the handle;  uncoloured, the theme's primary colour."
    },
    {
      name: "ticks",
      group: "appearance",
      kind: "string",
      description:
        'Dots round the inside of the ring:  `ticks` alone draws 9 (8 gaps), `ticks="10"` that many gaps.  ' +
        "Only a look:  values still snap to `step`."
    },
    {
      name: "unit",
      group: "appearance",
      kind: "string",
      description: 'Written right after the number:  `unit="%"` shows `98%`, `unit=" px"` shows `16 px`.'
    },
    {
      name: "disabled",
      group: "states",
      kind: "keyOnly",
      description: "Can't be used:  dimmed, not focusable, left out of the form."
    },
    {
      ...UIT.FormControlAttributes.readonly,
      description: "Shows its value but can't be changed;  still focusable and submitted."
    },
    { name: "min", group: "form", kind: "number", default: 0, description: "Lowest value, at the ring's start." },
    { name: "max", group: "form", kind: "number", default: 100, description: "Highest value, at the ring's end." },
    {
      name: "step",
      group: "form",
      kind: "number",
      default: 1,
      description: "Values snap to multiples of it from `min`;  `0`:  any."
    },
    {
      name: "value",
      group: "form",
      kind: "number",
      reflect: false,
      description: "The value, default `min`.  Attribute:  the starting (and reset) value;  property:  the live one."
    },
    UIT.FormControlAttributes.name,
    UIT.FormControlAttributes.parameter,
    {
      ...UIT.FormControlAttributes.required,
      description:
        "Form validation:  a value must be chosen, by the page (`value`) or by turning the dial.  " +
        "Unset, the handle rests at `min` but counts as no value (`valueMissing`)."
    }
  ],
  events: [
    {
      name: "ui-moved",
      detail: "{ value: number, originalEvent?: Event }",
      description: "The handle moved (each drag step, key or wheel turn).  A handler that re-sets `value` wins."
    },
    {
      name: "ui-changed",
      detail: "{ value: number, originalEvent?: Event }",
      description: "A change was committed:  on a key or wheel turn, or when a drag ends somewhere new."
    }
  ],
  slots: [],
  parts: [
    { name: "dial", description: "The root box:  the ring, then the label." },
    { name: "control", description: "The round control itself (`role=slider`), which takes focus." },
    { name: "track", description: "The empty ring." },
    { name: "track-fill", description: "The coloured arc, from the start to the value." },
    { name: "handle", description: "The round handle, at the arc's end." },
    { name: "disc", description: "The disc in the middle." },
    { name: "ticks", description: "The tick dots (`ticks`)." },
    { name: "value", description: "The value, written in the disc." },
    { name: "label", description: "The words under the dial (`label`)." }
  ],
  states: [
    { name: "disabled", description: "Can't be used." },
    { name: "dragging", description: "The handle is being dragged." },
    { ...UIT.FormControlStates.invalid, description: "Fails validation (`required`), once a person has interacted." }
  ],
  texts: []
} as const satisfies E.ComponentVocabulary
