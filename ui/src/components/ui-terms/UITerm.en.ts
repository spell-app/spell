/**
 * The English vocabulary of `<ui-term>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), slots, parts and states.
 *   The shape is `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - One fact (epic `ui-gaps` P12):  `<ui-term label="Suit" value="hearts">`, or its label and value written
 *   inside it (`slot="label"`, then the value), as HTML's `<dt>` and `<dd>`.
 */

import type { E } from "spell-ui/core"

/****************
 * ### `termVocabulary`
 * The names of `<ui-term>`:  `<span role="term" part="label">` then `<span role="definition" part="value">`.
 ****************/
export const termVocabulary = {
  tag: "ui-term",
  topics: ["text", "data display"],
  aka: ["dt", "dd", "term", "key value", "property", "name value"],
  noun: "term",
  description: "A term is one fact:  a label, and its value.",
  attributes: [
    { name: "label", group: "content", kind: "string", description: "What it is:  `Suit`." },
    { name: "value", group: "content", kind: "string", description: "Its value:  `hearts`.  Or write it inside." }
  ],
  events: [],
  slots: [
    { name: "", description: "The value, when it's more than text:  an icon, a link, a label." },
    { name: "label", description: "The label, when it's more than text." }
  ],
  parts: [
    { name: "label", description: "The label (`role=term`)." },
    { name: "value", description: "The value (`role=definition`)." }
  ],
  states: [
    { name: "in-terms", description: "Set while it's in a `<ui-terms>`." },
    { name: "in-row", description: 'Set while its `<ui-terms>` is `direction="horizontal"`.' }
  ],
  texts: []
} as const satisfies E.ComponentVocabulary
