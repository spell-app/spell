/**
 * The English vocabulary of `<ui-link>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), slots, parts and states.
 *   The shape is `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - A link inside running text (epic `ui-gaps` P9):  the shared `link` and `target` every tag takes, as a tag of
 *   its own, `<ui-link link="help.html">help</ui-link>`, for a drawing's sentence.
 * - Its look is `<ui-text link>`'s (`UIText.css`):  the same class words, `ui [size] [color] text`.
 */

import type { E } from "spell-ui/core"

/****************
 * ### `linkVocabulary`
 * The names of `<ui-link>`, a link in running text:  `<a class="ui … text" part="text" href>` around a slot.
 ****************/
export const linkVocabulary = {
  tag: "ui-link",
  topics: ["text", "navigation", "basic"],
  aka: ["a", "anchor", "hyperlink", "text link"],
  noun: "text",
  description: "A link takes the reader somewhere else from inside a sentence.",
  attributes: [
    {
      name: "size",
      group: "appearance",
      kind: "size",
      description: "Size relative to the surrounding text, `mini` (0.4em) ... `massive` (8em);  `medium` is 1em."
    },
    {
      name: "color",
      group: "appearance",
      kind: "color",
      description: "Hue of the link;  the page's link colour by default."
    },
    { name: "inverted", group: "appearance", kind: "keyOnly", description: "The hue as it reads on a dark surface." },
    { name: "disabled", group: "states", kind: "keyOnly", description: "Faded, and no longer a link." }
  ],
  events: [],
  slots: [{ name: "", description: "The link's words." }],
  parts: [{ name: "text", description: "The link (`<a>`), or a span without a `link` or while `disabled`." }],
  states: [{ name: "disabled", description: "Faded, and no longer a link." }],
  texts: []
} as const satisfies E.ComponentVocabulary
