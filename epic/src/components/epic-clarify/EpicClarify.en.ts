/**
 * Every name `<epic-clarify>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

/****************
 * ### `<epic-clarify>`
 * "Clarify", after an item's "_What it says on the tin._":  a click asks Claude for the item's details at once, no
 * Send (epic `epic-engine` I281).
 ****************/
export const epicClarifyVocabulary = {
  tag: "epic-clarify",
  topics: ["documentation", "controls"],
  aka: ["clarify", "add details", "more details", "what it says on the tin", "explain"],
  noun: "clarify link",
  ui: false,
  description:
    'The "Clarify" after the words an item with no details is given ("_What it says on the tin._", epic `epic-engine` ' +
    "I278):  while the page is reviewed, a link whose click asks Claude for the item's details AT ONCE, no Send (I281;  " +
    'Owen, 2026-11-14:  "a link that instructs you to provide more details, without waiting for send").  The request ' +
    "is the old Add Details', so the item shows it under way as any request for now;  a click on the item's busy button " +
    "calls it off.  Not reviewed, or once asked:  nothing drawn.  The epic tool writes it (`PlanItem.giveBody()`), " +
    "never a person.",
  attributes: [],
  events: [],
  slots: [],
  parts: [{ name: "base", description: 'The "Clarify" link, drawn only while the page is reviewed.' }],
  states: [],
  texts: [
    { key: "clarify", text: "Clarify", description: "The link's words." },
    {
      key: "clarifyTip",
      text: "Ask Claude for this item's details now, without waiting for Send",
      description: "The link's tooltip."
    }
  ],
  children: [],
  flow: true
} as const satisfies EpicVocabulary
