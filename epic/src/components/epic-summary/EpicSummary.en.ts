/**
 * Every name `<epic-summary>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

/****************
 * ### `<epic-summary>`
 * The Overview's summary:  what the epic is, in two sentences.
 ****************/
export const epicSummaryVocabulary = {
  tag: "epic-summary",
  topics: ["documentation", "text", "typography"],
  aka: ["summary", "lede", "abstract", "tl;dr"],
  noun: "summary",
  ui: false,
  description:
    "The Overview's summary, two sentences, drawn as a lede at the top of `1. Overview`.  The text stays the page's " +
    "own children.  Reviewed as the Overview:  `<epic-overview>` draws the review controls on its title row, keyed " +
    "`summary` in the review inbox.",
  attributes: [],
  events: [],
  slots: [
    { name: "", description: "The summary:  text, or a `<p>`." },
    {
      name: "status",
      description: 'Claude\'s status cards on your marks (`<epic-status slot="status">`, P13):  under the lede.'
    },
    {
      name: "notes",
      description:
        'Your notes on the summary from the page, kept once Claude took them (`<epic-reply slot="notes">`):  ' +
        "under the lede."
    }
  ],
  parts: [{ name: "base", description: "The lede." }],
  states: [],
  texts: [],
  children: [
    { tag: "flow", description: "The summary." },
    {
      tag: "epic-reply",
      slot: "notes",
      description: "Your notes on the summary, kept once Claude took them (`inbox done | clear`), oldest first."
    },
    {
      tag: "epic-status",
      slot: "status",
      description: "Claude's status cards on your marks, oldest first (`plan-doc status`;  a todo filed:  born done)."
    }
  ]
} as const satisfies EpicVocabulary
