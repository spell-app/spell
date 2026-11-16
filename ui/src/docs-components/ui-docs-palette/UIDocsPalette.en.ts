/**
 * The English vocabulary of `<ui-docs-palette>`:  every name the tag uses.
 * - Its tag, parts and texts.  The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - A DOC-ONLY element (`src/docs-components/`):  filed under the `documentation` topic,
 *   left out of the component list, and loaded by `<ui-root>` like any family.
 * - Pure data:  `import type` only, so node loads it (`yarn site:data`, `yarn gen:root`).
 */

import type { E } from "spell/ui/core"

/****************
 * ### `docsPaletteVocabulary`
 * The names of `<ui-docs-palette>`:  the editor palette's groups, to arrange by dragging, and save.
 ****************/
export const docsPaletteVocabulary = {
  tag: "ui-docs-palette",
  icon: "table columns",
  topics: ["documentation", "forms", "lists"],
  aka: ["palette groups", "palette editor", "component groups", "palette table"],
  skeleton: "40 tall",
  noun: "palette",
  description:
    "A palette groups editor shows the Spell editor's palette as columns, a group each:  drag a component to another " +
    "group or place, drag a group to reorder it, rename a group, add or remove one, then save.",
  attributes: [],
  events: [],
  slots: [],
  parts: [
    { name: "bar", description:"Its bar:  what to do, Add group, Save and how the save went." },
    { name: "groups", description: "The groups, a column each, and Not in the palette last." }
  ],
  states: [],
  texts: [
    {
      key: "hint",
      text: "Drag a component to another group or place, or a group by its handle.  Not in the palette keeps what it leaves out.",
      description: "What to do, in the bar."
    },
    { key: "addGroup", text: "Add group", description: "The button that adds an empty group at the end." },
    { key: "save", text: "Save", description: "The button that writes the table." },
    { key: "saved", text: "Saved:  the editor's palette shows it on its next load.", description: "After a save." },
    { key: "unsaved", text: "Changed, not saved", description: "While there are changes to save." },
    { key: "loading", text: "Loading the palette's groups…", description: "While the table loads." },
    {
      key: "noServer",
      text: "Can't reach the page server's palette groups:  open this page from the page server.",
      description: "When the table can't be loaded."
    },
    { key: "saveFailed", text: "Couldn't save:  {error}", description: "When a save fails;  `{error}` says why." },
    { key: "newGroup", text: "New group", description: "A new group's name." },
    { key: "groupName", text: "Group name", description: "The label of a group's name field." },
    { key: "removeGroup", text: "Remove {group}:  its components go to Not in the palette", description: "A group's remove button." },
    { key: "moveGroup", text: "Drag to move {group}", description: "A group's drag handle." },
    { key: "notOffered", text: "Not in the palette", description: "The last column:  what the palette leaves out." }
  ]
} as const satisfies E.ComponentVocabulary
