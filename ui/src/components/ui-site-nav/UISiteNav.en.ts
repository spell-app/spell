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
        "A page with no `href` only holds pages:  a click opens or closes it.  " +
        "Each may also say `icon`, `band` (`heading` or `subheading`:  a heading band over its pages), `count`, " +
        "`badge` (a word after its title), `starred` (`true` or `false`:  a star to mark it a favourite) and `open` " +
        "(open or closed, whatever the person did:  the page decides)."
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
      name: "appearance",
      group: "appearance",
      kind: "valueOnly",
      values: ["nav"],
      description:
        '`nav`:  the docs site\'s look, its pages a tree with `appearance="nav"`:  taller rows, the page shown a ' +
        "rounded box in the primary colour, and `band` pages as heading bands."
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
    },
    {
      name: "ui-opening",
      cancelable: true,
      detail: "{ page: { title: string, href?: string, id?: string }, open: boolean, originalEvent?: Event }",
      description: "A page's row is about to open:  cancel it to keep it closed."
    },
    {
      name: "ui-closing",
      cancelable: true,
      detail: "{ page: { title: string, href?: string, id?: string }, open: boolean, originalEvent?: Event }",
      description: "A page's row is about to close:  cancel it to keep it open."
    },
    {
      name: "ui-starred",
      detail: "{ page: { title: string, href?: string, id?: string }, starred: boolean, originalEvent?: Event }",
      description:
        "A page's star was clicked:  `starred` is what the person asked for.  The page decides, and hands the " +
        "nav its pages again with the new `starred`."
    }
  ],
  slots: [],
  parts: [
    { name: "nav", description: "The navigation landmark around the tree." },
    { name: "tree", description: "The `<ui-tree>` of pages." }
  ],
  states: [],
  texts: [
    { key: "label", text: "Site", description: "What a screen reader calls the navigation, without `label`." },
    { key: "star", text: "Add {title} to favourites", description: "A page's star, not starred." },
    { key: "unstar", text: "Remove {title} from favourites", description: "A page's star, starred." }
  ]
} as const satisfies E.ComponentVocabulary
