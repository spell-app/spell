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
  partOfSpeech: "structure",
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
        "A row drawn only once its parent opens can't be found while that's closed.  " +
        '`appearance="columns"`:  it filters one column, the last one on screen as the filter starts, until it\'s cleared.'
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
      values: ["nav", "columns"],
      description:
        "`nav`:  a site's side navigation, as the docs site's is:  taller rows, a selected row a rounded box in the " +
        "primary colour, the open-and-close chevron at a row's end, and `band` rows as heading bands.  " +
        "`columns`:  a column per level, side by side, as a Mac's Finder shows folders:  picking a row shows the rows " +
        "inside it in the next column, and closes the columns after that."
    },
    {
      name: "column-titles",
      group: "appearance",
      kind: "string",
      description:
        '`appearance="columns"`:  a title over each column, by level, separated by commas ' +
        "(`Clients, Projects, Files`);  the last one names every column deeper than the list goes.  " +
        "None:  no titles."
    },
    {
      name: "items",
      group: "content",
      kind: "json",
      reflect: false,
      description:
        '`appearance="columns"`:  the tree as data, given as a property, in place of `<ui-tree-item>`s:  ' +
        "`{ id, label, icon?, which?, count?, children?, data? }[]` (`TreeItemData`), where `children` is a list, " +
        "or a function run the first time the item opens, which may return a promise (a spinner shows until it " +
        "comes).  Only the open path's columns are drawn."
    },
    {
      name: "path",
      group: "behaviour",
      kind: "json",
      reflect: false,
      description:
        "`appearance=\"columns\"`:  the ids of each column's pick, from the top (`string[]`;  a `<ui-tree-item>`'s id " +
        "is its `value`, else its `label`).  The last one's rows are the next column.  Set it to open a path, its " +
        "last item selected;  read it as people pick."
    },
    {
      name: "size",
      group: "appearance",
      kind: "string",
      description:
        '`appearance="columns"`:  each column\'s width, by level, separated by commas;  the last one sizes every column ' +
        "deeper than the list goes.  Each one a number of px (`240`, `240px`), `em`, a percent of the tree's width " +
        "(`30%`), `auto` to fit the column to the rows it shows (from 80px to three times `--ui-tree-column-width`), " +
        "or `*` for `--ui-tree-column-width`.  So `auto` fits every column to its rows, and `12em, auto` keeps the " +
        "first at 12em.  None:  every column is `--ui-tree-column-width` wide.  A column a person resizes keeps " +
        "that width instead:  with an `id`, the tree remembers it in this browser."
    },
    {
      name: "narrow-before",
      group: "appearance",
      kind: "number",
      default: 2,
      description:
        "`appearance=\"columns\"`:  how many columns at the end never narrow.  While the columns don't fit the tree's " +
        "width, the ones before those narrow, from the first, as few as it takes, each to a strip with its pick's " +
        "name;  the pointer or the focus on one widens it again, and so does picking it from the path line.  The " +
        "selected row's column never narrows."
    },
    {
      name: "show",
      group: "appearance",
      kind: "string",
      description:
        '`appearance="columns"`:  which parts each row shows, as words:  `icon which count chevron`;  the label ' +
        "always shows.  None:  `icon which chevron`.  `count` is how many rows a row holds, when it knows."
    },
    {
      name: "sticky-path",
      group: "behaviour",
      kind: "keyOnly",
      description:
        "While the tree scrolls, one line pinned at its top names the open rows the first row in view is inside, " +
        "`Solitaire › Grid › StockPile`, shortened from the left when it doesn't fit.  A click on one scrolls to its " +
        "row, selecting nothing.  It shows only while one of them is scrolled out of sight.  " +
        '`appearance="columns"`:  a line above the columns naming each column\'s pick, shown once something is ' +
        "picked;  a click on one picks it again, keeping the columns after it, and scrolls its column into view."
    }
  ],
  events: [
    {
      name: "ui-selecting",
      cancelable: true,
      detail: "{ item: HTMLElement | TreeItemData, value: string, path?: string[], originalEvent?: Event }",
      description:
        "A row is about to be selected, by a click, or by Enter or Space:  cancel it to decide what's selected yourself, " +
        "reading the keys held from `originalEvent`.  " +
        '`appearance="columns"`:  the arrow keys select as they move too;  `item` is the `<ui-tree-item>`, or the ' +
        "`items` entry;  `path`, the ids of each column's pick down to it."
    },
    {
      name: "ui-changed",
      detail:
        "{ value: string, values: string[], item?: HTMLElement | TreeItemData, path?: string[], originalEvent?: Event }",
      description:
        "What's selected changed:  `value`, the row clicked;  `values`, every selected row in the tree's order " +
        "(each one's `value`, else its `label`).  " +
        '`appearance="columns"`:  also `item` and `path`, as `ui-selecting`\'s.'
    },
    {
      name: "ui-settled",
      detail:
        "{ value: string, values: string[], item?: HTMLElement | TreeItemData, path?: string[], originalEvent?: Event }",
      description:
        "What's selected has stayed put for a moment:  `ui-changed`'s detail, once the arrow keys stop.  " +
        "For a page doing heavy work on each pick."
    }
  ],
  slots: [
    { name: "", description: "The top rows:  `<ui-tree-item>`s." },
    { name: "empty", description: "Shown when `filter` matches no row." }
  ],
  parts: [
    { name: "empty", description: "The box around the `empty` slot." },
    { name: "path", description: "`sticky-path`:  the pinned line naming the rows scrolled out of sight." },
    { name: "path-row", description: "`sticky-path`:  each row's name in the path." },
    {
      name: "narrow-column",
      description:
        '`appearance="columns"`:  a column drawn narrow, a strip with its pick (`narrow-before`):  from `items`, beside ' +
        "`column`;  from markup, the first column (each deeper one is its row's `<ui-tree-item>`'s `narrow-column`)."
    },
    {
      name: "column-title",
      description:
        "`appearance=\"columns\"`:  a column's title (`column-titles`):  every column's from `items`;  from markup, the " +
        "first column's (each deeper one is its row's `<ui-tree-item>`'s `column-title`)."
    },
    { name: "column", description: '`appearance="columns"` with `items`:  one column.' },
    { name: "column-row", description: '`appearance="columns"` with `items`:  one row of a column.' }
  ],
  states: [
    { name: "filtering", description: "It has a `filter`." },
    { name: "no-matches", description: "Its `filter` matches no row." },
    { name: "columns", description: "Its `appearance` is `columns`:  a column per level, side by side." },
    { name: "resizing", description: '`appearance="columns"`:  the line after a column is being dragged.' }
  ],
  texts: [
    {
      key: "noMatches",
      text: "Nothing matches",
      description: "Shown when `filter` matches no row and no `empty` is given."
    },
    {
      key: "resizeColumn",
      text: "Resize this column",
      description:
        '`appearance="columns"`:  the name of the line after a column, for a screen reader:  drag it, or its arrow ' +
        "keys, to resize the column;  Option (Alt) resizes every column;  a double-click fits the column to its rows."
    },
    {
      key: "loading",
      text: "Loading",
      description: '`appearance="columns"`:  what a screen reader hears while a column\'s rows are on their way.'
    }
  ]
} as const satisfies E.ComponentVocabulary
