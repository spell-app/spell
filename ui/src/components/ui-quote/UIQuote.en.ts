/**
 * The English vocabulary of `<ui-quote>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), slots, parts and states.
 *   The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - A quotation (epic `ui-gaps` P9):  a block quote by default, or `inline`, inside a sentence.
 * - Its look is the Markdown pages' block quote:  a bar on its leading edge, muted text.
 */

import type { E } from "spell/ui/core"

/****************
 * ### `quoteVocabulary`
 * The names of `<ui-quote>`:  `<blockquote class="ui quote" part="quote">`, or `<q>` inline, around a slot.
 ****************/
export const quoteVocabulary = {
  tag: "ui-quote",
  topics: ["text", "typography"],
  aka: ["blockquote", "quotation", "q", "pull quote", "citation"],
  noun: "quote",
  description: "A quote holds someone else's words:  a block of its own, or a few words inside a sentence.",
  attributes: [
    {
      name: "inline",
      group: "layout",
      kind: "boolean",
      description: "Inside a sentence (`<q>`):  quotation marks round it, the language's own, not a block."
    },
    {
      name: "cite",
      group: "content",
      kind: "string",
      description: "The address the words come from:  for readers' tools, not shown."
    }
  ],
  events: [],
  slots: [{ name: "", description: "The quoted words." }],
  parts: [{ name: "quote", description: "The quotation (`<blockquote>`, or `<q>` inline)." }],
  states: [{ name: "inline", description: "Set while it's `inline`." }],
  texts: []
} as const satisfies E.ComponentVocabulary
