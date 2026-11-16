/**
 * The English vocabulary of `<ui-page-layout>`:  every name the tag uses.
 * The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 */

import type { E } from "spell/ui/core"

/****************
 * ### `pageLayoutVocabulary`
 * The names of `<ui-page-layout>`:  what stays on screen around a site's pages -- its menu, its drawer (the side
 * navigation), two side bars and a footer -- in its own box.
 ****************/
export const pageLayoutVocabulary = {
  tag: "ui-page-layout",
  icon: "columns",
  topics: ["layout", "containers", "navigation"],
  aka: ["app layout", "app shell", "site layout", "page frame", "drawer layout", "navigation drawer", "holy grail"],
  noun: "page layout",
  partOfSpeech: "structure",
  description:
    "A page layout puts what stays on screen around a page:  a menu across the top, a drawer of side navigation " +
    "down the start, side bars either side of the page, and a footer.  An empty one takes no room.  Its own box, " +
    "not the window:  below 40em of it, the drawer slides over the page.",
  skeleton: "24 wide: 4 line paragraph",
  attributes: [
    {
      name: "drawer",
      group: "appearance",
      kind: "valueOnly",
      values: ["compact"],
      description:
        "`compact`:  the drawer shows only its icons (its `<ui-site-nav>`s `collapsed`), and opens over the page " +
        "while the pointer rests on it.  None:  the whole drawer.  `toggleDrawer()` switches it, and says so with " +
        "`ui-toggle`."
    }
  ],
  events: [
    {
      name: "ui-toggle",
      detail: '{ newState: "compact" | "full", oldState: "compact" | "full" }',
      description:
        "The drawer switched between its icons only (`compact`) and all of it (`full`), from `toggleDrawer()` " +
        "(a `<ui-site-nav-button>`'s click):  a site keeps each person's choice, and sets `drawer` again next time."
    }
  ],
  slots: [
    { name: "", description: "The page." },
    { name: "menu", description: "The app's top bar, across the top beside the drawer:  usually a `<ui-app-menu>`." },
    {
      name: "page-menu",
      description: "A row of its own under the menu, over the page and its side bars:  usually `<ui-site-tabs>`."
    },
    {
      name: "drawer",
      description: "The side navigation, a column the whole height at the start:  usually a `<ui-site-nav>`."
    },
    { name: "left", description: "A side bar between the drawer and the page." },
    { name: "right", description: "A side bar at the page's end." },
    { name: "footer", description: "Across the bottom, under the page and its side bars." }
  ],
  parts: [
    { name: "layout", description: "The grid of regions:  the drawer's column, then the rest." },
    { name: "drawer", description: "The drawer's column, on its own fill with a line at its end." },
    { name: "drawer-box", description: "The drawer's box inside its column:  what scrolls, and what slides out." },
    { name: "menu", description: "The menu's row." },
    { name: "page-menu", description: "The page menu's row." },
    { name: "left", description: "The start side bar's box." },
    { name: "page", description: "The page's box." },
    { name: "right", description: "The end side bar's box." },
    { name: "footer", description: "The footer's row." },
    {
      name: "menu-button",
      description:
        "Its own button to show the drawer, at a narrow width, when nothing inside it is a `<ui-site-nav-button>`."
    }
  ],
  states: [
    { name: "compact", description: '`drawer="compact"`:  the drawer shows only its icons.' },
    {
      name: "open",
      description:
        "The drawer is open over the page:  slid in at a narrow width, or opened from its icons while the pointer " +
        "rests on it."
    },
    { name: "narrow", description: "Below 40em of its own box:  one column, the drawer slid out of the way." }
  ],
  texts: [{ key: "menu", text: "Pages", description: "Its own button to show the drawer, at a narrow width." }]
} as const satisfies E.ComponentVocabulary
