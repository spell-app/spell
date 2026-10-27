/**
 * Every name `<epic-sort>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

/****************
 * ### `<epic-sort>`
 * The Epics page's sort buttons, A–Z and Date:  how every `<epic-list>` on the page sorts each group.
 ****************/
export const epicSortVocabulary = {
  tag: "epic-sort",
  topics: ["documentation", "controls"],
  aka: ["sort", "sort buttons", "A-Z", "by date"],
  skeleton: "inline 6 x 1.5",
  noun: "sort",
  ui: false,
  description:
    "The Epics page's sort buttons (Owen, 2026-10-13:  \"Add buttons to epics header to sort by date or " +
    'alphabetical"):  A–Z sorts each group of every `<epic-list>` on the page by title, Date by when each epic ' +
    "was last worked on, newest first.  The one in use is pressed, and remembered in this browser.  The docs " +
    "runtime puts it in the Epics page's header.",
  attributes: [],
  events: [
    {
      name: "epic-sorting",
      detail: '{ sort: "title" | "date" }',
      description: "The reader picked a sort:  every `<epic-list>` on the page sorts by it."
    }
  ],
  slots: [],
  parts: [{ name: "base", description: "The pair of buttons, a `<ui-buttons>`." }],
  states: [],
  texts: [
    { key: "label", text: "Sort the epics in each group", description: "The pair, spoken." },
    { key: "title", text: "A–Z", description: "The title sort's words." },
    { key: "titleTip", text: "Sort each group by title, A to Z", description: "The title sort's tooltip." },
    { key: "date", text: "Date", description: "The date sort's words." },
    {
      key: "dateTip",
      text: "Sort each group by when it was last worked on, newest first",
      description: "The date sort's tooltip."
    },
    { key: "inUse", text: "{words}, in use", description: "The pressed button's name, spoken." }
  ],
  children: []
} as const satisfies EpicVocabulary
