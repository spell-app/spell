/**
 * Every name `<epic-page-note-head>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its
 * children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell-epic/definitions"

/****************
 * ### `<epic-page-note-head>`
 * The head line of an old PAGE NOTE (`<spell-note>`):  who and when, its first line while folded, its status;  a
 * click folds the note.
 ****************/
export const epicPageNoteHeadVocabulary = {
  tag: "epic-page-note-head",
  topics: ["messages", "status"],
  aka: ["page note", "note head", "spell note", "old note"],
  noun: "note head",
  ui: false,
  description:
    "The head line of an old page note (`<spell-note>`, epic `airplane` P3:  written into a guide before comments " +
    'replaced them, read only since), drawn by the docs runtime first in each note:  "Owen · 10/10 14:02", the ' +
    "note's first line while it's folded, its status (new yellow, answered violet, done grey) and how many replies.  " +
    "The whole line is one button:  a click folds or unfolds the note.",
  attributes: [
    { name: "at", kind: "string", description: "When Owen wrote it, as the note says:  `2026-10-09 22:10`." },
    {
      name: "status",
      kind: "enum",
      values: ["new", "answered", "done"],
      default: "new",
      description: "The note's status, by the colour scheme:  `new` yellow (open), `answered` violet, `done` grey."
    },
    { name: "replies", kind: "number", description: "How many replies Claude wrote under it;  none:  not said." },
    { name: "preview", kind: "string", description: "The note's first line:  shown while it's folded." },
    {
      name: "open",
      kind: "boolean",
      description: "The note is open:  its preview hides.  A click flips it, and says so (`epic-page-note-fold`)."
    }
  ],
  events: [
    {
      name: "epic-page-note-fold",
      detail: "{ open: boolean }",
      description: "Owen clicked it:  the note should open or fold, as `open` now says."
    }
  ],
  slots: [],
  parts: [
    { name: "base", description: "The line, a `<button>`:  the icon, who and when, the preview, the status." },
    { name: "status", description: "Its status chip, and how many replies." }
  ],
  states: [],
  texts: [
    { key: "who", text: "Owen", description: "Who wrote a page note." },
    { key: "reply", text: "1 reply", description: "After the status:  one reply." },
    { key: "replies", text: "{count} replies", description: "After the status:  several replies." }
  ],
  children: []
} as const satisfies EpicVocabulary
