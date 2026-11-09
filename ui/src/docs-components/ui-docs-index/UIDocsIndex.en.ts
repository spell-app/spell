/**
 * The English vocabulary of `<ui-docs-index>`:  every name the tag uses.
 * The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - A DOC-ONLY element (`src/docs-components/`):  filed under the `documentation` topic,
 *   left out of the component list, and loaded by `<ui-root>` like any family.
 */

import type { E } from "spell/ui/core"

/****************
 * ### `docsIndexVocabulary`
 * The names of `<ui-docs-index>`:  a site's index page, drawn from the site's own list of pages.
 ****************/
export const docsIndexVocabulary = {
  tag: "ui-docs-index",
  topics: ["documentation", "navigation", "cards"],
  aka: ["site index", "site map", "component index", "table of contents", "toc", "page directory"],
  noun: "site index",
  description:
    "A site index draws a card for each of a site's pages, grouped by the pages' tags, with a search field above them.",
  attributes: [
    {
      name: "pages",
      group: "content",
      kind: "json",
      reflect: false,
      description:
        "The site's pages:  the same `pages` `<ui-site-nav>` takes, each with its `tags`.  " +
        "None:  those of the `<ui-site-nav>` on the page."
    }
  ],
  events: [],
  slots: [],
  parts: [
    { name: "index", description: "The box around the search field and the groups." },
    { name: "search", description: "The search field." }
  ],
  states: [],
  texts: [
    { key: "other", text: "Other", description: "The group of families with no tags yet." },
    { key: "search", text: "Find a page", description: "The search field's hint." }
  ]
} as const satisfies E.ComponentVocabulary
