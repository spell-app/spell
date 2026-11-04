/**
 * Every name `<epic-away-line>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

/****************
 * ### `<epic-away-line>`
 * One line of "0. While you were out", or the heading of one of its parts, with a tick of its own:  read, it leaves
 * the section, the rest stays (epic `epic-engine` I206).
 ****************/
export const epicAwayLineVocabulary = {
  tag: "epic-away-line",
  topics: ["notifications", "status"],
  aka: ["while you were out", "away line", "news line", "read", "seen"],
  noun: "away line",
  ui: false,
  description:
    'One line of "0. While you were out" (a phase done, a call waiting, an issue, a test), or a part\'s heading ' +
    '(What was done, Still to do), with a ✓ Read at its start while the page is reviewed (Owen, 2026-11-03:  "a tick ' +
    "per section as well, so I can say 'that's good' on part but not on the whole thing\").  Read, it fades at once, " +
    "and `epic inbox apply` takes it off;  the epic tool writes every one, never a person.",
  attributes: [
    {
      name: "line",
      kind: "string",
      description:
        "What it's about:  a phase's or an item's id (`p-while-you-were-out`, `i205`), or a part's (`done`, `todo`).  " +
        "Its Read mark goes under `away:<line>`."
    },
    {
      name: "working",
      kind: "boolean",
      description:
        "A phase still under way:  a half-filled circle spinning like a coin in place of the tick, nothing to read " +
        'yet (Owen, 2026-11-03:  "P23 icon should be the spinning coin half-circle").'
    },
    {
      name: "heading",
      kind: "boolean",
      description: "A part's heading (What was done, Still to do):  read, the whole part leaves the section."
    }
  ],
  events: [],
  slots: [{ name: "", description: "The line:  its link and its words." }],
  parts: [
    { name: "base", description: "The line:  the tick, then its words." },
    {
      name: "read",
      description: 'Its ✓ Read, while the page is reviewed:  an `<epic-review buttons="away-line">`.'
    },
    { name: "working", description: "A phase under way:  its spinning half circle." },
    { name: "body", description: "Its words." }
  ],
  states: [
    {
      name: "read",
      description: "Its Read mark is in the review inbox:  faded until `epic inbox apply` takes it off."
    },
    { name: "heading", description: "A part's heading." },
    { name: "working", description: "A phase still under way." }
  ],
  texts: [{ key: "buttonsLabel", text: "this line", description: "Read's group, spoken." }],
  children: [{ tag: "flow", description: "The line:  its link and its words." }],
  flow: true
} as const satisfies EpicVocabulary
