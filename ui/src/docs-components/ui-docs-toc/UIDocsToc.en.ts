/**
 * The English vocabulary of `<ui-docs-toc>`:  every name the tag uses.
 * - Its tag, attributes, events, slots, parts, states and texts.
 *   The shape is `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - A DOC-ONLY element (`src/docs-components/`):  filed under the `documentation` topic,
 *   left out of the component list, and loaded by `<ui-root>` like any family.
 * - Class words:  `size` (`ui small toc`);  what's current is the items' `selected`, not a class of its own.
 */

import type { E } from "spell-ui/core"

/****************
 * ### `docsTocVocabulary`
 * The names of `<ui-docs-toc>`, Fomantic's docs "On this page" rail menu:
 * the page's sections and their examples as links, following the scroll.
 ****************/
export const docsTocVocabulary = {
  tag: "ui-docs-toc",
  topics: ["documentation", "navigation"],
  aka: ["table of contents", "on this page", "page index", "scrollspy", "toc", "following menu"],
  skeleton: "short line, 6 line paragraph",
  noun: "toc",
  description:
    "A table of contents lists the page's sections and examples as links, opens the one in view and follows the " +
    "scroll.  Each section folds and opens by its chevron, and one button in its header opens or folds them all;  " +
    "the reader's folds are kept.",
  attributes: [
    {
      name: "for",
      kind: "string",
      property: "htmlFor",
      description:
        "Id of the element whose headings to list.  A `<ui-tabs>`:  its SHOWN pane, followed as the tabs switch.  " +
        "Default:  the page's `<main>`, else `<body>`."
    },
    {
      name: "header",
      kind: "string",
      description: "Title above the links, e.g. the page's name (Fomantic's `Button`)."
    },
    { name: "size", kind: "size", default: "small", description: "Text size, `mini` ... `massive`." },
    {
      name: "expanded",
      kind: "keyOnly",
      description:
        "Show every section's entries, not only the current section's (Fomantic opens the one in view).  " +
        "The reader's own folds, and the header's toggle, win."
    }
  ],
  events: [
    {
      name: "ui-scrolled-to",
      detail: "{ value: string }",
      description: "The entry in view changed (scroll, a link, the tabs);  `value` is its target's id."
    },
    {
      name: "ui-drawn",
      detail: "{ ids: string[] }",
      description: "The list was built (again):  the ids of every entry, in page order."
    }
  ],
  slots: [],
  parts: [
    { name: "toc", description: 'The whole box (`<div class="ui toc">`).' },
    {
      name: "head",
      description: "The row above the links:  `header`'s title, and the expand all / collapse all toggle."
    },
    { name: "header", description: "The `<ui-header>` with `header`'s text." },
    {
      name: "toggle-all",
      description:
        "The header's ONE button:  opens every section, then folds them all.  Kept for every page in this browser."
    },
    { name: "menu", description: "The `<ui-menu vertical text>` of sections (a navigation landmark)." },
    {
      name: "section-row",
      description: "A section's row:  its fold chevron (when it has entries) and its link."
    },
    {
      name: "fold",
      description: "A section's fold `<button>`:  a chevron, turned down while its entries show.  Kept per page."
    },
    { name: "section", description: "A section's link `<ui-item>` (a level 2 heading, a top-level `<ui-section>`)." },
    {
      name: "entries",
      description:
        "The `<ui-menu>` of a section's entries (examples, level 3 headings, nested `<ui-section>`s);  nested again " +
        "under an entry with its own."
    },
    { name: "entry", description: "One entry's link `<ui-item>`." }
  ],
  states: [{ name: "empty", description: "Nothing to list (the followed content has no headings)." }],
  texts: [
    { key: "label", text: "On this page", description: "Accessible name of the links' landmark." },
    { key: "foldSection", text: "Fold {section}", description: "A section's fold button, while it's open." },
    { key: "openSection", text: "Open {section}", description: "A section's fold button, while it's folded." },
    { key: "expandAll", text: "Expand all", description: "The header's toggle, while a section is folded." },
    { key: "collapseAll", text: "Collapse all", description: "The header's toggle, while every section is open." }
  ]
} as const satisfies E.ComponentVocabulary
