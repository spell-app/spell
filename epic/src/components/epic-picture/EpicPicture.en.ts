/**
 * Every name `<epic-picture>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

/****************
 * ### `<epic-picture>`
 * A picture the person gave an item (epic `epic-engine` T87):  pasted into the chat that filed it, or handed to
 * `epic add --picture`;  deletable from the page.
 ****************/
export const epicPictureVocabulary = {
  tag: "epic-picture",
  topics: ["documentation", "media"],
  aka: ["picture", "screenshot", "image", "pasted picture", "attachment"],
  noun: "picture",
  ui: false,
  description:
    'A picture the person gave an item (epic `epic-engine` T87;  Owen, 2026-11-16:  "when I paste a picture into ' +
    "chat which gets logged as an issue or todo, include the picture in the epic doc.  Make it so I can delete those " +
    'pictures from the epic page, which deletes the files"):  its `<img>`, a thumbnail a click opens full size, ' +
    "saved beside the page in `pictures/`.  While the page is reviewed, a trash at its corner deletes it:  gone at " +
    "once, with Undo in the page's notices for 6 seconds, then taken out of the item and its file deleted by the " +
    "page server.  The epic tool writes it (`epic add <epic>#I --picture <file>`, `--pasted <n>`), never a person.  " +
    "Labelled (epic `epic-engine` P75):  IMG1, IMG2 ... a chip on its corner, so the person can name it in words;  " +
    "the comment threads, a note box's strip, the kickoff box and the quoted kickoff prompt draw their pictures " +
    "through it too.",
  attributes: [
    {
      name: "label",
      kind: "string",
      description:
        "Its label, `IMG2`, drawn as a small chip on the thumbnail's top left corner (epic `epic-engine` P75):  what " +
        "the person writes to name it (\"IMG2 is wrong\").  The epic tool writes an item's, in order;  a box's strip " +
        "and a comment's words draw theirs from the words.  None:  no chip."
    },
    {
      name: "removable",
      kind: "boolean",
      description:
        "Drawn in a box still being written (a note box's strip, the kickoff box, an option's form):  an x at its top " +
        "right corner sends `epic-picture-removed`, and the box takes the picture's words out.  Never with the trash."
    }
  ],
  events: [
    {
      name: "epic-picture-removed",
      detail: "{ label: string, src: string }",
      description: "Its x pressed (`removable`):  its label and its picture's address, for the box to take it out."
    }
  ],
  slots: [{ name: "", description: "Its `<img src alt>`:  the picture, found by the page with no script too." }],
  parts: [
    { name: "base", description: "The box around the picture." },
    { name: "delete", description: "The trash, at its top right corner, drawn only while the page is reviewed." },
    { name: "label", description: "Its label's chip, `IMG2`, at its top left corner." },
    { name: "remove", description: "The x at its top right corner, drawn only when `removable`." }
  ],
  states: [],
  texts: [
    {
      key: "deleteTip",
      text: "Delete the picture and its file",
      description: "The trash's tooltip and name."
    },
    { key: "deleted", text: "Picture deleted", description: "The notice after the trash is clicked." },
    { key: "undo", text: "Undo", description: "The notice's button, which puts the picture back." },
    {
      key: "removeTip",
      text: "Remove {label}",
      description: "The x's tooltip and name (`removable`):  `{label}`, its label, else `this picture`."
    },
    { key: "thisPicture", text: "this picture", description: "What the x's tooltip names when it has no label." }
  ],
  children: [{ tag: "flow", description: "Its `<img>`." }],
  flow: true
} as const satisfies EpicVocabulary
