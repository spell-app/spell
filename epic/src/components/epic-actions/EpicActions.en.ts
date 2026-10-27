/**
 * Every name `<epic-actions>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell-epic/definitions"

/****************
 * ### `<epic-actions>`
 * A block's ACTIONS ROW, on every page (epic `epic-engine` P45):  its own controls, over its top right corner.
 ****************/
export const epicActionsVocabulary = {
  tag: "epic-actions",
  topics: ["documentation", "buttons", "controls"],
  aka: ["actions row", "block actions", "bullhorn row", "block buttons"],
  noun: "actions row",
  ui: false,
  description:
    "The one row of a block's own controls, for a block with no title row of its own (a table, a paragraph, a " +
    "list):  a line of no height just before the block, its buttons over the block's top right corner, the comments' " +
    "bullhorn first, then a table's expand button.  The docs runtime makes it (`addBlockAction()`) and measures where " +
    "the block's top edge is;  it's never written in a page.",
  attributes: [
    {
      name: "head-row",
      kind: "boolean",
      description:
        "Its block is a table:  the buttons centred on its header row, not 2px inside its top edge (set by the docs " +
        "runtime as it measures, `alignBlockActions()`)."
    }
  ],
  events: [],
  slots: [{ name: "", description: "The controls, in their order:  `<ui-button>`s, the bullhorn first." }],
  parts: [{ name: "base", description: "The controls' box, out of the flow, over the block's top right corner." }],
  states: [],
  texts: [],
  children: [{ tag: "flow", description: "The controls." }]
} as const satisfies EpicVocabulary
