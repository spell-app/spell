/**
 * Every name `<epic-comment-pane>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its
 * children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell-epic/definitions"

/****************
 * ### `<epic-comment-pane>`
 * The small floating pane Owen writes a NEW comment in:  the bullhorn's, or ⌘ / Ctrl I's on selected text.
 ****************/
export const epicCommentPaneVocabulary = {
  tag: "epic-comment-pane",
  topics: ["forms", "overlays", "messages"],
  aka: ["comment box", "comment pane", "bullhorn box", "new comment", "floating pane"],
  noun: "comment pane",
  ui: false,
  description:
    'The small floating pane Owen writes a NEW comment in (epic `airplane` P11;  Owen, 2026-10-10:  "a little ' +
    "floating pane below the selected text that I can move around -- don't scroll the page and lose context!\"), " +
    "drawn by the docs runtime's comments when he clicks a bullhorn or comments on selected text.  Fixed on the " +
    "screen just under what he clicked (`near`), above it when there's no room below;  he drags it by its header.  " +
    "Ivory, 8px inside on every side, no buttons below its text.  Its header:  the bullhorn, the first words it's on " +
    "(its tooltip the block in full), the floppy once saved, the trash once saved, and ×.  Its field is slotted:  " +
    "the comments' code saves it as he types.",
  attributes: [
    {
      name: "headline",
      kind: "string",
      description: "The first words it's on, in quotes (`“Owen leaves a comment …”`), or `This page`."
    },
    {
      name: "about",
      kind: "string",
      description: "Which block it's on, in full (`On a table in “Comments”`):  its header's tooltip."
    },
    {
      name: "saved",
      kind: "string",
      description: "The floppy, in its header, and its tooltip:  `Saved 14:02 · waiting for Claude`;  none:  no floppy."
    },
    { name: "failed", kind: "boolean", description: "The last save failed:  the floppy red, `saved` saying why." },
    {
      name: "deletable",
      kind: "boolean",
      description: "The comment is saved:  the trash shows, to delete it at once (Undo in the toast that follows)."
    },
    {
      name: "near",
      kind: "json",
      description:
        "Where to open:  the box of what Owen clicked or selected, `{ left, top, bottom }` in the window's pixels.  " +
        "It goes 8px under it, above it when there's no room below, never past the window's edges, 8px in.  A " +
        "property;  none:  centred near the top."
    }
  ],
  events: [
    { name: "epic-comment-close", detail: "{}", description: "× pressed:  save what's typed, then close it." },
    {
      name: "epic-comment-delete",
      detail: "{}",
      description: "The trash pressed:  delete the comment at once (Undo in the toast that follows)."
    }
  ],
  slots: [{ name: "", description: "Owen's field (a `<ui-textarea>`), under the header." }],
  parts: [
    { name: "base", description: "The pane:  ivory, an outline, rounded, lifted off the page by a shadow." },
    { name: "header", description: "Its header:  the bullhorn, the first words, the floppy, the trash, ×;  drags it." }
  ],
  states: [{ name: "placed", description: "Put on the screen (`near`):  it shows from then on." }],
  texts: [
    { key: "label", text: "Comment on {headline}", description: "The pane, a dialog, for a screen reader." },
    { key: "dragTip", text: "(Drag to move)", description: "After its header's tooltip." },
    { key: "closeTitle", text: "Close", description: "×'s tooltip." },
    { key: "closeLabel", text: "Close the comment box", description: "×, for a screen reader." },
    { key: "deleteTitle", text: "Delete this comment", description: "The trash's tooltip." },
    {
      key: "deleteLabel",
      text: "Delete this comment (Undo in the toast that follows)",
      description: "The trash, for a screen reader."
    }
  ],
  children: []
} as const satisfies EpicVocabulary
