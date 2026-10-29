/**
 * The English vocabulary of `<ui-text>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), slots, parts and states.
 *   The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - The attributes become Fomantic's class words, in Fomantic's order (`ClassBuilder`):
 *   `<ui-text size="large" color="red" inverted>` => `ui large red inverted text`;
 *   `<ui-text state="error">` => `ui error text`.
 * - Sizes are relative to the surrounding text, on Fomantic's text ladder (`mini` 0.4em ... `massive` 8em).
 * - How its letters look are bare attributes, as styling is what a text is FOR (epic `elemental-spell` P26):
 *   - faces, any together:  `<ui-text bold italic>`
 *   - a family from the theme, one at a time:  `headline`, `subhead`, `serif`, `sans-serif`, `typewriter`, `code`
 *   - every other tag takes the faces as the shared `font` (`font="bold italic"`);  `<ui-text font>` still works
 */

import type { E } from "spell/ui/core"

/****************
 * ### `textVocabulary`
 * The names of `<ui-text>`, inline text:  `<span class="ui … text" part="text">` around a slot.
 ****************/
export const textVocabulary = {
  tag: "ui-text",
  topics: ["text", "typography", "basic", "elements"],
  aka: [
    "span",
    "inline text",
    "colored text",
    "label text",
    "paragraph",
    "p",
    "bold",
    "italic",
    "strong",
    "em",
    "code"
  ],
  noun: "text",
  description: "A text is used to style some inline text with a simple color, or to hold a paragraph.",
  attributes: [
    {
      name: "size",
      group: "appearance",
      kind: "size",
      description: "Size relative to the surrounding text, `mini` (0.4em) ... `massive` (8em);  `medium` is 1em."
    },
    { name: "color", group: "appearance", kind: "color", description: "Hue of the text." },
    {
      name: "state",
      group: "form",
      kind: "valueOnly",
      values: ["error", "info", "success", "warning"],
      description: "Semantic colour of a status message."
    },
    { name: "inverted", group: "appearance", kind: "keyOnly", description: "The hue as it reads on a dark surface." },
    {
      name: "paragraph",
      group: "layout",
      kind: "boolean",
      description:
        "A paragraph:  a block (`<p>`) with the body's line height and a line's space under it, not inline text."
    },
    { name: "bold", group: "appearance", kind: "boolean", description: "Bold letters (`<strong>`)." },
    { name: "italic", group: "appearance", kind: "boolean", description: "Italic letters (`<em>`)." },
    { name: "underline", group: "appearance", kind: "boolean", description: "Underlined." },
    {
      name: "strikethrough",
      group: "appearance",
      kind: "boolean",
      description: "Struck through (`<s>`):  no longer true, or no longer the price."
    },
    {
      name: "highlight",
      group: "appearance",
      kind: "boolean",
      description: "Highlighted, as with a marker pen (`<mark>`)."
    },
    {
      name: "subscript",
      group: "appearance",
      kind: "boolean",
      description: "Set below the line, smaller (`<sub>`):  H₂O."
    },
    {
      name: "superscript",
      group: "appearance",
      kind: "boolean",
      description: "Set above the line, smaller (`<sup>`):  mc²."
    },
    {
      name: "all-caps",
      group: "appearance",
      kind: "boolean",
      description: "Every letter a capital (`text-transform: uppercase`):  a label, an eyebrow."
    },
    {
      name: "title-caps",
      group: "appearance",
      kind: "boolean",
      description: "Each word's first letter a capital (`text-transform: capitalize`)."
    },
    {
      name: "headline",
      group: "appearance",
      kind: "boolean",
      description: "The theme's headline family, its headings' (`--ui-font-family-heading`)."
    },
    {
      name: "subhead",
      group: "appearance",
      kind: "boolean",
      description: "The theme's subhead family, under a heading (`--ui-font-family-subhead`)."
    },
    {
      name: "serif",
      group: "appearance",
      kind: "boolean",
      description:
        "The theme's serif family (`--ui-font-family-serif`).  One family at a time:  written together, the " +
        "first of `code`, `headline`, `subhead`, `serif`, `sans-serif`, `typewriter` wins."
    },
    {
      name: "sans-serif",
      group: "appearance",
      kind: "boolean",
      description: "The theme's sans-serif family (`--ui-font-family-sans`)."
    },
    {
      name: "typewriter",
      group: "appearance",
      kind: "boolean",
      description: "The theme's typewriter family (`--ui-font-family-typewriter`):  every letter the same width."
    },
    {
      name: "code",
      group: "appearance",
      kind: "boolean",
      description: "Inline code (`<code>`):  the theme's code font, on the tinted box `<code>` draws in prose."
    },
    { name: "disabled", group: "states", kind: "keyOnly", description: "Faded:  shown as unavailable." }
  ],
  events: [],
  slots: [{ name: "", description: "The text." }],
  parts: [{ name: "text", description: "The inline text box." }],
  states: [
    { name: "disabled", description: "Faded:  shown as unavailable." },
    { name: "paragraph", description: "Set while it's a paragraph (`paragraph`)." }
  ],
  texts: []
} as const satisfies E.ComponentVocabulary
