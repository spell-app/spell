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
      values: ["compact", "hidden"],
      description:
        "`compact`:  the drawer shows only its icons (its `<ui-site-nav>`s `collapsed`), and opens over the page " +
        "while the pointer rests on it.  `hidden`:  no drawer at all, until its button shows it again.  " +
        "None:  the whole drawer.  `toggleDrawer()` switches it, and says so with `ui-toggle`."
    },
    {
      name: "drawer-hides",
      group: "behaviour",
      kind: "keyOnly",
      description:
        "The drawer's button hides the whole drawer (`drawer=\"hidden\"`) and shows it again, never switching it to " +
        "its icons:  for a navigation with no icons."
    },
    {
      name: "left",
      group: "appearance",
      kind: "valueOnly",
      values: ["hidden"],
      description:
        "`hidden`:  the left side bar isn't shown, until its button shows it again.  `toggleSidebar(\"left\")` " +
        "switches it, and says so with `ui-toggle`."
    },
    {
      name: "right",
      group: "appearance",
      kind: "valueOnly",
      values: ["hidden"],
      description:
        "`hidden`:  the right side bar isn't shown, until its button (`<ui-site-nav-button toggles=\"right\">`) " +
        "shows it again.  `toggleSidebar(\"right\")` switches it, and says so with `ui-toggle`.  Narrow, a side " +
        "bar with such a button is hidden behind it, and slides over the page while open."
    },
    {
      name: "floating",
      group: "appearance",
      kind: "keyOnly",
      description:
        "The drawer and the side bars float:  rounded cards with a soft shadow and room round them, over the " +
        "page's own ground.  None:  the drawer a column of its own fill, the page's side a box beside it."
    }
  ],
  events: [
    {
      name: "ui-toggle",
      detail:
        '{ region: "drawer" | "left" | "right", newState: "compact" | "hidden" | "full" | "shown", ' +
        'oldState: "compact" | "hidden" | "full" | "shown" }',
      description:
        "The drawer switched between its icons only (`compact`), hidden (`hidden`) and all of it (`full`), from " +
        "`toggleDrawer()`;  or a side bar between `hidden` and `shown`, from `toggleSidebar()` (a " +
        "`<ui-site-nav-button>`'s click):  a site keeps each person's choice, and sets `drawer`, `left` or `right` " +
        "again next time."
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
    { name: "narrow", description: "Below 40em of its own box:  one column, the drawer slid out of the way." },
    { name: "drawer-hidden", description: '`drawer="hidden"`:  no drawer, on a wide page.' },
    { name: "floating", description: "`floating`:  the drawer and the side bars are cards floating over the page." },
    { name: "left-hidden", description: '`left="hidden"`:  no left side bar, on a wide page.' },
    { name: "right-hidden", description: '`right="hidden"`:  no right side bar, on a wide page.' },
    {
      name: "left-closable",
      description: 'A `<ui-site-nav-button toggles="left">` is in it:  narrow, the left side bar hides behind it.'
    },
    {
      name: "right-closable",
      description: 'A `<ui-site-nav-button toggles="right">` is in it:  narrow, the right side bar hides behind it.'
    },
    { name: "left-open", description: "The left side bar is slid over a narrow page, from its button." },
    { name: "right-open", description: "The right side bar is slid over a narrow page, from its button." }
  ],
  texts: [{ key: "menu", text: "Pages", description: "Its own button to show the drawer, at a narrow width." }]
} as const satisfies E.ComponentVocabulary
