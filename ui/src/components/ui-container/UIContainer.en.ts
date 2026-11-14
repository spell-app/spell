/**
 * The English vocabulary of `<ui-container>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), slots and parts.
 *   The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - The attributes become Fomantic's class words, in Fomantic's order (`ClassBuilder`):
 *   `<ui-container text align="justified">` => `ui text justified container`.
 * - `grid`'s class word is `gridded` (Fomantic's `grid`), and `columns` makes no class on the box:
 *   the box's shadow root also holds the grid's sheet (for `columns`), whose `.ui.grid` and `.ui.column` rules
 *   would style the container itself.
 */

import type { E } from "spell/ui/core"

/****************
 * ### `containerVocabulary`
 * The names of `<ui-container>`, a centred page-width column:
 * `<div class="ui … container" part="container">` around a slot.
 ****************/
export const containerVocabulary = {
  tag: "ui-container",
  icon: "square outline",
  snippet: "<ui-container></ui-container>",
  topics: ["layout", "containers", "basic", "elements"],
  aka: ["wrapper", "page width", "content width"],
  noun: "container",
  description: "A container limits content to a maximum width.",
  attributes: [
    { name: "text", group: "name", kind: "keyOnly", description: "A narrower reading column with larger type." },
    { name: "fluid", group: "layout", kind: "keyOnly", description: "Always the full width of the page." },
    { name: "wide", group: "layout", kind: "keyOnly", description: "A fifth wider than the default container." },
    {
      name: "width",
      group: "layout",
      kind: "string",
      description:
        "A width of its own, any CSS length (`20em`, `320px`):  centred, never wider than the page.  " +
        "For content as wide as it needs, e.g. a calculator or a game board, with no CSS."
    },
    {
      name: "size",
      group: "appearance",
      kind: "size",
      description: "Text size, `mini` ... `massive`, as `<ui-segment size>`;  `medium` is the default."
    },
    {
      name: "inverted",
      group: "appearance",
      kind: "keyOnly",
      description:
        "The dark scheme, as `<ui-segment inverted>`:  a dark surface, and everything inside follows " +
        "(`color-scheme: dark`, `--ui-inverted`)."
    },
    {
      name: "padding",
      group: "layout",
      kind: "valueOnly",
      values: ["none", "small", "md", "lg"],
      classes: { none: "fitted", small: "lightly padded", md: "padded", lg: "very padded" },
      description:
        "Room inside its edges:  `small` (1em, a segment's own), `md` more (1.5em), `lg` even more (3em);  " +
        "`none`, the default.  The same steps as `<ui-segment padding>`."
    },
    {
      name: "columns",
      group: "layout",
      kind: "width",
      values: "widths",
      widthClass: "column",
      description:
        "Lays its children out as a grid of that many columns, `1` ... `16`, as `<ui-grid columns>` does:  " +
        "each child a cell, with no `<ui-grid>` or `<ui-column>` around them."
    },
    {
      name: "grid",
      group: "layout",
      kind: "keyOnly",
      key: "gridded",
      description: "Holds a grid:  widened by the grid's gutters so its columns line up with other containers."
    },
    {
      name: "spacing",
      group: "layout",
      kind: "valueOnly",
      values: ["xs", "compact", "lg", "xl"],
      classes: { xs: "very compact", compact: "compact", lg: "relaxed", xl: "very relaxed" },
      replaces: [{ from: "relaxed", value: "lg", values: { very: "xl" } }],
      description:
        "With `columns`:  the room between its columns, as `<ui-grid spacing>`:  `compact` narrower (`xs` " +
        'narrower still), `lg` wider (`xl` wider still).  With `grid`:  room for a grid\'s wider gutters (`spacing="lg"`, ' +
        "`xl` wider still).  Its old name was `relaxed`."
    },
    {
      name: "align",
      group: "layout",
      kind: "textAlign",
      values: "alignments",
      replaces: ["text-align"],
      description:
        "Aligns its text `left`, `center`, `right`, or `justified` (with hyphenation).  Its old name was `text-align`."
    },
    {
      name: "scrolling",
      group: "layout",
      kind: "keyOrValueAndKey",
      values: ["short", "very short", "long", "very long"],
      description:
        "A capped height (per breakpoint) that scrolls;  `short` ... `very long` scale the cap.  Heights are " +
        "tokens:  `--ui-container-scrolling-height` (mobile, 15em), `--ui-container-scrolling-height-tablet` " +
        "(18em), `-computer` (24em), `-widescreen` (30em)."
    },
    {
      name: "resizable",
      group: "behaviour",
      kind: "keyOnly",
      description: "With `scrolling`:  people can drag its height."
    }
  ],
  events: [],
  slots: [{ name: "", description: "Content." }],
  parts: [
    { name: "container", description: "The container box." },
    { name: "grid", description: "With `columns`:  the grid box inside it, around its children." }
  ],
  states: [],
  texts: []
} as const satisfies E.ComponentVocabulary
