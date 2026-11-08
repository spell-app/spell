/**
 * The English vocabulary of `<ui-tree-item>`:  every name the tag uses.
 * The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 */

import type { E } from "spell/ui/core"

/****************
 * ### `treeItemVocabulary`
 * The names of `<ui-tree-item>`:  one row of a `<ui-tree>`, holding the rows inside it.
 ****************/
export const treeItemVocabulary = {
  tag: "ui-tree-item",
  icon: "circle outline",
  topics: ["lists", "navigation"],
  aka: ["tree node", "tree row", "outline row"],
  noun: "tree item",
  description: "One row of a tree:  an icon and a label, with the rows inside it, which it opens and closes.",
  skeleton: "line",
  attributes: [
    { name: "label", group: "content", kind: "string", description: "What the row says." },
    { name: "which", group: "content", kind: "string", description: "Which one it is, quieter, after its label." },
    { name: "icon", group: "content", kind: "icon", description: "The icon before its label." },
    {
      name: "value",
      group: "content",
      kind: "string",
      description: "What `ui-changed` calls this row.  None:  its `label`."
    },
    { name: "open", group: "behaviour", kind: "keyOnly", description: "The rows inside it show." },
    { name: "selected", group: "behaviour", kind: "keyOnly", description: "It's selected." },
    {
      name: "expandable",
      group: "behaviour",
      kind: "keyOnly",
      description: "It can open though it has no rows inside it yet:  for rows drawn only once it opens."
    },
    {
      name: "group",
      group: "behaviour",
      kind: "keyOnly",
      description: "It only holds rows:  a click opens or closes it, and it's never selected."
    },
    {
      name: "band",
      group: "appearance",
      kind: "valueOnly",
      values: ["heading", "subheading"],
      description:
        "The row is a heading band over the rows inside it, in a tree whose `appearance` is `nav`:  `heading`, a " +
        "tinted band that stays at the top while its rows scroll;  `subheading`, a lighter one inside it."
    },
    {
      name: "count",
      group: "content",
      kind: "string",
      description: "A number in a small round label after its words:  how many rows are inside it, say."
    },
    {
      name: "badge",
      group: "content",
      kind: "string",
      description: "A word in a small label after its words:  `Planned`, `In progress`."
    }
  ],
  events: [
    {
      name: "ui-opening",
      cancelable: true,
      detail: "{ open: boolean, originalEvent?: Event }",
      description: "It's about to open:  cancel it to stay closed."
    },
    {
      name: "ui-closing",
      cancelable: true,
      detail: "{ open: boolean, originalEvent?: Event }",
      description: "It's about to close:  cancel it to stay open."
    }
  ],
  slots: [
    { name: "", description: "The rows inside it:  `<ui-tree-item>`s, and anything else to show between them." },
    { name: "label", description: "The row's words, in place of `label` and `which`." },
    { name: "icon", description: "The row's icon, in place of `icon`." },
    { name: "actions", description: "Buttons at the row's end." }
  ],
  parts: [
    { name: "row", description: "The row itself." },
    { name: "toggle", description: "The triangle that opens and closes it." },
    { name: "label", description: "Its words." },
    { name: "count", description: "Its `count`'s label." },
    { name: "badge", description: "Its `badge`'s label." },
    { name: "group", description: "The box around the rows inside it." }
  ],
  states: [
    { name: "open", description: "The rows inside it show." },
    { name: "selected", description: "It's selected." },
    { name: "has-items", description: "It has rows inside it, or could:  it draws its triangle." },
    { name: "filtered-out", description: "The tree's `filter` hides it." },
    { name: "nav", description: "Its tree's `appearance` is `nav`:  it takes the side navigation's look." }
  ],
  texts: [
    { key: "open", text: "Open", description: "The triangle's name, closed." },
    { key: "close", text: "Close", description: "The triangle's name, open." }
  ]
} as const satisfies E.ComponentVocabulary
