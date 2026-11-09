/**
 * The English vocabulary of `<ui-dimension>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), parts and texts.
 *   The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - One measure, in the reader's own units (epic `language` P24, Owen's C4):  `<ui-dimension value="172"
 *   dimension="length" unit="cm">` shows 5 ft 8 in to a US reader, 172 cm to everyone else.
 * - Spell passes `dimension` and `unit` itself for a measure, `<ui-dimension value={its height}>`.
 */

import type { E } from "spell/ui/core"

/****************
 * ### `dimensionVocabulary`
 * The names of `<ui-dimension>`:  `<span class="ui dimension" part="measure">5 ft 8 in</span>`.
 ****************/
export const dimensionVocabulary = {
  tag: "ui-dimension",
  icon: "ruler",
  topics: ["text", "typography"],
  aka: [
    "measure",
    "measurement",
    "unit",
    "number with units",
    "length",
    "weight",
    "temperature",
    "percent",
    "percentage"
  ],
  skeleton: "inline 4 x 1",
  noun: "dimension",
  description: "A dimension shows one measure in the reader's own units:  5 ft 8 in in the US, 172 cm elsewhere.",
  attributes: [
    {
      name: "value",
      group: "content",
      kind: "number",
      description: "The measure's number, in `unit`:  `172`.  Nothing shows nothing."
    },
    {
      name: "dimension",
      group: "content",
      kind: "string",
      description:
        "What it measures:  `length`, `weight`, `temperature`, `volume`, `speed` or `proportion` (a percent), " +
        "in any language Spell's dimensions are written in (`longitud`).  Spell says it for a measure."
    },
    {
      name: "unit",
      group: "content",
      kind: "string",
      description:
        "The unit `value` is in, by any of its names:  `cm`, `centimeter`, `kg`, `°F`, `%`;  a percent Spell keeps is " +
        "a `fraction`, `0.18`.  Spell says it for a measure."
    },
    {
      name: "in",
      group: "appearance",
      kind: "string",
      description:
        'The units to show it in, largest first, joined by `and`:  `"feet and inches"`, `"kg"`.  Left out:  ' +
        "the reader's own, from their region or their choice."
    }
  ],
  events: [],
  slots: [],
  parts: [{ name: "measure", description: "The measure, written:  `5 ft 8 in`." }],
  states: [],
  texts: [{ key: "and", text: "and", description: "Between two units in `in`, `feet and inches`." }]
} as const satisfies E.ComponentVocabulary
