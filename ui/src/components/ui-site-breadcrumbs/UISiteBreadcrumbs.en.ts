/**
 * The English vocabulary of `<ui-site-breadcrumbs>`:  every name the tag uses.
 * The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 */

import type { E } from "spell/ui/core"

/****************
 * ### `siteBreadcrumbsVocabulary`
 * The names of `<ui-site-breadcrumbs>`:  where you are in a site, drawn from the side navigation's own pages.
 ****************/
export const siteBreadcrumbsVocabulary = {
  tag: "ui-site-breadcrumbs",
  icon: "angle double right",
  topics: ["navigation", "menus"],
  aka: ["breadcrumb trail", "you are here", "location", "page path", "where you are", "site path"],
  noun: "site breadcrumbs",
  partOfSpeech: "structure",
  description:
    "Site breadcrumbs say where you are in a site:  the group, the pages above the page shown, then the page " +
    "(Hardware › Systems), each page above a link.",
  attributes: [
    {
      name: "pages",
      group: "content",
      kind: "json",
      reflect: false,
      description:
        "The site's pages, nested as the side navigation nests them:  the same `pages` `<ui-site-nav>` takes, each " +
        '`{ title, href, id?, band?, pages? }`, e.g. `[{ "title": "Hardware", "id": "group:Hardware", "band": ' +
        '"group", "pages": [{ "title": "Systems", "href": "/systems" }] }]`.  A `band: "group"` page is a group\'s ' +
        "name:  its crumb is plain text."
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
      description: 'What a screen reader calls the trail.  None:  "Where you are".'
    }
  ],
  events: [],
  slots: [],
  parts: [{ name: "breadcrumbs", description: "The `<ui-breadcrumbs>` trail, which holds the crumbs." }],
  states: [
    { name: "empty", description: "The page shown isn't in the site's pages, so nothing is drawn:  it takes no room." }
  ],
  texts: [
    { key: "label", text: "Where you are", description: "What a screen reader calls the trail, without `label`." }
  ]
} as const satisfies E.ComponentVocabulary
