/**
 * The English vocabulary of `<ui-site-nav-button>`:  `<ui-item>`'s, under the button's own tag, with its words.
 * The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - Built ON the item's, as `<ui-action>`'s is:  the same attributes, slots and states, so a menu draws it as one of
 *   its items (the same noun, `item`).
 * - Its own:  only its words, what it's called.
 */

import type { E } from "spell/ui/core"
import { itemVocabulary } from "spell/ui/components/ui-item/UIItem.en"

/****************
 * ### `siteNavButtonVocabulary`
 * The names of `<ui-site-nav-button>`:  the drawer's button, in an app's top bar, which shows or hides the side
 * navigation of the `<ui-page-layout>` around it.
 ****************/
export const siteNavButtonVocabulary = {
  ...itemVocabulary,
  tag: "ui-site-nav-button",
  icon: "columns",
  topics: ["navigation", "menus", "buttons"],
  aka: ["side bar button", "drawer button", "hamburger", "menu button", "navigation toggle", "sidebar toggle"],
  skeleton: "inline 2.5 x 2.5",
  description:
    "A site nav button shows or hides the side navigation of the page layout around it:  its icons only and back " +
    "on a wide page, slid in and out on a narrow one.  It's an item, for an app menu.",
  texts: [
    {
      key: "label",
      text: "Show or hide the side bar",
      description: "What it's called, its tooltip and its name for a screen reader, without `aria-label`."
    }
  ]
} as const satisfies E.ComponentVocabulary
