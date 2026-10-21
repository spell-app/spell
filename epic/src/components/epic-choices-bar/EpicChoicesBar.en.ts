/**
 * Every name `<epic-choices-bar>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell dev pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "$/epics/definitions"

/****************
 * ### `<epic-choices-bar>`
 * A choice page's bar, pinned to the window's bottom:  the feedback, "Do it", and where things stand.
 ****************/
export const epicChoicesBarVocabulary = {
  tag: "epic-choices-bar",
  topics: ["forms", "buttons"],
  aka: ["do it", "toolbar", "send bar", "feedback"],
  skeleton: "3 tall",
  noun: "choices bar",
  ui: false,
  description:
    "A choice page's bar (epic `epic-workflow` P12), last on the page and pinned to the window's bottom:  " +
    'the feedback box, then "Do it", which sends every changed box and the feedback to Claude;  under them, ' +
    "the save status when a save failed (red), Copy my answers and Expand all;  then what was sent, or why not.  " +
    "What's typed is kept in the browser at once and saves itself to the page server as a draft as Owen types, " +
    "and as the page goes away;  a save that fails tries again every 3s.  Once a page.",
  attributes: [],
  events: [],
  slots: [],
  parts: [
    { name: "base", description: "The bar." },
    { name: "feedback", description: 'The feedback box, an `<epic-text-box type="feedback">`.' },
    { name: "send", description: '"Do it" (`<ui-button>`):  its tooltip counts the changed boxes.' },
    {
      name: "meta",
      description: "The line under them:  the save status (only when it failed), Copy my answers, Expand all."
    },
    {
      name: "copy",
      description: "Copy my answers (`<ui-button>`):  what's typed, as the draft's JSON, onto the clipboard."
    },
    { name: "expand", description: "Expand all / Collapse all:  every section of rows." },
    { name: "error", description: 'Why "Do it" failed.' },
    { name: "sent", description: "What was sent, and when;  orange once changed since." }
  ],
  states: [{ name: "stale", description: "Changed since the answer was sent:  press Do it again." }],
  texts: [
    { key: "doIt", text: "Do it", description: "The button." },
    {
      key: "sendTip",
      text: "Send {changed} changed of {rows}, and the feedback, to Claude",
      description: "The button's tooltip:  the count."
    },
    { key: "copyAnswers", text: "Copy my answers", description: "Puts what's typed on the clipboard." },
    { key: "copied", text: "Copied", description: "Copy my answers, for a moment after a click." },
    {
      key: "copyTip",
      text: "Copy every box you changed, and the feedback, as JSON:  for when this page can't save",
      description: "Copy my answers' tooltip."
    },
    {
      key: "copyFailed",
      text: "Couldn't copy:  the browser refused the clipboard",
      description: "Copy my answers' tooltip after a copy failed."
    },
    { key: "expandAll", text: "Expand all", description: "Unfolds every section of rows." },
    { key: "collapseAll", text: "Collapse all", description: "Once every section is open:  folds them." }
  ],
  children: []
} as const satisfies EpicVocabulary
