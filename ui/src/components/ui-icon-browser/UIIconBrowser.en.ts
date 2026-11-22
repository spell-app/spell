/**
 * Every name `<ui-icon-browser>` uses:  tag, attributes (kind + allowed values), parts, states, texts.
 * Schema:  `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - Pure data:  node imports it (`yarn site:data`, `yarn gen:root`), so `spell/ui/core` for types only.
 * - `pack`'s values are the ids of the packs Spell UI ships (`BuiltInIconPacks`):  ids, so never translated.
 */

import type { E } from "spell/ui/core"

/****************
 * ### `<ui-icon-browser>`
 * Every icon of one icon pack, in a grid:  a pack switch, a search, and a click on an icon copies its name.
 ****************/
export const iconBrowserVocabulary = {
  tag: "ui-icon-browser",
  icon: "icons",
  topics: ["icons", "media", "lists", "selection"],
  aka: ["icon gallery", "icon list", "icon finder", "glyph browser", "icon catalog", "icon search"],
  skeleton: "30 tall",
  noun: "icon browser",
  partOfSpeech: "action",
  description:
    "An icon browser shows every icon of a pack, to search through:  clicking one copies the name that draws it.",
  attributes: [
    {
      name: "pack",
      group: "content",
      kind: "enum",
      values: ["fa7-free", "fa7-brands", "fomantic"],
      default: "fa7-free",
      description:
        "The pack it starts on:  `fa7-free` (the default), `fa7-brands` or `fomantic`.  " +
        "Its buttons switch to another;  each is loaded on its own, so the page's own icons never change."
    },
    {
      name: "query",
      group: "content",
      kind: "string",
      description:
        "What it starts searching for:  a name or what an icon shows (`mail` finds `envelope`, by Font Awesome's terms)."
    },
    {
      name: "address",
      group: "behaviour",
      kind: "keyOnly",
      description:
        "Opens on the search and the pack the page's address names, `?q=bell&pack=fa7-brands`, " +
        "as `spell icon --open` writes it;  ahead of `query` and `pack`."
    }
  ],
  events: [],
  slots: [],
  parts: [
    { name: "packs", description: "The pack switch:  a `<ui-buttons>`, one `<ui-button>` per pack." },
    { name: "search", description: "The search box, a `<ui-input type=search>`." },
    { name: "usage", description: "What a page adds to use the pack shown:  a `<ui-message>`." },
    { name: "count", description: "How many icons match, of how many:  a `<ui-label>`." },
    { name: "copied", description: "The name just copied:  a green `<ui-label>`, once one is." },
    { name: "grid", description: "The icons, a grid of tiles:  the first ones, then more as it scrolls near." },
    {
      name: "tile",
      description: "One icon:  a `<ui-button>` showing its glyph over its name;  a click copies the name."
    },
    { name: "glyph", description: "A tile's glyph." },
    { name: "name", description: "A tile's name:  what `name` takes to draw it." }
  ],
  states: [],
  texts: [
    { key: "packs", text: "Icon pack", description: "The pack switch's accessible name." },
    { key: "packFree", text: "FA7 Free", description: "The `fa7-free` pack's button." },
    { key: "packBrands", text: "FA7 Brands", description: "The `fa7-brands` pack's button." },
    { key: "packFomantic", text: "Fomantic", description: "The `fomantic` pack's button." },
    { key: "searchLabel", text: "Search icons", description: "The search box's accessible name." },
    {
      key: "searchPlaceholder",
      text: "Search icons, like arrow, mail or heart",
      description: "The search box's placeholder."
    },
    {
      key: "usageFree",
      text: "The default pack:  every page has it.",
      description: "Under the switch, while `fa7-free` shows."
    },
    {
      key: "usageBrands",
      text: "To use it on a page, add {markup}, or run {script}.",
      description: "Under the switch, while `fa7-brands` shows;  `{markup}` and `{script}` are drawn as code."
    },
    {
      key: "usageFomantic",
      text: "To use it on a page, add {markup}.  A few names, like {examples}, are in both sets:  that page gets this set's icon.",
      description: "Under the switch, while `fomantic` shows;  the `{...}` parts are drawn as code."
    },
    { key: "loading", text: "Loading icons…", description: "The count, while the pack loads." },
    {
      key: "count",
      text: "Showing {matches} of {total} icons",
      description: "The count:  icons matching, of the pack's."
    },
    { key: "copied", text: "Copied “{name}”", description: "After a click:  the name is on the clipboard." },
    {
      key: "notCopied",
      text: "Couldn't copy “{name}”.  Select the name and copy it yourself.",
      description: "After a click the browser refused:  nothing on the clipboard."
    },
    { key: "copyTip", text: "Copy “{name}”", description: "A tile's tooltip." },
    {
      key: "copyTipAlso",
      text: "Copy “{name}”.  Also:  {others}",
      description: "A tile's tooltip, when other names draw the same icon."
    },
    { key: "grid", text: "Icons", description: "The grid's accessible name." },
    { key: "noMatches", text: "No icons match", description: "The grid, when the search finds nothing." }
  ]
} as const satisfies E.ComponentVocabulary
