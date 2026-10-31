/**
 * Every name `<epic-focus>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

/****************
 * ### `<epic-focus>`
 * Focus mode:  a full-screen overlay over an epic page that walks its open items one at a time.
 ****************/
export const epicFocusVocabulary = {
  tag: "epic-focus",
  topics: ["documentation", "overlays", "dialogs"],
  aka: ["focus mode", "walk through", "one at a time", "review mode", "item walker"],
  noun: "focus",
  ui: false,
  description:
    "Focus mode (epic `epic-engine` P57):  a full-screen overlay over an epic page that walks its OPEN items and " +
    "phases one at a time -- the ones the page draws red, orange, blue or yellow -- so you make a call on each " +
    "without scrolling.  A tab per kind (Phases, Questions, Todos, Calls, Issues, Tests), each with its count and " +
    "the section's own state chips;  the item's id, title and whole text, its own review buttons and note box (the " +
    "page's marks, the page's Send), then Back and Next (← and →).  Drawn by `<epic-page>` in its shadow root, " +
    "opened from its header's gear, never written in a page.  It keeps its place (tab, item, chips) in this browser.",
  attributes: [
    {
      name: "for",
      kind: "string",
      description:
        "The id of the element holding the sections it walks, when it isn't drawn by an epic page (a live example on " +
        "a docs page).  None:  the `<epic-page>` around it."
    }
  ],
  events: [
    {
      name: "epic-focus-toggled",
      detail: "{ open }",
      description: "It opened or closed:  the page moves its Send into the overlay's bar while it's open, and back."
    }
  ],
  slots: [
    {
      name: "send",
      description: "The page's Send (`<epic-send-buttons countdown>`), at the top bar's right while it's open."
    }
  ],
  parts: [
    { name: "base", description: "The full-screen `<ui-modal>`." },
    { name: "tabs", description: "The tabs, one per kind with open items, each with its count." },
    { name: "chips", description: "The tab's state chips (`<epic-state-filter>`)." },
    { name: "where", description: "Where you are:  `3 of 12 · Questions 1 of 3`." },
    { name: "item", description: "The item:  its id chip, title and whole text." },
    { name: "body", description: "The item's text, a copy of its body on the page." },
    { name: "note-box", description: "Its note box, the page's (`<epic-review shows=note>`)." },
    { name: "review-buttons", description: "Its review buttons, the page's (`<epic-review shows=buttons>`)." },
    { name: "back", description: "Back:  the item before." },
    { name: "next", description: "Next:  the item after, the next tab's first after a tab's last." }
  ],
  states: [{ name: "open", description: "Showing." }],
  texts: [
    { key: "heading", text: "Focus mode", description: "The overlay's name." },
    { key: "phasesTab", text: "Phases" },
    { key: "questionsTab", text: "Questions" },
    { key: "todosTab", text: "Todos" },
    { key: "judgementsTab", text: "Calls", description: "Judgement calls' tab." },
    { key: "issuesTab", text: "Issues" },
    { key: "testsTab", text: "Tests" },
    { key: "tabsLabel", text: "Kinds of item", description: "The tabs' group, for a screen reader." },
    {
      key: "tabTip",
      text: "{tab}:  {count} to go through",
      description: "A tab's tooltip:  how many of its items show, by its chips."
    },
    {
      key: "where",
      text: "{at} of {total} · {tab} {atTab} of {inTab}",
      description: "Where you are:  overall, then in the tab."
    },
    { key: "back", text: "Back", description: "Back's words." },
    { key: "backTip", text: "The item before (←)", description: "Back's tooltip." },
    { key: "next", text: "Next", description: "Next's words." },
    { key: "nextTip", text: "The next item (→)", description: "Next's tooltip." },
    {
      key: "nothing",
      text: "Nothing open to go through:  every item is done, decided or hidden by the chips.",
      description: "No item shows."
    },
    {
      key: "loading",
      text: "Loading its text…",
      description: "The item's part file on its way."
    },
    {
      key: "noText",
      text: "Its text couldn't load:  {source}",
      description: "The item's part file didn't load."
    },
    {
      key: "closeTip",
      text: "Close Focus mode (Escape)",
      description: "The close button's tooltip."
    }
  ],
  children: []
} as const satisfies EpicVocabulary
