/**
 * The English vocabulary of `<ui-toolbar>`:  `<ui-menu>`'s, under the toolbar's own tag, with its scroll buttons.
 * The shape is `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - Built ON the menu's:  the same attributes, events, slots, states and owned parts,
 *   so an attribute the menu gains reaches the toolbar with no change here.
 * - Its own:  the `toolbar` box around the menu,
 *   the two scroll buttons (`scroll-start`, `scroll-end`) and their names.
 * - Its slots, a bar's layout:  `icon`, `title`, `center` and `right` around the items (the default slot).
 * - The same noun (`menu`):  its items draw as a menu's, and `UIMenu.css` styles it.
 */

import type { E } from "spell-ui/core"
import { menuVocabulary } from "spell-ui/components/ui-menu/UIMenu.en"

/****************
 * ### `toolbarVocabulary`
 * The names of `<ui-toolbar>`, a toolbar:  a horizontal menu whose items scroll sideways when they don't fit,
 * with a `‹` / `›` button at each end while there's more that way.
 ****************/
export const toolbarVocabulary = {
  ...menuVocabulary,
  tag: "ui-toolbar",
  topics: ["menus", "navigation", "collections"],
  aka: ["toolbar", "tool bar", "scrolling tabs", "overflow menu", "chip bar", "scrollable menu"],
  skeleton: "inline 24 x 2.5",
  description:
    "A toolbar is a horizontal menu whose items scroll sideways when they don't fit, with a button at each end " +
    "while there's more to see that way;  `shrinkable`, it fits their titles to its width instead.  It takes every " +
    "`<ui-menu>` attribute.",
  slots: [
    ...menuVocabulary.slots,
    { name: "icon", description: "First, at the start:  an icon or an icon button (a menu button)." },
    { name: "title", description: "After the icon:  the title, never squeezed." },
    { name: "center", description: "After the title, taking the room left:  e.g. a row of links." },
    { name: "right", description: "Last, pushed to the end:  e.g. search and settings." }
  ],
  parts: [
    ...menuVocabulary.parts,
    { name: "icon", description: "The `icon` slot's box." },
    { name: "title", description: "The `title` slot's box." },
    { name: "center", description: "The `center` slot's box." },
    { name: "right", description: "The `right` slot's box." },
    { name: "toolbar", description: "The box around the menu and its scroll buttons." },
    { name: "scroll-start", description: "The `‹` button, shown while there's more to scroll back to." },
    { name: "scroll-end", description: "The `›` button, shown while there's more to scroll on to." }
  ],
  states: [
    ...menuVocabulary.states,
    { name: "overflowing", description: "Its items don't all fit:  they scroll sideways (never once `shrinkable`)." }
  ],
  texts: [
    ...menuVocabulary.texts,
    { key: "scrollStart", text: "Scroll back", description: "Accessible name and tooltip of the `‹` button." },
    { key: "scrollEnd", text: "Scroll on", description: "Accessible name and tooltip of the `›` button." }
  ]
} as const satisfies E.ComponentVocabulary
