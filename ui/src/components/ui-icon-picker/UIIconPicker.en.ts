/**
 * Every name `<ui-icon-picker>` uses:  tag, attributes (kind + allowed values), events, parts, states, texts.
 * Schema:  `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - Pure data:  node imports it (`yarn site:data`, `yarn gen:root`), so `spell/ui/core` for types only.
 * - Class words come out through `ClassBuilder`, on the shadow field:
 *   `<ui-icon-picker size="small" fluid>` => `ui small fluid icon picker`.
 * - `value` is an icon NAME (`star`, `address book`), typed `icon`:
 *   so a property editor draws an icon picker for the picker's own value too.
 */

import type { E } from "spell/ui/core"
import * as UIT from "spell/ui/components/components.types"

/****************
 * ### `<ui-icon-picker>`
 * A form control whose value is an icon's name:  a field showing the chosen glyph,
 * which opens a searchable grid of every icon the page knows.
 ****************/
export const iconPickerVocabulary = {
  tag: "ui-icon-picker",
  formControl: true,
  topics: ["forms", "inputs", "selection", "icons", "controls"],
  aka: ["icon chooser", "icon selector", "glyph picker", "symbol picker", "icon search"],
  skeleton: "inline 14 x 2.5",
  noun: "icon picker",
  description: "An icon picker lets people choose an icon by searching for it and clicking its glyph.",
  attributes: [
    {
      name: "value",
      group: "form",
      kind: "string",
      type: "icon",
      reflect: false,
      description:
        "The chosen icon's name (`star`, `address book`);  empty for none.  Attribute:  the starting (and reset) " +
        "value;  property:  the live value."
    },
    UIT.FormControlAttributes.name,
    {
      ...UIT.FormControlAttributes.placeholder,
      description: 'What the field says while no icon is chosen;  default:  "none".'
    },
    {
      name: "size",
      group: "appearance",
      kind: "size",
      description: "Size, `mini` ... `massive`;  `medium` is the default."
    },
    { name: "fluid", group: "layout", kind: "keyOnly", description: "Takes the full width of its container." },
    {
      name: "disabled",
      group: "states",
      kind: "keyOnly",
      description: "Can't be used:  dimmed, not focusable, left out of the form."
    },
    {
      ...UIT.FormControlAttributes.readonly,
      description: "Shows its icon but can't be changed:  never opens;  still focusable and submitted."
    },
    {
      ...UIT.FormControlAttributes.required,
      description: 'Form validation:  an icon must be chosen;  no "none" choice in the grid.'
    }
  ],
  events: [
    {
      name: "ui-changing",
      detail: "{ value: string, originalEvent?: Event }",
      cancelable: true,
      description:
        'An icon was picked (`""` for none);  `preventDefault()` keeps the old one, and a handler that re-sets `value` wins.'
    },
    {
      name: "ui-changed",
      detail: "{ value: string, originalEvent?: Event }",
      description: "The icon changed:  after `ui-changing`, unless it was cancelled."
    },
    {
      name: "ui-opening",
      detail: "{ open: true, originalEvent?: Event }",
      cancelable: true,
      description: "The panel is about to open (a click, Down / Up, a letter);  `preventDefault()` keeps it closed."
    },
    {
      name: "ui-closing",
      detail: "{ open: false, originalEvent?: Event }",
      cancelable: true,
      description:
        "The panel is about to close (a pick, Escape, Tab, a click outside);  `preventDefault()` keeps it open."
    }
  ],
  slots: [],
  parts: [
    { name: "field", description: "The closed field:  a `<button>` showing the chosen glyph and its name." },
    { name: "glyph", description: "The chosen icon's glyph, in the field." },
    { name: "text", description: "The chosen icon's name, or the placeholder, in the field." },
    { name: "panel", description: "The open panel:  a popover under the field, holding the search box and the grid." },
    { name: "search", description: "The search box at the panel's top (`<input type=search>`)." },
    {
      name: "grid",
      description:
        "The grid of glyphs (`role=listbox`):  with no search, in groups, Font Awesome's own categories, then Other."
    },
    {
      name: "heading",
      description: "A group's heading in the grid;  the one at the grid's top stays there as it scrolls."
    },
    { name: "cell", description: "One glyph in the grid (`role=option`), its name its tooltip." }
  ],
  states: [
    { name: "open", description: "The panel is open." },
    { name: "disabled", description: "Can't be used." },
    UIT.FormControlStates.invalid
  ],
  texts: [
    { key: "searchIcons", text: "Search icons", description: "The search box's placeholder and accessible name." },
    { key: "noIcon", text: "none", description: "The field's text, and the first cell's name, for no icon." },
    { key: "noIconsMatch", text: "No icons match", description: "The grid's message when the search finds nothing." },
    {
      key: "otherIcons",
      text: "Other",
      description: "The heading of the grid's last group:  the icons in none of Font Awesome's categories."
    }
  ]
} as const satisfies E.ComponentVocabulary
