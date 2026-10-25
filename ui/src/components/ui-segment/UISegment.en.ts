/**
 * The English vocabulary of `<ui-segment>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), slots, parts and states.
 *   The shape is `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - The attributes become Fomantic's class words, in Fomantic's order (`ClassBuilder`):
 *   `<ui-segment appearance="raised" padding="lg" attach="top">` => `ui very padded top attached raised segment`.
 * - No `ownsParts`:  Fomantic's segment styles no content parts of its own.
 *   What it hands its content is inherited (`--ui-inverted`, `color-scheme`, label owner tokens):
 *   see `UISegment.css`.
 */

import type { E } from "spell-ui/core"

/****************
 * ### `segmentVocabulary`
 * The names of `<ui-segment>`, a box grouping related content:
 * `<div class="ui … segment" part="segment">` around a slot.
 ****************/
export const segmentVocabulary = {
  tag: "ui-segment",
  topics: ["containers", "layout", "basic", "elements"],
  aka: ["panel", "box", "section", "well", "paper", "card"],
  skeleton: "header, paragraph",
  noun: "segment",
  plural: "segments",
  description: "A segment is used to create a grouping of related content.",
  attributes: [
    {
      name: "size",
      group: "appearance",
      kind: "size",
      description: "Text size, `mini` ... `massive`;  `medium` is the default."
    },
    {
      name: "color",
      group: "appearance",
      kind: "color",
      description: "Hue of the top edge;  with `inverted`, the fill.  `primary` / `secondary` don't colour a segment."
    },
    {
      name: "appearance",
      group: "appearance",
      kind: "multiple",
      values: ["raised", "stacked", "tall-stacked", "piled", "vertical", "circular", "basic", "secondary", "tertiary"],
      classes: { "tall-stacked": "tall stacked" },
      replaces: [
        { from: "raised", value: "raised" },
        { from: "stacked", value: "stacked", values: { tall: "tall-stacked" } },
        { from: "piled", value: "piled" },
        { from: "vertical", value: "vertical" },
        { from: "circular", value: "circular" },
        { from: "basic", value: "basic" },
        { from: "secondary", value: "secondary" },
        { from: "tertiary", value: "tertiary" }
      ],
      description:
        "The look, several words at once:  `raised` (lifted off the page with a shadow), `stacked` (a page " +
        "peeking out below;  `tall-stacked` shows two), `piled` (a pile of rotated sheets behind it), `vertical` " +
        "(a band of a page:  no box, a rule above), `circular` (a round badge sized by its content), `basic` (no " +
        "box:  no background, border or shadow), `secondary` (less emphasis:  a tinted surface, muted text), " +
        "`tertiary` (least emphasis:  a darker tint).  Their old names are `raised`, `stacked`, `piled`, " +
        "`vertical`, `circular`, `basic`, `secondary`, `tertiary`."
    },
    {
      name: "placeholder",
      group: "form",
      kind: "keyOnly",
      description: "A tinted, centred block reserving room for content."
    },
    {
      name: "padding",
      group: "layout",
      kind: "valueOnly",
      values: ["none", "none-x", "none-y", "compact", "md", "lg"],
      classes: {
        none: "fitted",
        "none-x": "horizontally fitted",
        "none-y": "vertically fitted",
        md: "padded",
        lg: "very padded"
      },
      replaces: [
        { from: "fitted", value: "none", values: { horizontally: "none-x", vertically: "none-y" } },
        { from: "compact", value: "compact" },
        { from: "padded", value: "md", values: { very: "lg" } }
      ],
      description:
        "Its padding:  `none` (`none-x` / `none-y` keep the other axis'), `compact` (only as wide as its " +
        "content), `md` more, `lg` even more.  Its old names are `fitted`, `compact`, `padded`."
    },
    { name: "clearing", group: "appearance", kind: "keyOnly", description: "Contains its floated children." },
    {
      name: "align",
      group: "layout",
      kind: "textAlign",
      values: ["left", "center", "right"],
      replaces: ["text-align"],
      description: "Aligns its text `left`, `center` or `right`.  Its old name is `text-align`."
    },
    {
      name: "attach",
      group: "layout",
      kind: "valueOnly",
      values: ["both", "top", "bottom", "left", "right"],
      classes: {
        both: "attached",
        top: "top attached",
        bottom: "bottom attached",
        left: "left attached",
        right: "right attached"
      },
      replaces: [{ from: "attached", value: "both" }],
      description:
        "Joined edge to edge with the elements above / below:  `top`, `bottom`, `left`, `right`;  `both` sits " +
        "in the middle.  Its old name is `attached`."
    },
    {
      name: "seamless",
      group: "appearance",
      kind: "keyOnly",
      description: "With `attach`:  no line where attached segments meet."
    },
    {
      name: "inverted",
      group: "appearance",
      kind: "keyOnly",
      description: "The dark scheme;  everything inside follows (`color-scheme: dark`, `--ui-inverted`)."
    },
    {
      name: "loading",
      group: "states",
      kind: "keyOnly",
      description: "Dims its content under a spinner;  `aria-busy`."
    },
    { name: "disabled", group: "states", kind: "keyOnly", description: "Dimmed and inert." },
    {
      name: "scrolling",
      group: "layout",
      kind: "keyOrValueAndKey",
      values: ["short", "very short", "long", "very long"],
      description: "A capped height (per breakpoint) that scrolls;  `short` ... `very long` scale the cap."
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
  parts: [{ name: "segment", description: "The segment box." }],
  states: [
    { name: "piled", description: "`piled`:  the host is the stacking context the rotated sheets sit behind." },
    { name: "inverted", description: "In the dark scheme." },
    { name: "loading", description: "Busy." },
    { name: "disabled", description: "Dimmed and inert." }
  ],
  texts: [{ key: "loading", text: "Loading…", description: "Announced while `loading`." }]
} as const satisfies E.ComponentVocabulary
