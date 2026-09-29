/**
 * Every name `<ui-icon>` and `<ui-icons>` use:  tags, attributes (kind + allowed values), slots, parts, states.
 * Schema:  `ComponentVocabulary` (`$/vocabulary`).
 * - Class words come out through `ClassBuilder`, in Fomantic's grammar:
 *   `<ui-icon name="heart" size="large" color="red" circular>` => `ui large red circular icon`.  `icon.css` keys
 *   on those words;  `name` / `variant` / `label` are property-only and pick the SVG (`Icons.resolve()`).
 * - `iconsVocabulary.ownsParts` lists `icon`:  a `<ui-icon>` directly inside a `<ui-icons>` finds it through
 *   `OwnerContext` and sets `:state(in-icons)`, which `icon.css` stacks and positions it by.
 */

import type { ComponentVocabulary } from "$/vocabulary"

/****************
 * ### `<ui-icon>`
 * An SVG glyph from Font Awesome 7 Free:  `<span class="ui ... icon" part="icon"><svg>` in the shadow root.
 ****************/
export const iconVocabulary = {
  tag: "ui-icon",
  noun: "icon",
  description: "An icon is a glyph used to represent something else.",
  attributes: [
    {
      name: "size",
      kind: "size",
      description: "Size relative to the surrounding text, `mini` (0.4em) ... `massive` (8em)."
    },
    {
      name: "color",
      kind: "color",
      description: "Hue of the glyph;  with `inverted` `circular` / `bordered`, the disc."
    },
    {
      name: "name",
      kind: "string",
      description:
        "Icon name:  Font Awesome 7 (`circle-check`), or Fomantic's words (`check circle`, `mail outline`).  " +
        "Spaces ~== dashes.  See `docs/icons.md`."
    },
    {
      name: "variant",
      kind: "enum",
      values: ["solid", "regular", "brands"],
      default: "solid",
      description: "Font Awesome set;  default inferred from `name` (a trailing `outline` word picks `regular`)."
    },
    {
      name: "outline",
      kind: "boolean",
      description: 'Alias for `variant="regular"`, Fomantic\'s `mail outline icon` spelling.  No class of its own.'
    },
    {
      name: "label",
      kind: "string",
      description:
        "Accessible name:  makes the icon an image (`role=img`, `aria-label`).  Without it the icon is decorative " +
        "and hidden from assistive technology."
    },
    { name: "disabled", kind: "keyOnly", description: "Dimmed and inert." },
    { name: "inverted", kind: "keyOnly", description: "For dark backgrounds;  fills a `circular` / `bordered` icon." },
    { name: "loading", kind: "keyOnly", description: "Spins, e.g. a `spinner` or `circle-notch` glyph." },
    { name: "fitted", kind: "keyOnly", description: "No gap after the glyph and no extra width." },
    { name: "link", kind: "keyOnly", description: "Clickable look:  dimmed until hovered, pointer cursor." },
    { name: "circular", kind: "keyOnly", description: "Inside a circular ring." },
    { name: "bordered", kind: "keyOnly", description: "Inside a square ring." },
    {
      name: "flipped",
      kind: "keyOrValueAndKey",
      values: ["horizontally", "vertically"],
      description: "Mirrored:  `flipped` / `horizontally`, or `vertically`."
    },
    {
      name: "rotated",
      kind: "keyOrValueAndKey",
      values: ["clockwise", "counterclockwise", "halfway"],
      description: "Turned a quarter:  `rotated` / `clockwise`, `counterclockwise`, or `halfway` (180°)."
    },
    {
      name: "corner",
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
} as const satisfies ComponentVocabulary

/****************
 * ### `<ui-icons>`
 * Several icons stacked into one glyph:  `<span class="ui ... icons" part="icons"><slot>`.
 ****************/
export const iconsVocabulary = {
  tag: "ui-icons",
  noun: "icons",
  description: "Several icons can be used together as a group.",
  attributes: [
    { name: "size", kind: "size", description: "Size of the whole group, relative to the surrounding text." },
    {
      name: "label",
      kind: "string",
      description: "Accessible name for the combined glyph (`role=img`);  without it the group is decorative."
    },
    { name: "disabled", kind: "keyOnly", description: "Dimmed and inert." },
    { name: "loading", kind: "keyOnly", description: "The whole group spins." },
    { name: "fitted", kind: "keyOnly", description: "No gap after the group." },
    { name: "circular", kind: "keyOnly", description: "Inside a circular ring, the first icon centred." },
    { name: "bordered", kind: "keyOnly", description: "Inside a square ring, the first icon centred." },
    { name: "inverted", kind: "keyOnly", description: "A filled `circular` / `bordered` ring, for dark backgrounds." }
  ],
  events: [],
  slots: [{ name: "", description: "`<ui-icon>`s:  the first is the base glyph, the rest stack on it (`corner`)." }],
  parts: [{ name: "icons", description: "The group box." }],
  states: [],
  texts: [],
  ownsParts: ["icon"]
} as const satisfies ComponentVocabulary
