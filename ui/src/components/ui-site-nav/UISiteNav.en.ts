/**
 * The English vocabulary of `<ui-site-nav>`:  every name the tag uses.
 * The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 */

import type { E } from "spell/ui/core"

/****************
 * ### `siteNavVocabulary`
 * The names of `<ui-site-nav>`:  a site's side navigation, its pages as a tree, the page shown marked.
 ****************/
export const siteNavVocabulary = {
  tag: "ui-site-nav",
  icon: "compass outline",
  topics: ["navigation", "lists"],
  aka: ["site navigation", "side navigation", "sidebar menu", "nav menu", "site map", "page tree"],
  noun: "site nav",
  description: "A site nav lists a site's pages as a tree, the page shown marked;  a click goes to a page.",
  skeleton: "4 line paragraph",
  attributes: [
    {
      name: "pages",
      group: "content",
      kind: "json",
      reflect: false,
      description:
        "The site's pages, nested as the navigation nests them:  `SiteNavPage[]`, each " +
        '`{ title, href, id?, pages? }`, e.g. `[{ "title": "Films", "href": "/films" }]`.  ' +
        "A page with no `href` only holds pages:  a click opens or closes it."
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
      description: 'What a screen reader calls the navigation.  None:  "Site".'
    },
    {
      name: "remember",
      group: "behaviour",
      kind: "string",
      description:
        "Keep which pages are open for each person, under this name, across reloads and visits.  " +
        "None:  only for as long as the page is open."
    }
  ],
  events: [
    {
      name: "ui-navigating",
      cancelable: true,
      detail: "{ href: string, page: { title: string, href?: string, id?: string }, originalEvent?: Event }",
      description:
        "A page was picked, and the browser is about to go there:  cancel it to show the page yourself " +
        "(a site that shows its pages without loading another)."
    }
  ],
  slots: [],
  parts: [
    { name: "nav", description: "The navigation landmark around the tree." },
    { name: "tree", description: "The `<ui-tree>` of pages." }
  ],
  states: [],
  texts: [{ key: "label", text: "Site", description: "What a screen reader calls the navigation, without `label`." }]
} as const satisfies E.ComponentVocabulary
