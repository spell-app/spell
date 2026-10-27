/**
 * The English vocabulary of `<ui-docs-theme-bench>`:  every name the tag uses.
 * - Its tag, parts, states and texts.  The shape is `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - A DOC-ONLY element (`src/docs-components/`):  filed under the `documentation` topic,
 *   left out of the component list, and loaded by `<ui-root>` like any family.
 * - Pure data:  `import type` only, so node loads it (`yarn site:data`, `yarn gen:root`).
 */

import type { E } from "spell-ui/core"

/****************
 * ### `docsThemeBenchVocabulary`
 * The names of `<ui-docs-theme-bench>`:  Spell's real pages side by side in frames (an epic page, a notebook,
 * Spell UI's docs, the editor), one theme picked for all of them, and the tokens behind their tabs, section titles
 * and surfaces tuned live.
 ****************/
export const docsThemeBenchVocabulary = {
  tag: "ui-docs-theme-bench",
  topics: ["documentation", "forms", "views"],
  aka: ["theme bench", "theme workbench", "look tuner", "token tuner", "theme playground", "design tokens"],
  skeleton: "40 tall",
  noun: "theme bench",
  description:
    "A theme bench shows Spell's real pages side by side, every one in the theme you pick, and tunes the tokens " +
    "behind their tabs, section titles and surfaces live:  then copy the changes into the theme's file.",
  attributes: [],
  events: [],
  slots: [],
  parts: [
    { name: "bench", description: "The whole bench:  the bar, the pages and the tuning." },
    {
      name: "bar",
      description: "The top bar:  its title, the layout, the titles' scroll, the schemes, and the pages' theme."
    },
    { name: "pages", description: "The pages' grid." },
    { name: "page", description: "One page:  its title row and its frame." },
    { name: "tuning", description: "The tuning column:  every token, by group, and the changes." },
    { name: "token", description: "One token's row:  its name, who reads it, its control." }
  ],
  states: [{ name: "tuned", description: "Some token of the theme shown is tuned." }],
  texts: [
    { key: "label", text: "Theme bench", description: "The bench's title, and its accessible name." },
    {
      key: "lede",
      text: "Every place in one theme.  Tune a token and watch them all follow.",
      description: "The line under the title."
    },
    { key: "layout", text: "Show", description: "Accessible name of the layout's menu." },
    { key: "grid", text: "All four", description: "The layout showing every page." },
    { key: "epic", text: "Epic page", description: "The epic page's title." },
    { key: "ui", text: "Spell UI", description: "Spell UI's docs page's title." },
    { key: "notebook", text: "Notebook", description: "The notebook's title." },
    { key: "editor", text: "Editor", description: "The editor's title." },
    { key: "titles", text: "Section titles", description: "Accessible name of the titles' scroll menu." },
    { key: "rest", text: "At rest", description: "Scroll each page to its top, its titles at rest." },
    { key: "stuck", text: "Stuck", description: "Scroll each page so its section titles stick." },
    { key: "schemes", text: "Schemes", description: "Accessible name of the schemes' menu." },
    { key: "both", text: "Light & dark", description: "Show each page in light and dark, side by side." },
    { key: "one", text: "One scheme", description: "Show each page once, in the scheme picked." },
    { key: "light", text: "Light", description: "The light half of a page's pair." },
    { key: "dark", text: "Dark", description: "The dark half of a page's pair." },
    {
      key: "swap",
      text: "Swap light and dark",
      description: "The bar's button:  every pair's light and dark sides change places, the lights side by side."
    },
    { key: "theme", text: "Theme", description: "The pages' theme row, and its accessible name." },
    { key: "reload", text: "Reload", description: "Reload one page's frames (its title row's icon)." },
    { key: "open", text: "Open in a tab", description: "Open a page in a tab of its own." },
    {
      key: "noEditor",
      text: "The editor isn't running:  it starts with the page server.",
      description: "Shown in an editor page's frame when the editor app can't be reached."
    },
    {
      key: "find",
      text: "Find a token",
      description: "Placeholder of the token filter."
    },
    {
      key: "loadingPage",
      text: "Loading the page…",
      description: "Over a page's frame until it's drawn in the theme."
    },
    { key: "loading", text: "Reading the theme files…", description: "Shown while the theme files load." },
    { key: "failed", text: "The theme files didn't load:  {error}", description: "Shown when they can't." },
    { key: "groupSurfaces", text: "Surfaces", description: "Group:  the page, panels and bars (`surfaces`)." },
    { key: "groupBar", text: "Bars", description: "Group:  bars over the page (`components.bar`)." },
    { key: "groupMenu", text: "Menus and page tabs", description: "Group:  `components.menu`." },
    { key: "groupSection", text: "Section titles", description: "Group:  `components.section`." },
    { key: "groupOwn", text: "The theme's own", description: "Group:  the theme's private tokens (`own`)." },
    { key: "groupRadii", text: "Corners", description: "Group:  `radii`." },
    { key: "groupShadows", text: "Shadows", description: "Group:  `shadows`." },
    { key: "groupBorders", text: "Borders", description: "Group:  `borders`." },
    { key: "groupDocsNav", text: "Docs side column", description: "Group:  `components.docs-nav`." },
    {
      key: "groupEditor",
      text: "The editor's own",
      description: "Group:  the editor app's tokens (`--spell-*`), in its own sheet, not a theme file."
    },
    { key: "readBy", text: "Read by", description: "Accessible name of a token's row of the places that read it." },
    { key: "readsTip", text: "{place} reads it", description: "A reader's tip:  the page reads the token." },
    {
      key: "overridesTip",
      text: "{place} reads it (also set on its own elements)",
      description: "A reader's tip:  the page also sets the token below the page's root, where a tuning doesn't reach."
    },
    {
      key: "overridesLegend",
      text: "the page also sets it on its own elements",
      description: "The legend's half dot:  what it marks on an icon."
    },
    {
      key: "overridesLegendTip",
      text: "The page also sets it on its own elements:  a tuning doesn't reach those",
      description: "The legend's half dot's tip."
    },
    { key: "reset", text: "Reset", description: "Put a token back to the theme's own value." },
    {
      key: "split",
      text: "Split into light / dark",
      description: "Give a token a light and a dark value of its own, each with its own control."
    },
    { key: "resetAll", text: "Reset all", description: "Put every token of the theme shown back." },
    { key: "alpha", text: "Opacity", description: "Accessible name of a colour's opacity slider." },
    { key: "value", text: "Value", description: "Accessible name of a token's text field." },
    {
      key: "unset",
      text: "Not set in {theme}:  each element's own",
      description: "A token's empty field:  the theme shown doesn't set it, so each element uses its own default."
    },
    { key: "changes", text: "Changes", description: "The section of what's tuned, to copy into the files." },
    {
      key: "noChanges",
      text: "Nothing tuned in {theme} yet.",
      description: "The changes section, while nothing is tuned in the theme shown."
    }
  ]
} as const satisfies E.ComponentVocabulary
