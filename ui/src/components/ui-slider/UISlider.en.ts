/**
 * Every name `<ui-slider>` uses:  tag, attributes (kind + allowed values), events, parts, states, texts.
 * Schema:  `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - Class words come out through `ClassBuilder`, in Fomantic's grammar:
 *   `<ui-slider color="blue" labeled ticked range align="bottom">` =>
 *   `ui blue labeled range ticked bottom aligned slider`.
 * - `value` and `end` are Fomantic's `start` / `end` settings:  the (first) thumb, and a `range`'s second thumb.
 */

import type { E } from "spell-ui/core"
import * as UIT from "spell-ui/components/components.types"

/****************
 * ### `<ui-slider>`
 * A slider:  one thumb, or two for a `range`, on a track, with optional step labels and ticks.
 ****************/
export const sliderVocabulary = {
  tag: "ui-slider",
  formControl: true,
  topics: ["inputs", "forms", "controls", "modules"],
  aka: ["range", "range slider", "volume", "scrubber", "track bar"],
  skeleton: "16 x 1.25",
  noun: "slider",
  description: "A slider lets people select values within a range.",
  attributes: [
    { name: "size", group: "appearance", kind: "size", description: "Size of track and thumbs, `mini` ... `massive`." },
    {
      name: "color",
      group: "appearance",
      kind: "color",
      description: "Hue of the filled track (and of `basic` thumbs)."
    },
    {
      name: "appearance",
      group: "appearance",
      kind: "multiple",
      values: ["basic"],
      classes: {},
      replaces: [{ from: "basic", value: "basic" }],
      description: "`basic`:  thumbs in the fill colour instead of white.  Old name:  `basic`."
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
    {
      name: "hover",
      group: "appearance",
      kind: "keyOnly",
      description: "Thumbs show only while the slider is hovered or focused."
    },
    { name: "inverted", group: "appearance", kind: "keyOnly", description: "For dark backgrounds." },
    { name: "labeled", group: "appearance", kind: "keyOnly", description: "Labels along the track, at the steps." },
    {
      name: "range",
      group: "appearance",
      kind: "keyOnly",
      description: "Two thumbs:  `value` .. `end`.  The form gets two entries under `name`."
    },
    {
      name: "smooth",
      group: "appearance",
      kind: "keyOnly",
      description: "Thumbs follow the pointer smoothly;  values still snap."
    },
    {
      name: "ticked",
      group: "appearance",
      kind: "keyOnly",
      description:
        "A tick at every step (or `tick-step`):  through the track with `labeled`;  alone, a short tick under the " +
        "track, no numbers (as a native range's tick marks)."
    },
    {
      name: "direction",
      group: "layout",
      kind: "multiple",
      values: ["vertical", "reversed"],
      classes: {},
      replaces: [
        { from: "vertical", value: "vertical" },
        { from: "reversed", value: "reversed" }
      ],
      description:
        "Which way it runs, several words at once:  `vertical` (upright, filling the host's height, min at the " +
        "top), `reversed` (from the right, or upright from the bottom).  Old names:  `vertical`, `reversed`."
    },
    {
      name: "align",
      group: "layout",
      kind: "valueAndKey",
      key: "aligned",
      values: ["bottom", "right"],
      replaces: ["aligned"],
      description:
        "With `labeled`:  labels `bottom` (below the track) or, `vertical`, `right` of it.  Old name:  `aligned`."
    },
    { name: "min", group: "form", kind: "number", default: 0, description: "Lowest value." },
    {
      name: "max",
      group: "form",
      kind: "number",
      default: 20,
      description: "Highest value (Fomantic's default:  20)."
    },
    {
      name: "step",
      group: "form",
      kind: "number",
      default: 1,
      description: "Values snap to multiples of it from `min`;  `0`:  any."
    },
    {
      name: "tick-step",
      group: "appearance",
      kind: "number",
      description:
        "Labels and ticks every this much from `min` (e.g. `20` on `0` ... `200`), instead of every `step`;  " +
        "values still snap to `step`."
    },
    {
      name: "value",
      group: "form",
      kind: "number",
      reflect: false,
      description:
        "The (first) thumb's value, default `min`.  Attribute:  the starting (and reset) value;  property:  the live one."
    },
    {
      name: "end",
      group: "appearance",
      kind: "number",
      reflect: false,
      description: "`range`:  the second thumb's value, default `max`.  Attribute / property as `value`."
    },
    {
      name: "step-labels",
      group: "appearance",
      kind: "json",
      description: 'Label per step, from `min` (e.g. `["XS", "S", "M"]`), also the spoken value;  default the numbers.'
    },
    UIT.FormControlAttributes.name,
    {
      ...UIT.FormControlAttributes.required,
      description:
        "Form validation:  a value must be chosen, by the page (`value`, a range's `end`) or by moving a thumb.  " +
        "Unset, the thumb rests at `min` but counts as no value (`valueMissing`)."
    }
  ],
  events: [
    {
      name: "ui-moved",
      detail: "{ value: number, end?: number, originalEvent?: Event }",
      description: "A thumb moved (each drag step or key).  A handler that re-sets `value` / `end` wins."
    },
    {
      name: "ui-changed",
      detail: "{ value: number, end?: number, originalEvent?: Event }",
      description: "A change was committed:  on a key, or when a drag ends somewhere new."
    }
  ],
  slots: [],
  parts: [
    { name: "slider", description: "The root box." },
    { name: "track", description: "The empty track." },
    { name: "track-fill", description: "The filled part of the track." },
    { name: "thumb", description: "A thumb (`role=slider`)." },
    { name: "labels", description: "The list of step labels." },
    { name: "label", description: "One step label (and its tick)." }
  ],
  states: [
    { name: "disabled", description: "Can't be used." },
    { name: "dragging", description: "A thumb is being dragged." },
    { ...UIT.FormControlStates.invalid, description: "Fails validation (`required`), once a person has interacted." }
  ],
  texts: [
    { key: "sliderMinimum", text: "Minimum", description: "Name of a range's first thumb." },
    { key: "sliderMaximum", text: "Maximum", description: "Name of a range's second thumb." }
  ]
} as const satisfies E.ComponentVocabulary
