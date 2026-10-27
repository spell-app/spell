/**
 * The English vocabulary of `<ui-terms>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), slots, parts and states.
 *   The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - A list of terms and what they are (epic `ui-gaps` P12):  `Suit:  hearts`, `Rank:  queen`.
 *   HTML's `<dl>`, for a drawing, which holds no native HTML.
 */

import type { E } from "spell/ui/core"

/****************
 * ### `termsVocabulary`
 * The names of `<ui-terms>`:  a grid of `<ui-term>`s, their labels in one column and values in the next.
 ****************/
export const termsVocabulary = {
  tag: "ui-terms",
  topics: ["text", "data display", "collections"],
  aka: ["dl", "definition list", "description list", "key value list", "properties", "details"],
  noun: "terms",
  description: "Terms list facts as a label and a value each, lined up:  Suit hearts, Rank queen.",
  attributes: [
    {
      name: "direction",
      group: "layout",
      kind: "enum",
      values: ["vertical", "horizontal"],
      default: "vertical",
      description:
        "`vertical` (the default):  a term a line, the labels in one column and the values in the next.  " +
        "`horizontal`:  the terms side by side, wrapping."
    },
    {
      name: "spacing",
      group: "layout",
      kind: "enum",
      values: ["sm", "md", "lg"],
      default: "md",
      description: "The space between terms."
    }
  ],
  events: [],
  slots: [{ name: "", description: "`<ui-term>`s." }],
  parts: [],
  states: [{ name: "horizontal", description: '`direction="horizontal"`.' }],
  texts: [],
  ownsParts: ["term"]
} as const satisfies E.ComponentVocabulary
