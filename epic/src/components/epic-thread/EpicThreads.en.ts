/**
 * Every name `<epic-threads>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell-epic/definitions"

/****************
 * ### `<epic-threads>`
 * The comment threads under one block of a page, in order.
 ****************/
export const epicThreadsVocabulary = {
  tag: "epic-threads",
  topics: ["messages", "lists"],
  aka: ["comments", "comment threads", "threads"],
  noun: "threads",
  ui: false,
  description:
    "The comment threads under one block of a page (`<epic-thread>`s), in order, a little apart:  drawn by the " +
    "docs runtime's comments right after the paragraph, list item or cell holding their quotes, else after their " +
    "block (a docs section's first in its body).  Its edges are the block's it's under (an epic page item's note " +
    "box's;  a guide paragraph's measure):  the page's sheet sets them.",
  attributes: [],
  events: [],
  slots: [{ name: "", description: "The threads (`<epic-thread>`)." }],
  parts: [{ name: "base", description: "The column of its threads, 6px apart." }],
  states: [],
  texts: [],
  children: [{ tag: "epic-thread", description: "One comment's thread." }]
} as const satisfies EpicVocabulary
