/**
 * Every name `<ui-select>` uses:  tag, attributes (kind + allowed values), events, slots, parts, states, texts.
 * Schema:  `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - Pure data:  node imports it (`yarn site:data`, `yarn gen:root`), so `spell-ui/core` for types only.
 * - Class words come out through `ClassBuilder`:
 *   `<ui-select size="small" fluid state="error">` => `ui small error fluid select`, on the shadow `<select>`.
 *   `UISelect.css` keys on those words.
 * - NOTE: the noun is `select`, not Fomantic's `selection dropdown`:
 *   the element IS a native `<select>` with its own sheet,
 *   and a `.ui.selection.dropdown` class would pull in `UIDropdown.css`
 *   wherever both sheets are on one page (the demo, an app that links both).
 *   The LOOK is the closed `selection dropdown`'s.
 * - Rich data is a PROPERTY (`options`, `kind: "json"`);  first paint never needs it --
 *   slotted `<ui-item>`s or the `value` / `placeholder` attributes carry what SSR must show.
 */

import type { E } from "spell-ui/core"
import * as UIT from "spell-ui/components/components.types"

/****************
 * ### `<ui-select>`
 * A native `<select>` in the shadow root:  the browser's customizable select where it has one,
 * else its plain picker, both in the closed look of Fomantic's `selection dropdown`.
 ****************/
export const selectVocabulary = {
  tag: "ui-select",
  formControl: true,
  topics: ["forms", "inputs", "selection", "controls", "modules"],
  aka: ["select box", "native select", "picker", "option list"],
  skeleton: "inline 12 x 2.5",
  noun: "select",
  description: "A select lets people choose one or more values from a native list of options.",
  attributes: [
    {
      name: "size",
      group: "appearance",
      kind: "size",
      description: "Size, `mini` ... `massive`;  `medium` is the default."
    },
    {
      name: "state",
      group: "form",
      kind: "valueOnly",
      values: ["error", "info", "success", "warning"],
      description: "Form state, tinting the box and text."
    },
    { name: "fluid", group: "layout", kind: "keyOnly", description: "Takes the full width of its container." },
    {
      name: "padding",
      group: "layout",
      kind: "valueOnly",
      values: ["compact"],
      replaces: [{ from: "compact", value: "compact" }],
      description: "`compact`:  no minimum width, as wide as its longest option.  Old name:  `compact`."
    },
    {
      name: "inverted",
      group: "appearance",
      kind: "keyOnly",
      description: "For dark backgrounds:  the dark scheme's colours."
    },
    {
      name: "disabled",
      group: "states",
      kind: "keyOnly",
      description: "Can't be used;  dimmed, and left out of the form."
    },
    {
      ...UIT.FormControlAttributes.readonly,
      description: "Shows its value but can't be changed (a change is undone);  still focusable and submitted."
    },
    {
      name: "multiple",
      group: "form",
      kind: "keyOnly",
      description: "Chooses several values:  a native list box (never the customizable picker)."
    },
    {
      ...UIT.FormControlAttributes.placeholder,
      description: "Text of the empty first option shown while nothing is chosen."
    },
    {
      name: "value",
      group: "form",
      kind: "string",
      description:
        "Chosen value.  Property:  `string`, or `string[]` with `multiple`;  attribute:  a comma / space list."
    },
    { ...UIT.FormControlAttributes.name, description: "Form field name;  `multiple` submits one entry per value." },
    UIT.FormControlAttributes.required,
    {
      name: "options",
      group: "form",
      kind: "json",
      reflect: false,
      description: "Options as a PROPERTY:  `MenuOption[]` (`spell-ui/elements`);  added after slotted `<ui-item>`s."
    }
  ],
  events: [
    {
      name: "ui-changed",
      detail: "{ value: string | string[], originalEvent?: Event }",
      description: "Someone chose a value (or changed the chosen set, with `multiple`)."
    }
  ],
  slots: [
    {
      name: "",
      description: "`<ui-item>`s:  the options (`value`, `icon`, `image`, `flag`, `description`), headers and dividers."
    }
  ],
  parts: [
    { name: "select", description: "The native `<select>`." },
    { name: "button", description: "The customizable select's button (not in browsers without one)." },
    { name: "option", description: "Each `<option>`." },
    { name: "placeholder", description: "The empty first option, with the `placeholder` text." },
    { name: "group", description: "Each `<optgroup>` (a `header` item and the options after it)." }
  ],
  states: [
    { name: "disabled", description: "Can't be used." },
    UIT.FormControlStates.readonly,
    { ...UIT.FormControlStates.invalid, description: "Fails validation (`required`)." },
    { name: "fluid", description: "The host is block-level (`fluid`)." },
    { name: "customizable", description: "The browser draws the customizable select (`appearance: base-select`)." }
  ],
  texts: []
} as const satisfies E.ComponentVocabulary
