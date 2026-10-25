/**
 * Every name `<epic-hidden-note>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell-epic/definitions"

/****************
 * ### `<epic-hidden-note>`
 * Under a list the state filter hides items of:  "3 hidden · show all", which shows them all again.
 ****************/
export const epicHiddenNoteVocabulary = {
  tag: "epic-hidden-note",
  topics: ["documentation", "controls"],
  aka: ["hidden note", "show all", "N hidden"],
  skeleton: "inline 8 x 1",
  noun: "hidden-note",
  ui: false,
  description:
    "Under a list the state filter (`<epic-state-filter>`) hides items of:  a quiet line, `3 hidden · show all`;  a " +
    "click asks its owner to show everything again (`epic-all-showing`).  Drawn by `<epic-section>` under its items, and " +
    "by the docs runtime under the Epics page's lists.  Nothing hidden:  its owner leaves it out.",
  attributes: [{ name: "count", kind: "number", description: "How many items the filter hides." }],
  events: [
    {
      name: "epic-all-showing",
      detail: "{}",
      description: "Its line was clicked:  the owner clears the filter, and every item shows."
    }
  ],
  slots: [],
  parts: [{ name: "base", description: "The line, a `<button>` drawn as a link." }],
  states: [],
  texts: [
    { key: "hiddenNote", text: "{count} hidden · show all", description: "The line;  a click shows all." },
    { key: "hiddenTip", text: "Show everything:  clear the filter", description: "The line's tooltip." }
  ],
  children: []
} as const satisfies EpicVocabulary
