/**
 * The English vocabulary of `<ui-app-menu>`:  `<ui-menu>`'s, under the app menu's own tag, with its three sections.
 * The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - Built ON the menu's, as `<ui-toolbar>`'s is:  the same attributes, events, states and owned parts,
 *   so an attribute the menu gains reaches the app menu with no change here.
 * - Its own:  the `start` and `end` slots around the menu's default slot (the middle),
 *   and a part for each of the three sections' boxes.
 * - The same noun (`menu`):  its items draw as a menu's, and `UIMenu.css` styles it.
 */

import type { E } from "spell/ui/core"
import { menuVocabulary } from "spell/ui/components/ui-menu/UIMenu.en"

/****************
 * ### `appMenuVocabulary`
 * The names of `<ui-app-menu>`, an app's top bar:  joined to the top of its window or page,
 * a start section, a middle and an end section.
 ****************/
export const appMenuVocabulary = {
  ...menuVocabulary,
  tag: "ui-app-menu",
  icon: "window maximize outline",
  snippet:
    '<ui-app-menu>\n\t<ui-item slot="start">My App</ui-item>\n\t<ui-item>Home</ui-item>\n' +
    '\t<ui-item slot="end" icon="cog"></ui-item>\n</ui-app-menu>',
  topics: ["menus", "navigation", "layout"],
  aka: ["app bar", "top bar", "title bar", "header bar", "navbar", "masthead", "window bar"],
  skeleton: "inline 24 x 2.5",
  description:
    "An app menu is an app's top bar, joined to the top of its window or page:  a start section (a menu or " +
    "sidebar button, then a title or breadcrumb), a middle that stays on the bar's centre, and an end section for " +
    "buttons.  It takes every `<ui-menu>` attribute.",
  slots: [
    {
      name: "",
      description: "The middle section, centred on the bar:  `<ui-item>`s, a sub-menu, e.g. a page's modes or its tabs."
    },
    {
      name: "start",
      description: "The start section, at the bar's start:  a menu or sidebar button first, then a title or breadcrumb."
    },
    { name: "end", description: "The end section, at the bar's end:  buttons, e.g. settings and the person's menu." },
    ...menuVocabulary.slots.filter((slot) => slot.name !== "")
  ],
  parts: [
    ...menuVocabulary.parts,
    { name: "start", description: "The start section's box:  it shares the room the middle leaves with the end." },
    { name: "middle", description: "The middle section's box, its content's width." },
    { name: "end", description: "The end section's box, what's in it pushed to the bar's end." }
  ]
} as const satisfies E.ComponentVocabulary
