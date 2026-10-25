/**
 * The English vocabulary of `<ui-breadcrumb>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), events, slots, parts, states and texts.
 *   The shape is `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - How the family's attributes become class words:  `UIBreadcrumbs.en.ts`.
 */

import type { E } from "spell-ui/core"

/****************
 * ### `breadcrumbVocabulary`
 * The names of `<ui-breadcrumb>`, one step of the trail:  its own divider,
 * then `<a class="section">` or the active `<span class="active section">`.
 ****************/
export const breadcrumbVocabulary = {
  tag: "ui-breadcrumb",
  topics: ["navigation", "collections"],
  aka: ["crumb", "breadcrumb item"],
  noun: "section",
  ui: false,
  description: "A section of a breadcrumb:  a link to a level of the hierarchy, or the current page.",
  attributes: [
    {
      name: "selected",
      group: "states",
      kind: "keyOnly",
      key: "active",
      replaces: ["active"],
      description: 'The current page:  bold, not a link, `aria-current="page"`.  Its old name is `active`.'
    },
    {
      name: "link",
      group: "link",
      kind: "string",
      replaces: ["href"],
      description: "Renders a link (`<a>`) to this level.  Its old name is `href`."
    },
    { name: "target", group: "link", kind: "string", description: "Link target, with `link`." }
  ],
  events: [],
  slots: [{ name: "", description: "The section's text (and an optional `<ui-icon>`)." }],
  parts: [
    { name: "section", description: "The section (`<a>`, or `<span>` when active or without `link`)." },
    { name: "divider", description: "The divider before it, drawn from the breadcrumb's tokens;  hidden on the first." }
  ],
  states: [{ name: "selected", description: "The current page (`selected`)." }],
  texts: []
} as const satisfies E.ComponentVocabulary
