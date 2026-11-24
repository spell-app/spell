/**
 * Every name `<epic-feature-set>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its
 * children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

/****************
 * ### `<epic-feature-set>`
 * What makes a details page a Feature Set:  its Reorder dialog, its links, its sections' states.
 ****************/
export const epicFeatureSetVocabulary = {
  tag: "epic-feature-set",
  topics: ["forms", "selection"],
  aka: ["feature set", "ranked list", "reorder", "backlog", "priorities"],
  skeleton: "inline 12 x 2",
  noun: "feature set",
  ui: false,
  description:
    "What makes a details page a Feature Set (epic `epic-engine` P80):  a ranked list to pick from, made by " +
    "`epic ask create --template feature-set`.  It draws Reorder sections, opens the one dialog that reorders the " +
    "sections or a section's items, sends the order with the answer, colours each section by its picks, and opens " +
    "links to other sites in a new tab, the rest in this window.",
  attributes: [],
  events: [],
  slots: [],
  parts: [
    { name: "base", description: "Its line:  Reorder sections." },
    { name: "reorder", description: "The Reorder sections button." },
    { name: "dialog", description: "The dialog that reorders, a `<ui-modal>`." },
    { name: "list", description: "The dialog's list." },
    { name: "entry", description: "One row of that list:  its handle, name, title and arrows." },
    { name: "cancel", description: "The dialog's Cancel." },
    { name: "save", description: "The dialog's Save order." }
  ],
  states: [],
  texts: [
    { key: "reorderSections", text: "Reorder sections", description: "Its button." },
    {
      key: "sectionsHeading",
      text: "Reorder your sections",
      description: "The dialog's title, for the sections."
    },
    {
      key: "itemsHeading",
      text: "Reorder your list: {title}",
      description: "The dialog's title, for a section's items:  its title."
    },
    {
      key: "howTo",
      text: "To move a row, drag the dots on its left, or click its up and down arrows.",
      description: "The dialog's first line."
    },
    {
      key: "namesStay",
      text: "Each row keeps its own number when you move it, so the numbers may end up out of order.",
      description: "The dialog's second line:  names don't follow a reorder."
    },
    {
      key: "sendAfter",
      text:
        "Press Save order to keep your new order. " +
        "Claude only sees it after you press Send to Claude at the top of the page.",
      description: "The dialog's last line."
    },
    { key: "grip", text: "Move {title}", description: "A row's handle:  drag it, or press the arrow keys on it." },
    { key: "moveUp", text: "Move {title} up", description: "A row's up arrow." },
    { key: "moveDown", text: "Move {title} down", description: "A row's down arrow." },
    { key: "placed", text: "{title} is now {place} of {count}.", description: "Said as a row moves." },
    { key: "cancel", text: "Cancel", description: "Closes the dialog, changing nothing." },
    { key: "save", text: "Save order", description: "Puts the rows in the new order." }
  ],
  children: []
} as const satisfies EpicVocabulary
