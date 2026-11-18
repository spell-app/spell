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
    "option changed before it's sent) and `<epic-option>` (its pencil), never written in a doc:  ONE box that grows as it's " +
    "typed, its first line the title and the rest the note, a picture pasted, dropped or chosen going into its words " +
    "(I334), then Save and Cancel.  It saves nothing itself:  its " +
    "`epic-option-saved` event hands what was typed to the element drawing it.",
  attributes: [
    { name: "heading", kind: "string", description: "Its first line:  `New choice`, `Edit B`." },
    { name: "option-title", kind: "string", description: "The title it starts with;  none:  empty." },
    {
      name: "note",
      kind: "string",
      description: "The note it starts with, as text, on the lines under the title;  none:  empty."
    },
    {
      name: "shot",
      kind: "string",
      description:
        "An added option's picture from before I334, kept apart from its note:  a path from the epic page's folder " +
        "(`tests/s-upgrades-20261029-1432.png`), as `POST shot` answered it;  the box starts with its words at the end."
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
      detail: "{ title: string, note: string }",
      description:
        "Save pressed (or Ctrl / Cmd + Enter) with a title:  the box's first line, and the rest (a picture's words, " +
        "`![picture](<path>)`, in it)."
    },
    { name: "epic-option-canceled", detail: "{}", description: "Cancel pressed, or Escape." }
  ],
  slots: [],
  parts: [
    { name: "base", description: "The form:  your violet card." },
    { name: "heading", description: "Its first line." },
    {
      name: "words",
      description: "Its one box, an `<epic-text-box>` that grows as it's typed:  the title, then the note."
    },
    { name: "actions", description: "Save, Cancel and the picture button." },
    { name: "choose", description: "The picture button, a small round one:  a picture file into the words." }
  ],
  states: [{ name: "saving", description: "A picture is being saved:  Save waits." }],
  texts: [
    {
      key: "words",
      text: "Your choice on the first line, then what it means.  You can paste a picture too.",
      description: "The box's placeholder (`spell voice check`:  a pass)."
    },
    { key: "wordsLabel", text: "Your choice and what it means", description: "The box's name, for a screen reader." },
    { key: "choose", text: "Add a picture from a file", description: "The picture button's label and tooltip." },
    { key: "save", text: "Save", description: "Save's words, without `submit`." },
    { key: "saveTip", text: "Keep it (Ctrl / Cmd + Enter):  sent with your next Send", description: "Save's tooltip." },
    { key: "cancel", text: "Cancel", description: "Cancel's words." },
    { key: "cancelTip", text: "Close the form, keeping nothing (Escape)", description: "Cancel's tooltip." },
    {
      key: "needsTitle",
      text: "Your choice needs a title.  Type it on the first line, then press Save again.",
      description: "Save with no words on the first line, or only a picture:  the notice."
    },
    {
      key: "titleTooLong",
      text: "The first line is the title:  300 characters at most.",
      description: "Save with a first line too long for a title:  the notice."
    },
    { key: "notImage", text: "That isn't a picture.", description: "A file that isn't an image:  the notice." },
    { key: "tooBig", text: "That picture is over 8 MB.", description: "A picture too big to save:  the notice." }
  ],
  children: []
} as const satisfies EpicVocabulary
