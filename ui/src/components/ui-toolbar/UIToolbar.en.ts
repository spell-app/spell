/**
 * The English vocabulary of `<ui-toolbar>`:  `<ui-menu>`'s, under the toolbar's own tag, with its scroll buttons.
 * The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - Built ON the menu's:  the same attributes, events, slots, states and owned parts,
 *   so an attribute the menu gains reaches the toolbar with no change here.
 * - Its own:  the `toolbar` box around the menu,
 *   the two scroll buttons (`scroll-start`, `scroll-end`) and their names,
 *   `show-keys`, and the `pills` look (`appearance`, the menu's words and one more).
 * - Its slots, a bar's layout:  `icon`, `title`, `center` and `right` around the items (the default slot).
 * - The same noun (`menu`):  its items draw as a menu's, and `UIMenu.css` styles it.
 */

import type { E } from "spell/ui/core"
import { menuVocabulary } from "spell/ui/components/ui-menu/UIMenu.en"

/** The menu's `appearance` attribute, which the toolbar's adds a word to. */
const APPEARANCE = "appearance"
const menuAppearance = menuVocabulary.attributes.find((attribute) => attribute.name === APPEARANCE)!

/** The toolbar's `appearance`:  the menu's words, and `pills`. */
const toolbarAppearance = {
  ...menuAppearance,
  values: [...menuAppearance.values, "pills"],
  description:
    menuAppearance.description +
    '  A toolbar\'s own:  `pills` (each run of items between two `<ui-item kind="divider">`s is one rounded track, ' +
    "its items rounded tiles on it, as a group of buttons is drawn;  a run cut, down to its icons or into the `…` " +
    "button, stays on its track;  the pills centred in the room the title and the right slot leave, never touching them)."
} as const

/****************
 * ### `toolbarVocabulary`
 * The names of `<ui-toolbar>`, a toolbar:  a horizontal menu whose items scroll sideways when they don't fit,
 * with a `‹` / `›` button at each end while there's more that way.
 ****************/
export const toolbarVocabulary = {
  ...menuVocabulary,
  tag: "ui-toolbar",
  partOfSpeech: "structure",
  icon: "tools",
  topics: ["menus", "navigation", "collections"],
  aka: ["toolbar", "tool bar", "scrolling tabs", "overflow menu", "chip bar", "scrollable menu"],
  skeleton: "inline 24 x 2.5",
  description:
    "A toolbar is a horizontal menu whose items scroll sideways when they don't fit, with a button at each end " +
    "while there's more to see that way;  `shrinkable`, it fits their titles to its width instead.  It takes every " +
    "`<ui-menu>` attribute.",
  attributes: [
    // the menu's, its `appearance` with one more word:  `pills`
    ...menuVocabulary.attributes.map((attribute) => (attribute.name === APPEARANCE ? toolbarAppearance : attribute)),
    {
      name: "show-keys",
      group: "content",
      kind: "boolean",
      description:
        "Show each action's keys beside its title, as a menu does.  Without it, a toolbar's own items leave them out:  " +
        "they're in each item's tooltip either way (`Undo (⌘Z)`)."
    },
    {
      name: "scroll-first",
      group: "layout",
      kind: "boolean",
      description:
        "With `shrinkable`:  once only its icons are left, they scroll with `‹` / `›`, no overflow button.  " +
        "With a `segmented` look too:  when its items don't fit, they scroll with `‹` / `›` while there's " +
        "`--ui-toolbar-scroll-min` (200px) to show them in;  only then the dropdown.  For a row of many, such as files."
    },
    {
      name: "max-visible",
      group: "layout",
      kind: "string",
      description:
        "More items than this (a number;  with none, 8):  the row shows only the ones chosen lately, up to that many, " +
        "and a button that's always there lists every item.  An item picked there joins the row, and the one " +
        "chosen longest ago leaves it."
    },
    {
      name: "remember",
      group: "layout",
      kind: "string",
      description: "With `max-visible`:  a name to keep the row's items under, so they're the same after a reload."
    }
  ],
  slots: [
    ...menuVocabulary.slots,
    { name: "icon", description: "First, at the start:  an icon or an icon button (a menu button)." },
    { name: "title", description: "After the icon:  the title, never squeezed." },
    {
      name: "center",
      description: "After the title, taking the room left, what's in it centred there:  e.g. a row of links."
    },
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
    { name: "scroll-end", description: "The `›` button, shown while there's more to scroll on to." },
    { name: "all-items", description: "`max-visible`:  the button listing every item, while some are put away." }
  ],
  states: [
    ...menuVocabulary.states,
    {
      name: "overflowing",
      description: "Its items don't all fit:  they scroll sideways (once `shrinkable`, only with `scroll-first`)."
    },
    { name: "limited", description: "`max-visible`:  there are more items than that, so some are put away." }
  ],
  texts: [
    ...menuVocabulary.texts,
    { key: "scrollStart", text: "Scroll back", description: "Accessible name and tooltip of the `‹` button." },
    { key: "scrollEnd", text: "Scroll on", description: "Accessible name and tooltip of the `›` button." }
  ]
} as const satisfies E.ComponentVocabulary
