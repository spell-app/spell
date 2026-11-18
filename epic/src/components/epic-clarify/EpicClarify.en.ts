/**
 * Every name `<epic-clarify>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

/****************
 * ### `<epic-clarify>`
 * "Clarify", after an item's "_What it says on the tin._":  a click asks Claude for the item's details at once, no
 * Send (epic `epic-engine` I281);  with `icon`, the (i) button last on every item's line (T76, T95).
 ****************/
export const epicClarifyVocabulary = {
  tag: "epic-clarify",
  topics: ["documentation", "controls"],
  aka: [
    "clarify",
    "add details",
    "more details",
    "what it says on the tin",
    "explain",
    "info",
    "info icon",
    "(i)",
    "circle question",
    "question icon"
  ],
  noun: "clarify link",
  ui: false,
  description:
    'The "Clarify" after the words an item with no details is given ("_What it says on the tin._", epic `epic-engine` ' +
    "I278):  while the page is reviewed, a link whose click asks Claude for the item's details AT ONCE, no Send (I281;  " +
    'Owen, 2026-11-14:  "a link that instructs you to provide more details, without waiting for send").  The request ' +
    "is the old Add Details', so the item shows it under way as any request for now;  a click on the item's busy button " +
    "calls it off.  Not reviewed, or once asked:  nothing drawn.  The epic tool writes it (`PlanItem.giveBody()`), " +
    'never a person.  With `icon` (T76, T95;  Owen, 2026-11-18:  "add (i) clarify button to everything, issues, ' +
    "judgement calls, the lot\"):  an (i) button, last on an item's line, which `<epic-item>` draws in its shadow " +
    "root while the page is reviewed, on every kind of item, once its line comes near the screen.  " +
    "The same ask;  while Claude works on it, the icon turns like a coin, and a click calls it off.",
  attributes: [
    {
      name: "of",
      kind: "string",
      description:
        "Its item's id (`t9`), when it isn't written inside the `<epic-item>` (`<epic-item>` draws the icon in its " +
        "shadow root, where it can't find the item by itself);  else the item it's in."
    },
    {
      name: "icon",
      kind: "boolean",
      description: 'An (i) button instead of the "Clarify" link:  kept while Claude works, turning.'
    }
  ],
  events: [],
  slots: [],
  parts: [
    { name: "base", description: 'The "Clarify" link, or the icon\'s button, drawn only while the page is reviewed.' },
    {
      name: "icon",
      description: "With `icon`:  the (i) glyph, Spell UI's `info circle`, which turns like a coin while Claude works."
    }
  ],
  states: [
    {
      name: "turning",
      description: "With `icon`:  Claude is working on its item's details;  the icon turns, and a click calls it off."
    }
  ],
  texts: [
    { key: "clarify", text: "Clarify", description: "The link's words." },
    {
      key: "clarifyTip",
      text: "Ask Claude for this item's details now, without waiting for Send",
      description: "The link's tooltip."
    },
    {
      key: "iconTip",
      text: "Click to have Claude rewrite this item in plainer words.  It starts right away.",
      description: "With `icon`:  the button's tooltip and name."
    },
    {
      key: "turningTip",
      text: "Claude is rewriting this item to make it clearer.  Click to stop.",
      description: "With `icon`, while it turns:  the button's tooltip and name."
    }
  ],
  children: [],
  flow: true
} as const satisfies EpicVocabulary
