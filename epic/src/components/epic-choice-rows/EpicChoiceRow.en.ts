/**
 * Every name `<epic-choice-row>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

/****************
 * ### `<epic-choice-row>`
 * One row of a choice page:  a use site, the box holding Claude's recommendation for it, and a comment box.
 ****************/
export const epicChoiceRowVocabulary = {
  tag: "epic-choice-row",
  topics: ["tables", "forms"],
  aka: ["syntax choice", "rename", "name choice", "row"],
  noun: "choice row",
  ui: false,
  description:
    "One row of a choice page (epic `epic-workflow` P12), in an `<epic-choice-rows>`:  the use site " +
    "(File, opening VS Code at the line), what it's for, how it reads today, and a box pre-filled with Claude's " +
    "recommendation.  You type over it, or leave it;  a changed box is orange, with a round button putting " +
    "the recommendation back.  Under it, a comment box for your choice or notes on that row alone (epic " +
    "`epic-engine` P58).  The row's note is a column of its own, last.  In a table you put in order (`<epic-choice-rows reorder>`), its place first, " +
    "with move up / move down.",
  attributes: [
    {
      name: "name",
      kind: "string",
      required: true,
      description: "Its id in the rows file (`q1-UISection-169`):  its box's key in the draft and the answer."
    },
    {
      name: "file",
      kind: "string",
      description: "Its file, from the repo's root:  the File cell opens it in VS Code."
    },
    { name: "line", kind: "number", description: "Its line in `file`, from 1." },
    { name: "purpose", kind: "string", description: "What it's for, in words a reader new to it follows." },
    {
      name: "note",
      kind: "string",
      description:
        "A short why, small, in the Explanation column, last (epic `epic-engine` P58, r51);  its line breaks show, " +
        "and `` `code` `` in it shows as code."
    },
    { name: "current", kind: "string", description: "How the use site reads today (`this.isOpen()`)." },
    {
      name: "recommended",
      kind: "string",
      description: "Claude's call, the box's starting text;  the same as `current` for a row that stays."
    }
  ],
  events: [],
  slots: [],
  parts: [
    { name: "base", description: "Its cells, laid out on its table's columns." },
    {
      name: "order",
      description: "The Order cell, in a table you put in order:  its place, and its move up / move down buttons."
    },
    { name: "up", description: "The move up button:  it swaps places with the row above." },
    { name: "down", description: "The move down button:  it swaps places with the row below." },
    {
      name: "file",
      description: "The File cell:  the file's name and line, a link into VS Code;  its folder under it."
    },
    { name: "purpose", description: "The Purpose cell:  the purpose, and `stays` when it stays." },
    {
      name: "note",
      description: "The Explanation cell, last:  the note;  empty for a row without one, in a table where others have one."
    },
    { name: "current", description: "The Current cell:  today's text, as code." },
    { name: "copy", description: "With `blank`:  today's text over the box, a button that copies it into the box." },
    { name: "pick", description: "The Recommended cell:  the box, and the reset button once it differs." },
    {
      name: "box",
      description:
        "The `<ui-textarea grow>`:  one line of text, wrapping and growing;  Enter adds no line.  Its own `control` " +
        "part is the native `<textarea>`."
    },
    { name: "reset", description: "The round button putting the recommendation back." },
    {
      name: "comment",
      description:
        "The comment box under the box, a `<ui-textarea grow>`:  your choice or notes on this row, free text;  Enter " +
        "adds a line.  Saved and sent with the box."
    }
  ],
  states: [
    { name: "changed", description: "Its box differs from the recommendation:  orange." },
    { name: "stays", description: "Claude recommends no change." }
  ],
  texts: [
    { key: "stays", text: "stays", description: "The tag after a purpose whose row stays." },
    { key: "boxLabel", text: "Recommended for {current}", description: "The box's name, for a screen reader." },
    { key: "reset", text: "Back to the recommendation", description: "The reset button's name." },
    { key: "resetTip", text: "Back to {recommended}", description: "The reset button's tooltip." },
    { key: "blankLabel", text: "Yours for {current}:  blank keeps it", description: "With `blank`:  the box's name." },
    { key: "copyTip", text: "Copy into the box", description: "With `blank`:  today's text's tooltip." },
    { key: "clear", text: "Clear the box", description: "With `blank`:  the reset button's name and tooltip." },
    {
      key: "commentPlaceholder",
      text: "Your choice, notes ...",
      description: "The comment box's placeholder, until you type."
    },
    { key: "commentLabel", text: "Your notes on {current}", description: "The comment box's name, for a screen reader." },
    { key: "openTip", text: "Open {file}:{line} in VS Code", description: "The file link's tooltip." },
    { key: "up", text: "Move up", description: "The move up button's name and tooltip." },
    { key: "down", text: "Move down", description: "The move down button's name and tooltip." }
  ],
  children: []
} as const satisfies EpicVocabulary
