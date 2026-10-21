/**
 * Every name `<epic-list>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "$/epics/definitions"

/****************
 * ### `<epic-list>`
 * The Epics page's list:  every epic's card, in five groups, under a row of saga chips.
 ****************/
export const epicListVocabulary = {
  tag: "epic-list",
  topics: ["documentation", "containers", "cards"],
  aka: ["epics list", "epics page", "epic groups", "saga chips", "favorites"],
  skeleton: "8 tall",
  noun: "list",
  ui: false,
  description:
    "The Epics page's list (epic `epic-engine` P3):  its `<epic-card>`s in five groups -- Favorites, Active, " +
    "Planning, Urgent, Done -- each under a heading with its count, by title within each or newest first " +
    "(`<epic-sort>`);  above them a chip per saga, in the sagas' order, then No saga, each with its count:  a click " +
    "shows only that saga's epics.  It never moves its cards:  it places and hides them from its shadow root.  " +
    "Written by `epic pages index` (`$/epics/list/EpicCards` `epicListHtml()`).",
  attributes: [
    {
      name: "sagas",
      kind: "string",
      description:
        "The sagas' ids, in Owen's order, space-separated:  the chips' order.  A saga none of its cards names gets " +
        "no chip;  a card naming a saga not listed is No saga's."
    },
    {
      name: "no-favorites",
      kind: "boolean",
      description:
        "No Favorites group:  a starred card stays in its own group.  A saga page's Epics (`<epic-cards>`):  Favorites " +
        "is Owen's own list, on the Epics page."
    }
  ],
  events: [],
  slots: [{ name: "", description: "Its cards, `<epic-card>`s, in any order." }],
  parts: [
    { name: "base", description: "The box around the chips and the groups." },
    { name: "chips", description: "The saga chips' row." },
    { name: "chip", description: "One saga's chip:  its title and how many of its epics there are;  pressed while shown." },
    { name: "cards", description: "The grid of headings and cards." },
    { name: "group-title", description: "A group's heading:  its icon, title and how many of its cards show." }
  ],
  states: [],
  texts: [
    { key: "favoritesTitle", text: "Favorites", description: "A group:  the starred epics, whatever their state." },
    { key: "activeTitle", text: "Active", description: "A group:  phases left, in progress or paused." },
    { key: "planningTitle", text: "Planning", description: "A group:  future epics, and ones with no phases yet." },
    { key: "urgentTitle", text: "Urgent", description: "A group:  every phase done, items waiting on Owen." },
    { key: "doneTitle", text: "Done", description: "A group:  every phase done, nothing waiting." },
    { key: "chipsLabel", text: "Show the epics of a saga", description: "The chips' row, spoken." },
    { key: "noSaga", text: "No saga", description: "The chip of the epics that name no saga." },
    {
      key: "noSagaTip",
      text: "Epics that name no saga yet:  epic saga set <epic> <saga>",
      description: "The No saga chip's tooltip."
    },
    { key: "showOnly", text: "Click to show only {saga}", description: "A chip's tooltip's last line, while shown." },
    { key: "showToo", text: "Click to show {saga} too", description: "A chip's tooltip's last line, while hidden." }
  ],
  children: [{ tag: "epic-card", description: "One epic's card, any number, in any order." }]
} as const satisfies EpicVocabulary
