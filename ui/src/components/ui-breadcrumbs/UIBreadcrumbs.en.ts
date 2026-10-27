/**
 * The English vocabulary of `<ui-breadcrumbs>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), slots, parts, states and texts.
 *   The shape is `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - The family's attributes become Fomantic's class words, in Fomantic's order (`ClassBuilder`):
 *   `<ui-breadcrumbs size="large" inverted>` => `ui large inverted breadcrumb`;
 *   `<ui-breadcrumb selected>` => `active section` (no `ui`:  Fomantic styles sections by context).
 * - Each section draws its divider, from tokens the breadcrumb publishes
 *   (`--ui-breadcrumb-divider*`, `BreadcrumbDividerTokens`):  see `UIBreadcrumbs.css`.
 */

import type { E } from "spell-ui/core"

/****************
 * ### `breadcrumbsVocabulary`
 * The names of `<ui-breadcrumbs>`, a breadcrumb trail:
 * `<nav class="ui … breadcrumb" aria-label>` around an `<ol>` of sections.
 ****************/
export const breadcrumbsVocabulary = {
  tag: "ui-breadcrumbs",
  topics: ["navigation", "basic", "collections"],
  aka: ["crumbs", "path", "trail", "location"],
  skeleton: "medium line",
  noun: "breadcrumb",
  description: "A breadcrumb is used to show hierarchy between content.",
  attributes: [
    {
      name: "size",
      group: "appearance",
      kind: "size",
      description: "Text size, `mini` ... `massive`;  `medium` is the default."
    },
    { name: "inverted", group: "appearance", kind: "keyOnly", description: "For dark backgrounds:  the dark scheme." },
    {
      name: "divider",
      group: "content",
      kind: "string",
      description: "Text drawn between sections, e.g. `›` (`/` when unset);  published as `--ui-breadcrumb-divider`."
    },
    {
      name: "divider-icon",
      group: "appearance",
      kind: "string",
      description:
        "Icon name drawn between sections instead of `divider`, e.g. `chevron right`;  published as " +
        "`--ui-breadcrumb-divider-icon`."
    }
  ],
  events: [],
  slots: [{ name: "", description: "`<ui-breadcrumb>`s, in order." }],
  parts: [
    { name: "breadcrumb", description: "The `<nav>` box." },
    { name: "list", description: "The `<ol>` the sections are items of." }
  ],
  states: [],
  texts: [{ key: "label", text: "Breadcrumb", description: "Accessible name of the `<nav>` landmark." }]
} as const satisfies E.ComponentVocabulary
