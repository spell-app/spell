/**
 * Every name `<epic-option-form>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

/****************
 * ### `<epic-option-form>`
 * The form for one option of a set (epic `epic-engine` P50):  a new one (Add choice), or one edited in place.
 ****************/
export const epicOptionFormVocabulary = {
  tag: "epic-option-form",
  topics: ["forms", "cards"],
  aka: ["add choice", "edit option", "new option", "option form"],
  skeleton: "4 tall",
  noun: "option form",
  ui: false,
  description:
    "The form for one option of a set (epic `epic-engine` P50), drawn by `<epic-choices>` (Add choice, an added " +
    "option changed before it's sent) and `<epic-option>` (its pencil), never written in a doc:  a title, a note that " +
    "grows as it's typed, a picture pasted, dropped or chosen, then Save and Cancel.  It saves nothing itself:  its " +
    "`epic-option-saved` event hands what was typed to the element drawing it.",
  attributes: [
    { name: "heading", kind: "string", description: "Its first line:  `New choice`, `Edit B`." },
    { name: "option-title", kind: "string", description: "The title it starts with;  none:  empty." },
    { name: "note", kind: "string", description: "The note it starts with, as text;  none:  empty." },
    {
      name: "shot",
      kind: "string",
      description:
        "The picture it starts with:  a path from the epic page's folder (`tests/s-upgrades-20261029-1432.png`), " +
        "as `POST shot` answered it."
    },
    {
      name: "for",
      property: "htmlFor",
      kind: "string",
      description:
        "Whose option it is:  the id its set's mark is kept under (`q52`, `p-choices-questions`, `s-upgrades`)."
    },
    { name: "submit", kind: "string", description: "Its Save button's words;  none:  `Save`." }
  ],
  events: [
    {
      name: "epic-option-saved",
      detail: "{ title: string, note: string, shot?: string }",
      description: "Save pressed (or Ctrl / Cmd + Enter) with a title:  what's typed, the picture's path if any."
    },
    { name: "epic-option-canceled", detail: "{}", description: "Cancel pressed, or Escape." }
  ],
  slots: [],
  parts: [
    { name: "base", description: "The form:  your ivory card." },
    { name: "heading", description: "Its first line." },
    { name: "title", description: "The title's `<input>`." },
    { name: "note", description: "The note's `<epic-text-box>`, which grows as it's typed." },
    {
      name: "picture",
      description: "The picture's area:  paste or drop one there, or choose one;  its thumbnail once there is one."
    },
    { name: "actions", description: "Save and Cancel." }
  ],
  states: [{ name: "saving", description: "A picture is being saved:  Save waits." }],
  texts: [
    { key: "title", text: "Title", description: "The title's placeholder and label." },
    { key: "note", text: "What it means, its pros and cons", description: "The note's placeholder and label." },
    {
      key: "paste",
      text: "Paste or drop a picture here",
      description: "The picture's area, while it has none."
    },
    { key: "choose", text: "Choose…", description: "The picture's chooser button." },
    { key: "saving", text: "Saving…", description: "The picture's area while it's saved." },
    { key: "removeShot", text: "Remove the picture", description: "The ×'s label and tooltip." },
    { key: "save", text: "Save", description: "Save's words, without `submit`." },
    { key: "saveTip", text: "Keep it (Ctrl / Cmd + Enter):  sent with your next Send", description: "Save's tooltip." },
    { key: "cancel", text: "Cancel", description: "Cancel's words." },
    { key: "cancelTip", text: "Close the form, keeping nothing (Escape)", description: "Cancel's tooltip." },
    { key: "needsTitle", text: "Give it a title first.", description: "Save without a title:  the notice." },
    { key: "notImage", text: "That isn't a picture.", description: "A file that isn't an image:  the notice." },
    { key: "tooBig", text: "That picture is over 8 MB.", description: "A picture too big to save:  the notice." }
  ],
  children: []
} as const satisfies EpicVocabulary
