/**
 * The English vocabulary of `<ui-hue-swatches>`:  every name the tag uses.
 * - The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - Pure data:  `import type` only, so node loads it (`yarn site:data`, `yarn gen:root`).
 */

import type { E } from "spell/ui/core"

/****************
 * ### `hueSwatchesVocabulary`
 * The names of `<ui-hue-swatches>`:  a row of Spell UI's colours as small round swatches, one picked (epic `debut`
 * P23):  the theme menu's tint row, and the theme editor's colour rows.
 ****************/
export const hueSwatchesVocabulary = {
  tag: "ui-hue-swatches",
  topics: ["selection", "controls"],
  aka: ["swatches", "colour picker", "color picker", "accent colour", "tint picker", "colour row"],
  skeleton: "inline 22 x 1.6",
  noun: "swatches",
  description:
    "Hue swatches pick one of Spell UI's colours, or none:  a row of small round swatches, the picked one ringed, " +
    "arrow keys moving and picking as in any radio group.",
  attributes: [
    {
      name: "value",
      group: "form",
      kind: "string",
      description: "The colour picked:  a hue's name (`pink`);  empty:  the first swatch, none (or the theme's own)."
    },
    {
      name: "hues",
      group: "content",
      kind: "string",
      description:
        "The colours offered, by name, space-separated (`red teal pink`);  none given:  all of Spell UI's, in order."
    },
    {
      name: "none-label",
      group: "content",
      kind: "string",
      description:
        "The first swatch's name, for its tooltip and a screen reader:  what picking no colour means here;  none " +
        "given:  `None`."
    },
    {
      name: "none-colors",
      group: "appearance",
      kind: "string",
      description:
        "The first swatch's colour, drawn in two halves, light and dark (`#7c55e6 #b39cff`):  the theme's own;  none " +
        "given:  a hollow ring."
    },
    {
      name: "wrap",
      group: "appearance",
      kind: "keyOnly",
      description:
        "Wraps onto more rows where it's narrow, each swatch full size;  without it, one row of shrinking ones."
    }
  ],
  events: [
    {
      name: "ui-changed",
      detail: "{ value: string | undefined, originalEvent?: Event }",
      description: "A swatch was picked:  its hue's name, `undefined` for the first (none)."
    }
  ],
  slots: [],
  parts: [
    { name: "swatches", description: "The row (`role=radiogroup`)." },
    { name: "swatch", description: "One swatch (`role=radio`)." }
  ],
  states: [],
  texts: [
    { key: "label", text: "Colour", description: "The row's accessible name." },
    { key: "none", text: "None", description: "The first swatch's name, when `none-label` gives none." },
    { key: "red", text: "Red", description: "A colour's name." },
    { key: "orange", text: "Orange", description: "A colour's name." },
    { key: "yellow", text: "Yellow", description: "A colour's name." },
    { key: "olive", text: "Olive", description: "A colour's name." },
    { key: "green", text: "Green", description: "A colour's name." },
    { key: "teal", text: "Teal", description: "A colour's name." },
    { key: "blue", text: "Blue", description: "A colour's name." },
    { key: "violet", text: "Violet", description: "A colour's name." },
    { key: "purple", text: "Purple", description: "A colour's name." },
    { key: "pink", text: "Pink", description: "A colour's name." },
    { key: "brown", text: "Brown", description: "A colour's name." },
    { key: "grey", text: "Grey", description: "A colour's name." },
    { key: "black", text: "Black", description: "A colour's name." }
  ]
} as const satisfies E.ComponentVocabulary
