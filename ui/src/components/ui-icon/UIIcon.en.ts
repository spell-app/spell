/**
 * The English vocabulary of `<ui-icon>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), slots, parts and states.
 *   The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - The attributes become Fomantic's class words, in Fomantic's order (`ClassBuilder`):
 *   `<ui-icon name="heart" size="large" color="red" appearance="circular">` => `ui large red circular icon`.
 *   `UIIcon.css` keys on those words;  `name`, `outline` and `label` write no class:  they pick the SVG (`UI.icons`).
 * - `iconsVocabulary.ownsParts` lists `icon`:  a `<ui-icon>` directly inside a `<ui-icons>` finds it
 *   through `OwnerContext` and sets `:state(in-icons)`, which `UIIcon.css` stacks and positions it by.
 */

import type { E } from "spell/ui/core"

/****************
 * ### `iconVocabulary`
 * The names of `<ui-icon>`, an SVG glyph from the page's icon packs (Font Awesome 7 Free by default):
 * `<span class="ui … icon" part="icon"><svg>` in its shadow root.
 ****************/
export const iconVocabulary = {
  tag: "ui-icon",
  topics: ["icons", "basic", "images", "elements"],
  aka: ["glyph", "symbol", "font awesome", "svg icon"],
  skeleton: "inline 1 x 1",
  noun: "icon",
  description: "An icon is a glyph used to represent something else.",
  attributes: [
    {
      name: "size",
      group: "appearance",
      kind: "size",
      description: "Size relative to the surrounding text, `mini` (0.4em) ... `massive` (8em)."
    },
    {
      name: "color",
      group: "appearance",
      kind: "color",
      description: "Hue of the glyph;  with `inverted` `circular` / `bordered`, the disc."
    },
    {
      name: "name",
      group: "name",
      kind: "string",
      description:
        "Icon name in the page's packs:  `circle check`, `bell outline`, `lucide:bell` (one pack).  " +
        "Dashes ~== spaces, so Font Awesome's `circle-check` works too.  See `notes/icons.md`."
    },

    {
      name: "label",
      group: "name",
      kind: "string",
      description:
        "Accessible name:  makes the icon an image (`role=img`, `aria-label`).  Without it the icon is decorative " +
        "and hidden from assistive technology."
    },
    { name: "disabled", group: "states", kind: "keyOnly", description: "Dimmed and inert." },
    {
      name: "inverted",
      group: "appearance",
      kind: "keyOnly",
      description: "For dark backgrounds;  fills a `circular` / `bordered` icon."
    },
    {
      name: "loading",
      group: "states",
      kind: "keyOnly",
      description: "Spins, e.g. a `spinner` or `circle-notch` glyph."
    },
    {
      name: "padding",
      group: "layout",
      kind: "valueOnly",
      values: ["none"],
      classes: { none: "fitted" },
      replaces: [{ from: "fitted", value: "none" }],
      description: "`none`:  no gap after the glyph and no extra width.  Its old name was `fitted`."
    },
    {
      name: "appearance",
      group: "appearance",
      kind: "multiple",
      values: ["outline", "link", "circular", "bordered"],
      classes: { outline: "" },
      replaces: [
        { from: "outline", value: "outline" },
        // NOT the old `link` switch:  `link` is every tag's link now (where a click goes)
        { from: "circular", value: "circular" },
        { from: "bordered", value: "bordered" }
      ],
      description:
        "The look, several words at once:  `outline` (the glyph's outlined drawing, Fomantic's `bell outline " +
        "icon`;  no class of its own), `link` (clickable look:  dimmed until hovered, pointer cursor), `circular` " +
        "(inside a circular ring), `bordered` (inside a square ring).  Old names:  `outline`, `circular`, " +
        '`bordered` written alone;  the old `link` switch is `appearance="link"`, as `link` is where a click goes.'
    },
    {
      name: "flipped",
      group: "appearance",
      kind: "keyOrValueAndKey",
      values: ["horizontally", "vertically"],
      description: "Mirrored:  `flipped` / `horizontally`, or `vertically`."
    },
    {
      name: "rotated",
      group: "appearance",
      kind: "keyOrValueAndKey",
      values: ["clockwise", "counterclockwise", "halfway"],
      description: "Turned a quarter:  `rotated` / `clockwise`, `counterclockwise`, or `halfway` (180°)."
    },
    {
      name: "corner",
      group: "appearance",
      kind: "keyOrValueAndKey",
      values: ["top left", "top right", "bottom left", "bottom right"],
      description: "Inside `<ui-icons>`:  a small badge on a corner of the group;  bare `corner` is bottom right."
    }
  ],
  events: [],
  slots: [],
  parts: [{ name: "icon", description: "The glyph box holding the `<svg>`." }],
  states: [
    { name: "in-icons", description: "Directly inside a `<ui-icons>` group:  stacked on the group's first icon." },
    { name: "disabled", description: "Dimmed and inert." },
    { name: "loading", description: "Spinning." }
  ],
  texts: []
} as const satisfies E.ComponentVocabulary
