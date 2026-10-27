/**
 * Every name `<ui-textarea>` uses:  tag, attributes (kind + allowed values), events, parts, states.  Schema:
 * `ComponentVocabulary` (`spell-ui/vocabulary`).
 * - Class words come out through `ClassBuilder`, in Fomantic's grammar:
 *   `<ui-textarea size="small">` => `ui small input`, the `input` noun of `UIInput.css`, which it shares.
 * - `state` is `kind: "valueOnly"`:  it emits its value alone (`ui error input`), a remap in `colors.css`.
 * - `value` does NOT reflect:  like a native `<textarea>`, the ATTRIBUTE is the starting (and reset) value and the
 *   PROPERTY the live one.
 * - Constraint attributes (`required`, `minlength`, `maxlength`) go to the inner native control,
 *   whose validity merges with the Fomantic `rules` property's.
 */

// pure data (vocabularies / types) never import `spell-ui/core` by value:  it loads the element layer,
// which node can't (`yarn site:data` / `yarn gen:root` import every vocabulary through tsx:  no `?inline` css, no JSX)
import * as UIT from "spell-ui/components/components.types"
import type { ComponentVocabulary } from "spell-ui/vocabulary"

/****************
 * ### `<ui-textarea>`
 * A multi-line field:  `<div class="ui … input" part="input">` around a native `<textarea part="control">`.
 * - Shares `UIInput.css` (Fomantic styles `textarea` inside `.ui.input` and `.ui.form`), hence the `input` noun.
 ****************/
export const textareaVocabulary = {
  tag: "ui-textarea",
  formControl: true,
  topics: ["forms", "inputs", "text", "elements"],
  aka: ["multiline", "text area", "memo", "comment box"],
  skeleton: "20 x 6",
  noun: "input",
  description: "A textarea is a multi-line field used to elicit a longer response.",
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
      values: UIT.FormStates,
      description: "Form state, tinting the box, text and placeholder."
    },
    {
      name: "appearance",
      group: "appearance",
      kind: "multiple",
      values: ["transparent"],
      classes: {},
      replaces: [{ from: "transparent", value: "transparent" }],
      description: "`transparent`:  no box, text only.  Old name:  `transparent`."
    },
    { name: "fluid", group: "layout", kind: "keyOnly", description: "Takes the full width of its container." },
    {
      name: "disabled",
      group: "states",
      kind: "keyOnly",
      description: "Can't be used;  dimmed, left out of the form."
    },
    { name: "inverted", group: "appearance", kind: "keyOnly", description: "For dark backgrounds." },
    { ...UIT.FormControlAttributes.readonly, description: "Shows its value but can't be edited;  still submitted." },
    {
      name: "value",
      group: "form",
      kind: "string",
      reflect: false,
      description: "Value.  Attribute:  the starting (and reset) value;  property:  the live value."
    },
    UIT.FormControlAttributes.name,
    UIT.FormControlAttributes.placeholder,
    { ...UIT.FormControlAttributes.required, description: "Constraint:  must not be empty (`valueMissing`)." },
    {
      name: "minlength",
      group: "form",
      kind: "number",
      property: "minLength",
      description: "Constraint:  fewest characters (checked once someone has edited it)."
    },
    {
      name: "maxlength",
      group: "form",
      kind: "number",
      property: "maxLength",
      description: "Constraint:  most characters."
    },
    {
      name: "rows",
      group: "content",
      kind: "number",
      description:
        "Visible lines;  without it the field is Fomantic's form height (12em, 8em ... 24em).  With `grow`:  the " +
        "lines it starts at, one without it."
    },
    {
      name: "grow",
      group: "layout",
      kind: "boolean",
      description:
        "Grows with its text (epic `ui-gaps` P14):  `rows` lines to start (one without it), taller as the text " +
        'wraps, up to `max-rows`, then it scrolls;  shorter again as text goes.  Opt in:  every "tell me more" ' +
        "field should."
    },
    {
      name: "max-rows",
      group: "layout",
      kind: "number",
      min: 1,
      description:
        "With `grow`:  the most lines it grows to before it scrolls;  without it, a third of the window " +
        "(`--ui-input-textarea-grow-max-height`)."
    },
    {
      name: "autocomplete",
      group: "form",
      kind: "string",
      description: "Autofill hint, forwarded to the native textarea."
    },
    {
      name: "rules",
      group: "form",
      kind: "json",
      reflect: false,
      description: "Fomantic validation rules checked with the native constraints (`ValidationRule`s)."
    }
  ],
  events: [
    {
      name: "ui-typed",
      detail: "{ value: string, originalEvent?: Event }",
      description: "The value changed as someone typed (every keystroke)."
    },
    {
      name: "ui-changed",
      detail: "{ value: string, originalEvent?: Event }",
      description: "Someone committed a change (blur)."
    }
  ],
  slots: [],
  parts: [
    { name: "input", description: "The root box." },
    { name: "control", description: "The native `<textarea>`." }
  ],
  states: [
    UIT.FormControlStates.invalid,
    { name: "disabled", description: "Can't be used." },
    { name: "fluid", description: "The host is block-level (`fluid`, or inside a `<ui-field>`)." }
  ],
  texts: []
} as const satisfies ComponentVocabulary
