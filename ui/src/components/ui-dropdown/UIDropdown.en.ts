/**
 * Every name `<ui-dropdown>` uses:  tag, attributes (kind + allowed values), events, slots,
 * parts, states, texts.  Schema:  `ComponentVocabulary` (`spell-ui/vocabulary`).
 * - Class words come out through `ClassBuilder`, in Fomantic's grammar:
 *   `<ui-dropdown search selection pointing="top left">` => `ui search selection top left pointing dropdown`.
 *   `UIDropdown.css` keys on those words.
 * - Rich data is a PROPERTY (`options`, `kind: "json"`);  first paint never needs it --
 *   slotted `<ui-item>`s or the `value` / `text` attributes carry what SSR must show.
 */

import type { ComponentVocabulary } from "spell-ui/vocabulary"

/****************
 * ### `<ui-dropdown>`
 * A combobox + listbox:  a `<button>` or `<input>` trigger and an anchor-positioned popover menu.
 ****************/
export const dropdownVocabulary = {
  tag: "ui-dropdown",
  formControl: true,
  topics: ["forms", "inputs", "selection", "menus", "controls", "basic", "modules"],
  aka: ["select", "combobox", "picker", "autocomplete", "menu button", "multi select"],
  skeleton: "inline 14 x 2.5",
  noun: "dropdown",
  description: "A dropdown lets people choose a value from a series of options.",
  attributes: [
    {
      name: "size",
      group: "appearance",
      kind: "size",
      description: "Size, `mini` ... `massive`;  `medium` is the default."
    },
    {
      name: "color",
      group: "appearance",
      kind: "color",
      description: "Hue:  fills a `button` dropdown;  accents a selection's focus border and labels."
    },
    {
      name: "state",
      group: "form",
      kind: "valueOnly",
      values: ["error", "info", "success", "warning"],
      description: "Form state, tinting the box, text and menu."
    },
    { name: "selection", group: "appearance", kind: "keyOnly", description: "Looks like a form `<select>`." },
    {
      name: "search",
      group: "appearance",
      kind: "keyOnly",
      description: "Filters the options by typing;  the trigger is an `<input>`."
    },
    { name: "multiple", group: "form", kind: "keyOnly", description: "Chooses several values, shown as labels." },
    { name: "inline", group: "layout", kind: "keyOnly", description: "Sits inside running text." },
    {
      name: "floating",
      group: "appearance",
      kind: "keyOnly",
      description: "The menu floats further away, with a stronger shadow."
    },
    { name: "button", group: "appearance", kind: "keyOnly", description: "Looks like a button (`UIButton.css`)." },
    {
      name: "labeled",
      group: "appearance",
      kind: "keyOnly",
      key: "labeled icon",
      description: "A labeled icon button:  the `icon` in its own block, no caret.  Use with `button`."
    },
    {
      name: "compact",
      group: "layout",
      kind: "keyOnly",
      description: "No minimum width;  the menu sizes to its items."
    },
    { name: "fluid", group: "layout", kind: "keyOnly", description: "Takes the full width of its container." },
    { name: "scrolling", group: "layout", kind: "keyOnly", description: "The menu scrolls after a fixed height." },
    {
      name: "upward",
      group: "layout",
      kind: "keyOnly",
      description: "Opens above (the menu still flips when there's no room)."
    },
    {
      name: "simple",
      group: "appearance",
      kind: "keyOnly",
      description: "Opens on hover / focus, with no script and no popover."
    },
    { name: "clearable", group: "form", kind: "keyOnly", description: "Shows a clear button while there's a value." },
    { name: "disabled", group: "states", kind: "keyOnly", description: "Can't be used;  dimmed and inert." },
    {
      name: "loading",
      group: "states",
      kind: "keyOnly",
      description: "Busy, e.g. fetching options;  the caret spins."
    },
    {
      name: "readonly",
      group: "form",
      kind: "keyOnly",
      property: "readOnly",
      key: "read-only",
      description: "Shows its value but can't be changed;  submitted with the form (unlike `disabled`)."
    },
    {
      name: "inverted",
      group: "appearance",
      kind: "keyOnly",
      description: "For dark backgrounds:  the dark scheme's colours."
    },
    { name: "unlimited", group: "appearance", kind: "keyOnly", description: "A selection menu that never scrolls." },
    {
      name: "resizable",
      group: "behaviour",
      kind: "keyOnly",
      description: "A `scrolling` menu people can resize vertically."
    },
    { name: "short", group: "appearance", kind: "keyOnly", description: "A shorter selection menu (3/4 height)." },
    {
      name: "very-short",
      group: "appearance",
      kind: "keyOnly",
      description: "A much shorter selection menu (1/2 height)."
    },
    { name: "long", group: "appearance", kind: "keyOnly", description: "A longer selection menu (2x height)." },
    {
      name: "very-long",
      group: "appearance",
      kind: "keyOnly",
      description: "A much longer selection menu (3x height)."
    },
    {
      name: "open",
      group: "states",
      kind: "keyOnly",
      key: "active",
      description: "The menu is open.  Controlled:  set it to open / close;  `ui-opening` / `ui-closing` can veto."
    },
    {
      name: "pointing",
      group: "layout",
      kind: "keyOrValueAndKey",
      values: ["top", "top left", "top right", "left", "right", "bottom", "bottom left", "bottom right"],
      description:
        "An arrow on the menu pointing at the dropdown;  the value says where the menu's arrow sits " +
        "(`top left` => below, arrow at its top left).  Pointing menus never flip."
    },
    {
      name: "columnar",
      group: "appearance",
      kind: "width",
      widthClass: "column",
      values: ["2", "3", "4", "5"],
      description: 'Lays the menu items out in columns:  `columnar="3"` => `three column`.'
    },
    {
      name: "direction",
      group: "layout",
      kind: "enum",
      values: ["left", "right"],
      default: "right",
      description: "Which way the menu extends from the dropdown's edge;  `left` right-aligns it (`.left.menu`)."
    },
    { name: "icon", group: "content", kind: "icon", description: "Icon name for a `labeled` dropdown's icon block." },
    { name: "placeholder", group: "form", kind: "string", description: "Text shown while nothing is chosen." },
    {
      name: "value",
      group: "form",
      kind: "string",
      description:
        "Chosen value.  Property:  `string`, or `string[]` with `multiple`;  attribute:  a comma / space list."
    },
    {
      name: "text",
      group: "name",
      kind: "string",
      reflect: false,
      description: "Text shown for the current value, e.g. before `options` arrive.  Property only by default."
    },
    {
      name: "name",
      group: "name",
      kind: "string",
      description: "Form field name;  `multiple` submits one entry per value."
    },
    { name: "required", group: "form", kind: "boolean", description: "Form validation:  a value must be chosen." },
    {
      name: "allow-additions",
      group: "form",
      kind: "boolean",
      description: "`search`:  offers the query as a new option."
    },
    {
      name: "min-characters",
      group: "form",
      kind: "number",
      default: 0,
      description: "`search`:  characters to type before the menu filters."
    },
    {
      name: "max-selections",
      group: "form",
      kind: "number",
      description: "`multiple`:  the most values that can be chosen."
    },
    {
      name: "no-results-text",
      group: "content",
      kind: "string",
      description: "Message when nothing matches;  default the translated `noResults` text."
    },
    {
      name: "addition-text",
      group: "content",
      kind: "string",
      description: "Label of the add item, with `{value}`;  default the translated `addItem` text."
    },
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
      description: "Someone chose, added, removed or cleared a value."
    },
    {
      name: "ui-opening",
      detail: "{ open: true, originalEvent?: Event }",
      cancelable: true,
      description:
        "The menu is about to open (a person's action, an invoker command too);  `preventDefault()` keeps it closed."
    },
    {
      name: "ui-closing",
      detail: "{ open: false, originalEvent?: Event }",
      cancelable: true,
      description: "The menu is about to close;  `preventDefault()` keeps it open."
    },
    {
      name: "ui-searched",
      detail: "{ query: string, originalEvent?: Event }",
      description: "`search`:  the query changed."
    },
    {
      name: "ui-added",
      detail: "{ value: string, originalEvent?: Event }",
      description: "`multiple`:  a value was chosen, or `allow-additions` added a new one."
    },
    {
      name: "ui-removed",
      detail: "{ value: string, originalEvent?: Event }",
      description: "`multiple`:  a value was removed."
    }
  ],
  slots: [
    { name: "", description: "`<ui-item>`s:  the options, headers and dividers, in order." },
    { name: "trigger", description: "Custom trigger content, e.g. an icon and a word, instead of the text." },
    { name: "header", description: "Content at the top of the menu, e.g. a header or a search input." },
    { name: "icon", description: "Replaces the caret, or the `labeled` icon." }
  ],
  parts: [
    { name: "trigger", description: "The combobox `<button>` covering the dropdown (not `search`)." },
    { name: "text", description: "The current text, or the placeholder." },
    { name: "icon", description: "The caret." },
    { name: "menu", description: "The listbox popover." },
    { name: "item", description: "Each option." },
    { name: "label", description: "Each chosen value of a `multiple` dropdown." },
    { name: "search", description: "The search `<input>`." },
    { name: "clear", description: "The clear button of a `clearable` dropdown." }
  ],
  states: [
    { name: "open", description: "The menu is open." },
    { name: "disabled", description: "Can't be used." },
    { name: "loading", description: "Busy." },
    { name: "invalid", description: "Fails validation (`required` ...)." },
    { name: "fluid", description: "The host is block-level (`fluid`)." }
  ],
  texts: [
    { key: "noResults", text: "No results found.", description: "Message when nothing matches the search." },
    { key: "addItem", text: "Add {value}", description: "The add item of `allow-additions`." },
    { key: "clear", text: "Clear", description: "Accessible name of the clear button." },
    {
      key: "removeValue",
      text: "Remove {value}",
      description: "Accessible name of a `multiple` label's delete button."
    }
  ]
} as const satisfies ComponentVocabulary
