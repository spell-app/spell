/**
 * Every name `<ui-sides>` uses:  tag, attributes, events, parts, states, texts.
 * Schema:  `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - Class words come out through `ClassBuilder`:  `<ui-sides size="small">` => `ui small sides`.
 */

import type { E } from "spell/ui/core"
import * as UIT from "spell/ui/components/components.types"

/****************
 * ### `<ui-sides>`
 * Four lengths, one per side, for a margin or a padding:  a number box each, its side's letter inside it.
 ****************/
export const sidesVocabulary = {
  tag: "ui-sides",
  formControl: true,
  topics: ["inputs", "forms", "controls"],
  aka: ["margin", "padding", "box model", "spacing", "insets", "sides"],
  skeleton: "inline 8 x 4.5",
  noun: "sides",
  description:
    "Sides edit four lengths at once, top, left, right and bottom, as a margin or a padding:  a number box per side.",
  attributes: [
    {
      name: "size",
      group: "appearance",
      kind: "size",
      description: "Size of its boxes, `mini` ... `massive`;  `medium` is the default."
    },
    {
      name: "value",
      group: "form",
      kind: "json",
      reflect: false,
      description:
        "Its lengths, in either form, given back in the form it was given:  CSS's text, one to four numbers " +
        '(top right bottom left:  `value="10 20 10 20"`), or an object, `{ top, left, right, bottom }` ' +
        "(as the property, or as JSON text in the attribute).  A side left out is empty."
    },
    {
      name: "sides",
      group: "appearance",
      kind: "string",
      description:
        "Which sides it shows:  `top bottom`, `left right` (one row) ...  None:  all four, top / left and right / bottom."
    },
    {
      name: "disabled",
      group: "states",
      kind: "keyOnly",
      description: "Can't be used:  left out of the form, not focusable."
    },
    { ...UIT.FormControlAttributes.readonly, description: "Shows its lengths but they can't be changed." },
    UIT.FormControlAttributes.name,
    { ...UIT.FormControlAttributes.required, description: "Form validation:  every side shown must have a length." }
  ],
  events: [
    {
      name: "ui-changed",
      detail:
        "{ value: string | { top?: number, left?: number, right?: number, bottom?: number }, originalEvent?: Event }",
      description: "A length changed:  `value` in the form it was given.  A handler that re-sets `value` wins."
    }
  ],
  slots: [],
  parts: [
    { name: "sides", description: "The box of its number boxes." },
    { name: "side", description: "One side:  a `<label>` around its letter and its number box." },
    { name: "letter", description: "A side's letter (T, L, R, B), faded, inside its box." },
    { name: "input", description: "One side's native number box." }
  ],
  states: [{ name: "disabled", description: "Can't be used." }, UIT.FormControlStates.invalid],
  texts: [
    { key: "top", text: "Top", description: "The top box's name." },
    { key: "left", text: "Left", description: "The left box's name." },
    { key: "right", text: "Right", description: "The right box's name." },
    { key: "bottom", text: "Bottom", description: "The bottom box's name." },
    { key: "topLetter", text: "T", description: "The letter inside the top box." },
    { key: "leftLetter", text: "L", description: "The letter inside the left box." },
    { key: "rightLetter", text: "R", description: "The letter inside the right box." },
    { key: "bottomLetter", text: "B", description: "The letter inside the bottom box." }
  ]
} as const satisfies E.ComponentVocabulary
