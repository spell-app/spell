/**
 * The English vocabulary of `<ui-tree>`:  every name the tag uses.
 * The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 */

import type { E } from "spell/ui/core"

/****************
 * ### `treeVocabulary`
 * The names of `<ui-tree>`:  rows nested in rows, which open and close, and are selected one or many at a time.
 ****************/
export const treeVocabulary = {
  tag: "ui-tree",
  icon: "sitemap",
  topics: ["lists", "navigation"],
  aka: ["tree view", "outline", "hierarchy", "file tree", "nested list", "folder list"],
  noun: "tree",
  description: "A tree shows rows nested in rows, which open and close, and can be selected one or many at a time.",
  skeleton: "3 line paragraph",
  attributes: [
    {
      name: "choose",
      group: "behaviour",
      kind: "valueOnly",
      values: ["one", "many"],
      classes: { one: "", many: "many" },
      description:
        "How rows are selected:  `one` (the default), or `many`, where Shift takes a range, " +
        "and Command or Control adds a row or takes it away."
    },
    {
      name: "filter",
      group: "behaviour",
      kind: "string",
      description:
        "Show only the rows whose words hold this text, whatever its case, and the rows they're inside, opened to show " +
        "them.  It changes no row's `open`:  clearing it puts the tree back as it was.  " +
        "A row drawn only once its parent opens can't be found while that's closed."
    },
    {
      name: "label",
      group: "behaviour",
      kind: "string",
      description: "What a screen reader calls the tree."
    },
    {
      name: "appearance",
      group: "appearance",
      kind: "valueOnly",
      values: ["nav"],
      description:
        "`nav`:  a site's side navigation, as the docs site's is:  taller rows, a selected row a rounded box in the " +
        "primary colour, the open-and-close chevron at a row's end, and `band` rows as heading bands."
    },
    {
      name: "sticky-path",
      group: "behaviour",
      kind: "keyOnly",
      description:
        "While the tree scrolls, one line pinned at its top names the open rows the first row in view is inside, " +
        "`Solitaire › Grid › StockPile`, shortened from the left when it doesn't fit.  A click on one scrolls to its " +
        "row, selecting nothing.  It shows only while one of them is scrolled out of sight."
    }
  ],
  events: [
    {
      name: "ui-selecting",
      cancelable: true,
      detail: "{ item: HTMLElement, value: string, originalEvent?: Event }",
      description:
        "A row is about to be selected, by a click, or by Enter or Space:  cancel it to decide what's selected yourself, " +
        "reading the keys held from `originalEvent`."
    },
    {
      name: "ui-changed",
      detail: "{ value: string, values: string[], originalEvent?: Event }",
      description:
        "What's selected changed:  `value`, the row clicked;  `values`, every selected row in the tree's order " +
        "(each one's `value`, else its `label`)."
    }
  ],
  slots: [
    { name: "", description: "The top rows:  `<ui-tree-item>`s." },
    { name: "empty", description: "Shown when `filter` matches no row." }
  ],
  parts: [
    { name: "empty", description: "The box around the `empty` slot." },
    { name: "path", description: "`sticky-path`:  the pinned line naming the rows scrolled out of sight." },
    { name: "path-row", description: "`sticky-path`:  each row's name in the path." }
  ],
  states: [
    { name: "filtering", description: "It has a `filter`." },
    { name: "no-matches", description: "Its `filter` matches no row." }
  ],
  texts: [
    {
      key: "noMatches",
      text: "Nothing matches",
      description: "Shown when `filter` matches no row and no `empty` is given."
    }
  ]
} as const satisfies E.ComponentVocabulary
