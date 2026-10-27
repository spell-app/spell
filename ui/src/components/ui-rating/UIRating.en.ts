/**
 * Every name `<ui-rating>` uses:  tag, attributes (kind + allowed values), events, parts, states, texts.
 * Schema:  `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - Class words come out through `ClassBuilder`, in Fomantic's grammar:
 *   `<ui-rating size="large" color="yellow" readonly>` => `ui large yellow read-only rating`.
 * - `icon` is an icon NAME (`star`, `heart`, any `<ui-icon>` name), not a class:  Fomantic 2.9 reads it from
 *   `data-icon` too.
 */

import type { E } from "spell-ui/core"
import * as UIT from "spell-ui/components/components.types"

/****************
 * ### `<ui-rating>`
 * A rating:  a radio group of `max-rating` icons, the first `value` of them filled.
 ****************/
export const ratingVocabulary = {
  tag: "ui-rating",
  formControl: true,
  topics: ["inputs", "controls", "forms", "feedback", "modules"],
  aka: ["stars", "star rating", "score", "review stars", "hearts"],
  skeleton: "inline 5.5 x 1.1",
  noun: "rating",
  description: "A rating indicates people's interest in content.",
  attributes: [
    {
      name: "size",
      group: "appearance",
      kind: "size",
      description: "Icon size, `mini` ... `massive`;  `medium` is the default."
    },
    { name: "color", group: "appearance", kind: "color", description: "Hue of the filled icons." },
    {
      name: "disabled",
      group: "states",
      kind: "keyOnly",
      description: "Can't be used:  left out of the form, not focusable.  Shows its value."
    },
    {
      ...UIT.FormControlAttributes.readonly,
      description: "Shows its value but can't be changed;  still focusable and submitted."
    },
    {
      name: "icon",
      group: "content",
      kind: "icon",
      default: "star",
      description: "Icon name, e.g. `star` (default), `heart`."
    },
    {
      name: "max-rating",
      group: "appearance",
      kind: "number",
      default: 4,
      description: "How many icons (Fomantic's default:  4)."
    },
    {
      name: "value",
      group: "form",
      kind: "number",
      reflect: false,
      description:
        "Rating, `0` (none) ... `max-rating`;  a fraction shows a partly filled icon.  Attribute:  the starting " +
        "(and reset) value;  property:  the live value."
    },
    {
      name: "clearable",
      group: "form",
      kind: "boolean",
      description: "Choosing the current rating again clears it (as do Backspace / Delete);  always, with one icon."
    },
    UIT.FormControlAttributes.name,
    { ...UIT.FormControlAttributes.required, description: "Form validation:  a rating must be given." }
  ],
  events: [
    {
      name: "ui-changed",
      detail: "{ value: number, originalEvent?: Event }",
      description: "The person rated (`0` when cleared).  A handler that re-sets `value` wins."
    }
  ],
  slots: [],
  parts: [
    { name: "rating", description: "The radio group (`<fieldset role=radiogroup>`)." },
    { name: "icon", description: "One icon:  a `<label>` around its radio and glyph." },
    { name: "control", description: "One native radio (invisible, over its icon)." }
  ],
  states: [{ name: "disabled", description: "Can't be used." }, UIT.FormControlStates.invalid],
  texts: [
    { key: "ratingItem", text: "{value} of {max}", description: "Accessible name of each icon's radio." },
    { key: "ratingValue", text: "Rated {value} of {max}", description: "Description of a fractional rating." }
  ]
} as const satisfies E.ComponentVocabulary
