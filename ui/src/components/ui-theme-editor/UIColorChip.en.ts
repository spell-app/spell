/**
 * The English vocabulary of `<ui-color-chip>`:  every name the tag uses.
 * - The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - Pure data:  `import type` only, so node loads it (`yarn site:data`, `yarn gen:root`).
 */

import type { E } from "spell/ui/core"

/****************
 * ### `colorChipVocabulary`
 * The names of `<ui-color-chip>`:  one colour, shown as a small rounded square, read-only.
 ****************/
export const colorChipVocabulary = {
  tag: "ui-color-chip",
  topics: ["media", "typography"],
  aka: ["color chip", "swatch", "colour sample", "color preview", "color dot"],
  skeleton: "inline 1.4 x 1.4",
  noun: "colour chip",
  description: "A colour chip shows one colour, as a small rounded square:  read-only, its value in its tooltip.",
  attributes: [
    {
      name: "color",
      group: "content",
      kind: "string",
      description: "The colour:  any CSS colour (`#7c55e6`, `oklch(...)`, `var(--ui-primary)`, `light-dark(...)`)."
    },
    {
      name: "scheme",
      group: "appearance",
      kind: "enum",
      values: ["auto", "light", "dark"],
      default: "auto",
      description: "The scheme a `light-dark()` colour resolves in:  the page's (`auto`), `light` or `dark`."
    },
    {
      name: "label",
      group: "content",
      kind: "string",
      description: "What the colour is, for a screen reader and the tooltip.  None:  the colour itself."
    }
  ],
  events: [],
  slots: [],
  parts: [{ name: "chip", description: "The chip itself." }],
  states: [],
  texts: []
} as const satisfies E.ComponentVocabulary
