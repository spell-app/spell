/**
 * Every name `<epic-more>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

/****************
 * ### `<epic-more>`
 * The More Details card on an item:  its text, made clear (epic `epic-engine` I301).
 ****************/
export const epicMoreVocabulary = {
  tag: "epic-more",
  topics: ["documentation", "cards"],
  aka: ["more details", "details", "follow-up", "addendum"],
  noun: "more",
  ui: false,
  description:
    "More Details:  what Clarify (Add Details) wrote IN PLACE of an item's unclear text, a plain card headed More " +
    "Details that never folds.  A second Add Details replaces it.",
  attributes: [],
  events: [],
  slots: [{ name: "", description: "The item's text, made clear." }],
  parts: [
    { name: "base", description: "The card." },
    { name: "heading", description: "Its `More Details` heading." },
    { name: "body", description: "The item's text, made clear." }
  ],
  states: [],
  texts: [{ key: "more", text: "More Details", description: "The card's heading." }],
  children: [{ tag: "flow", description: "The item's text, made clear." }]
} as const satisfies EpicVocabulary
