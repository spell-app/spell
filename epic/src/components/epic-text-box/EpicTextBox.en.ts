/**
 * Every name `<epic-text-box>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

/****************
 * ### `<epic-text-box>`
 * A box you type in, on a page you answer on:  the page's notes, a comment, Other, the feedback.
 ****************/
export const epicTextBoxVocabulary = {
  tag: "epic-text-box",
  topics: ["forms", "text"],
  aka: ["notes box", "comment box", "textarea", "text field", "other", "feedback", "suggested text", "code box"],
  skeleton: "2 tall",
  noun: "text box",
  ui: false,
  description:
    "A box you type in, on a page you answer on (epic `epic-workflow` P12):  one line to start, growing with its " +
    "text.  What you type is part of the page's answer, by `type` and `for`:  the page's notes, a comment on a " +
    "section or an option, a question's Other, a choice page's feedback.  The page's notes box also " +
    "shows what the page KEPT (P18):  text typed for a question, option or section an agent's rewrite took off " +
    "the page, under its old title, sent with the rest until you drop it.  A box may start with Claude's SUGGESTED " +
    "text, its seed (epic `ast-markup`):  you edit it into your own, and a box left as it was is sent as kept.",
  attributes: [
    {
      name: "type",
      kind: "enum",
      values: ["notes", "comment", "other", "feedback", "note"],
      default: "comment",
      description:
        "What it holds:  `notes` (the page's notes for Claude, once a page), `comment` (on the section `for` " +
        "names, or an option, `q1-B`), `other` (question `for`'s Other, drawn by `<epic-ask>`), `feedback` " +
        "(a choice page's, drawn by `<epic-choices-bar>`), `note` (none of a page's answer:  read by the element " +
        "drawing it:  `<epic-option-form>`'s, `<epic-new-item>`'s)."
    },
    {
      name: "for",
      property: "htmlFor",
      kind: "string",
      description:
        "Whose it is:  a comment's section id (`context`) or option (`q1-B`), Other's question key (`q1`).  " +
        "Notes and feedback need none."
    },
    {
      name: "placeholder",
      kind: "string",
      description: "Its grey hint while empty;  none:  its type's own (`Notes for Claude:  anything, any time`)."
    },
    {
      name: "label",
      kind: "string",
      description: "Its name for a screen reader;  none:  its placeholder."
    },
    {
      name: "max-height",
      kind: "string",
      description:
        "How tall it grows before it scrolls, a CSS length:  `40vh`, `50vh`;  none:  a third of the window.  " +
        "For a box another element draws, with room of its own (`<epic-agents>`' redirect box, `<epic-new-item>`)."
    },
    {
      name: "code",
      kind: "boolean",
      description:
        "For code or markup:  monospace, lines never wrap (it scrolls sideways), Tab indents (Shift-Tab takes it " +
        "back;  Escape, then Tab, moves on);  it still grows with its lines."
    }
  ],
  events: [],
  slots: [],
  parts: [
    { name: "base", description: "The box around the text field." },
    {
      name: "field",
      description:
        "The `<ui-textarea grow>`:  one line to start, growing with its text to a third of the window " +
        "(`max-height`);  its own `control` part is the native `<textarea>`."
    },
    {
      name: "kept",
      description:
        "A notes box's KEPT text, above its field, while there is any:  an orange-edged box, \"Kept from before " +
        'the page changed", then each text.'
    },
    {
      name: "kept-item",
      description: "One kept text:  its old title (the id it was under on hover), what was typed, and a × to drop it."
    },
    {
      name: "reset",
      description: "A seeded box's button back to its suggested text, under its field while what's in it differs."
    }
  ],
  states: [
    { name: "filled", description: "Something is typed in it." },
    { name: "edited", description: "A seeded box no longer holds its suggested text." }
  ],
  texts: [
    { key: "notes", text: "Notes for Claude:  anything, any time", description: "A `notes` box's placeholder." },
    { key: "note", text: "Your note", description: "A `note` box's placeholder, without one of its own." },
    { key: "notesTitle", text: "Notes", description: "The notes' title, where a draft keeps them." },
    {
      key: "keptTitle",
      text: "Kept from before the page changed",
      description: "The title of a notes box's kept text."
    },
    {
      key: "keptWhy",
      text:
        "The page was rewritten since you typed these, and what they were for is gone from it.  They're sent " +
        "with the rest:  drop one once it's said elsewhere.",
      description: "Under the kept text's title:  what it is."
    },
    { key: "keptDrop", text: "Drop {label}", description: "A kept text's ×, for a screen reader." },
    {
      key: "keptDropTip",
      text: "Drop it:  no longer sent",
      description: "A kept text's ×'s tooltip."
    },
    { key: "comment", text: "Comment on this section", description: "A `comment` box's placeholder." },
    { key: "reset", text: "Back to the suggestion", description: "A seeded box's reset button." },
    {
      key: "resetTip",
      text: "Put Claude's suggested text back, and lose your changes",
      description: "The reset button's tooltip."
    },
    { key: "other", text: "Other:  your own answer", description: "An `other` box's placeholder." },
    {
      key: "feedback",
      text: "Feedback for Claude:  anything the boxes don't say",
      description: "A `feedback` box's placeholder."
    }
  ],
  children: [
    {
      tag: "flow",
      max: 1,
      description:
        'Its SEED, the text it starts with:  a `<script type="text/plain">` (or a `<template>`), read as ' +
        "`<ui-code>` reads its own, dedented;  `<`, quotes and braces need no escaping.  Sent only once it's changed."
    }
  ]
} as const satisfies EpicVocabulary
