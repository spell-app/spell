/**
 * The English vocabulary of `<ui-json>`:  every name the tag uses.
 * - Its tag, attributes, events, parts, states and texts.  The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - Ours, not Fomantic's (epic `elemental-spell` P31;  the outline from epic `from-console` P3).
 * - The source pieces (`source`, `load`, `ui-loaded` ... `ui-error`, the loader and error parts, the states and texts)
 *   are shared with `<ui-code>` and `<ui-markdown>`:  `UIT.Source*`, which `LoadableComponent` reads.
 *   - Its `ui-changed` is its own, with the parsed `value`.
 * - `value` is the DOM element's property (any JSON value):  not an attribute.
 */

import type { E } from "spell/ui/core"
import * as UIT from "spell/ui/components/components.types"

const [LOADED, , SAVING, SAVED, ERROR] = UIT.SourceEvents

/****************
 * ### `jsonVocabulary`
 * The names of `<ui-json>`, JSON data held in a page and drawn as an outline whose objects and arrays open and close:
 * `<div class="ui json" part="viewer">` holding its header (`part="header"`) and a `<div class="row">` per line.
 ****************/
export const jsonVocabulary = {
  tag: "ui-json",
  icon: "code",
  topics: ["data display", "modules"],
  aka: [
    "data",
    "data island",
    "json script",
    "application/json",
    "data block",
    "json viewer",
    "json tree",
    "object inspector",
    "pretty print",
    "datos"
  ],
  skeleton: "4 line paragraph",
  noun: "JSON data",
  partOfSpeech: "property",
  description:
    "JSON data holds data in a page, as its text or from a file with `source`, and shows it as an outline whose " +
    "objects and arrays open and close.  `value` is the parsed data, and an element it sits inside may read it.",
  attributes: [
    ...UIT.SourceAttributes,
    {
      name: "depth",
      group: "behaviour",
      kind: "number",
      default: 1,
      description:
        "How many levels start open:  `1`, the top object or array alone;  `0`, everything closed.  New data opens " +
        "this way again."
    },
    {
      name: "quotes",
      group: "appearance",
      kind: "boolean",
      default: true,
      description:
        'Keys in quotes, as JSON writes them:  `"type": "optical"`.  `quotes="no"`:  `type: "optical"`, as JSON5 ' +
        "allows (a key that isn't a name keeps its quotes).  The header's quotes button sets it.  Copy always copies JSON."
    },
    {
      name: "no-header",
      group: "appearance",
      kind: "boolean",
      default: false,
      description: "Hides the header:  the Copy and quotes buttons."
    },
    {
      name: "editable",
      group: "behaviour",
      kind: "boolean",
      default: false,
      description:
        "Double-click a key or a value to edit it, in a control that fits the value:  a text field for a string, a " +
        "number field for a number, a date picker for an ISO date, a checkbox for `true` / `false`, a pick list for a " +
        "key `editors` gives choices.  Enter (or leaving it) keeps the edit, Escape drops it.  `value` changes and " +
        "`ui-changed` is sent;  what's open stays open."
    },
    {
      name: "editors",
      group: "behaviour",
      kind: "json",
      reflect: false,
      description:
        'With `editable`, the control for each key, as a PROPERTY:  `{ direction: ["in", "out"], when: "date" }`.  ' +
        "A list of strings makes a pick list;  a word names the control:  `text`, `number`, `date`, `datetime`, " +
        "`boolean` or `json` (a text field read as JSON).  A key it doesn't name gets the control its value's type picks."
    }
  ],
  events: [
    LOADED,
    {
      name: "ui-changed",
      detail: "{ value: unknown, content: string }",
      description:
        "The data changed:  loaded from `source`, set through `value` or `content`, edited in the outline, or its " +
        "text edited.  `value` is `undefined` when the text is empty or isn't JSON."
    },
    SAVING,
    SAVED,
    ERROR,
    {
      name: "ui-navigating",
      cancelable: true,
      detail: '{ path: (string | number)[], key: string | number | undefined, value: unknown, part: "key" | "value" }',
      description:
        "A key or a value was clicked (not a double-click, nor the end of a text selection).  `path`:  the keys " +
        "from the top value down to that member (`[]`:  the top value);  `key`:  its key, an array member's index;  " +
        "`value`:  its value (an object or array too, when its key was clicked);  `part`:  which was clicked.  " +
        "The page decides what it means (jumping to what a value names) and calls `preventDefault()`."
    },
    { name: "ui-copied", detail: "{ content: string }", description: "The Copy button copied `content`, as JSON." }
  ],
  slots: [],
  parts: [
    ...UIT.SourceParts,
    { name: "viewer", description: "The box round it all." },
    { name: "header", description: "The bar above the data:  Copy, then the quotes button." },
    { name: "row", description: "Each line." },
    {
      name: "toggle",
      description:
        "Each object's or array's open / close button, a chevron in the left gutter;  Alt-click:  its whole branch."
    },
    { name: "preview", description: "A closed object or array, on one line." },
    { name: "editor", description: "The control a key or value is edited in (`editable`)." }
  ],
  states: [...UIT.SourceStates],
  texts: [
    ...UIT.SourceTexts,
    { key: "jsonCopy", text: "Copy JSON", description: "The header's Copy button." },
    { key: "jsonCopied", text: "Copied", description: "The Copy button, for a moment after it copied." },
    { key: "jsonQuotes", text: "Quotes round keys", description: "The quotes button's name (a toggle)." },
    { key: "jsonQuotesOff", text: "Hide the quotes round keys", description: "The quotes button's tooltip, on." },
    { key: "jsonQuotesOn", text: "Show the quotes round keys", description: "The quotes button's tooltip, off." },
    { key: "jsonEditKey", text: "Key", description: "The field a key is edited in." },
    { key: "jsonEditValue", text: "Value", description: "The control a value is edited in." },
    { key: "jsonOpen", text: "Open {key}", description: "A closed object's or array's toggle." },
    { key: "jsonClose", text: "Close {key}", description: "An open object's or array's toggle." },
    { key: "jsonAllInside", text: "Alt:  everything inside", description: "Added to a toggle's tooltip." },
    { key: "jsonTop", text: "the data", description: "The top value's name, in its toggle's label." },
    { key: "jsonEmpty", text: "No data", description: "Nothing to show:  no text, or a `source` still loading." },
    {
      key: "jsonInvalid",
      text: "This isn't JSON:  {message}",
      description: "The error message when its text isn't JSON;  `{message}` is the parser's."
    }
  ]
} as const satisfies E.ComponentVocabulary
