/**
 * The English vocabulary of `<ui-site-tabs>`:  every name the tag uses.
 * The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 */

import type { E } from "spell/ui/core"

/****************
 * ### `siteTabsVocabulary`
 * The names of `<ui-site-tabs>`:  the shown page's family as tabs, drawn from the side navigation's own pages.
 ****************/
export const siteTabsVocabulary = {
  tag: "ui-site-tabs",
  icon: "folder open outline",
  topics: ["navigation", "menus"],
  aka: ["page tabs", "section tabs", "sub navigation", "secondary navigation", "local navigation", "sibling pages"],
  noun: "site tabs",
  description:
    "Site tabs show the page's family as a row of tabs:  the parent page first, the page shown selected, each a link.",
  attributes: [
    {
      name: "pages",
      group: "content",
      kind: "json",
      reflect: false,
      description:
        "The site's pages, nested as the side navigation nests them:  the same `pages` `<ui-site-nav>` takes, each " +
        '`{ title, href, id?, pages?, tab? }`, e.g. `[{ "title": "Button", "tab": "Usage", "href": "/button", ' +
        '"pages": [{ "title": "API", "href": "/button/api" }] }]`.  `tab` is what its tab says, when not its `title`.'
    },
    {
      name: "current",
      group: "content",
      kind: "string",
      description:
        "Which page is shown:  its `href` or its `id`.  None:  the page whose `href` is the browser's address."
    },
    {
      name: "label",
      group: "content",
      kind: "string",
      description: "What a screen reader calls the row of tabs.  None:  the family's parent page's title."
    }
  ],
  events: [
    {
      name: "ui-navigating",
      cancelable: true,
      detail: "{ href: string, page: { title: string, href?: string, id?: string }, originalEvent?: Event }",
      description:
        "A tab was clicked, and the browser is about to go there:  cancel it to show the page yourself " +
        "(a site that shows its pages without loading another)."
    }
  ],
  slots: [],
  parts: [{ name: "tabs", description: "The `<ui-toolbar>`'s row, which holds the tabs." }],
  states: [{ name: "empty", description: "The shown page has no family, so no tabs are drawn:  it takes no room." }],
  texts: []
} as const satisfies E.ComponentVocabulary
