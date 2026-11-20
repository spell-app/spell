/**
 * The English vocabulary of `<ui-site-links>`:  every name the tag uses.
 * The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 */

import type { E } from "spell/ui/core"

/****************
 * ### `siteLinksVocabulary`
 * The names of `<ui-site-links>`:  the page shown's own links, for an app menu's end, drawn from the side
 * navigation's own pages.
 ****************/
export const siteLinksVocabulary = {
  tag: "ui-site-links",
  icon: "up right from square",
  topics: ["navigation", "menus"],
  aka: ["page links", "page actions", "report a bug", "original page", "edit this page", "external links"],
  noun: "site links",
  partOfSpeech: "structure",
  description:
    "Site links are the page shown's own links, for an app menu's end:  the real page it stands for (its `live` " +
    "link, Fomantic UI's original for Spell UI's pages), and a way to report a problem with it.",
  attributes: [
    {
      name: "pages",
      group: "content",
      kind: "json",
      reflect: false,
      description:
        "The site's pages, nested as the side navigation nests them:  the same `pages` `<ui-site-nav>` takes, each " +
        '`{ title, href, id?, live?, pages? }`, e.g. `[{ "title": "Button", "href": "/button", "live": ' +
        '"https://fomantic-ui.com/elements/button.html" }]`.  `live` is the real page a page stands for:  the page ' +
        "shown's own, else the nearest one above it."
    },
    {
      name: "current",
      group: "content",
      kind: "string",
      description:
        "Which page is shown:  its `href` or its `id`.  None:  the page whose `href` is the browser's address."
    },
    {
      name: "report",
      group: "link",
      kind: "string",
      description:
        "Where to report a problem with the page shown:  an address, `{title}` in it standing for the title of the " +
        "page at the top of its family, e.g. `https://github.com/spell-app/spell-ui/issues/new?title={title}`.  " +
        "None:  no report link."
    }
  ],
  events: [],
  slots: [],
  parts: [
    { name: "links", description: "The row of links." },
    { name: "original", description: "The link to the real page the page shown stands for (its `live`)." },
    { name: "report", description: "The link to report a problem with the page shown." }
  ],
  states: [{ name: "empty", description: "No link to draw for the page shown:  it takes no room." }],
  texts: [
    {
      key: "original",
      text: "The original page",
      description: "The original's name, its tooltip and its name for a screen reader."
    },
    {
      key: "report",
      text: "Report a bug",
      description: "The report link's name, its tooltip and its name for a screen reader."
    }
  ]
} as const satisfies E.ComponentVocabulary
