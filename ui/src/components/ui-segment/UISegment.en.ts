/**
 * The English vocabulary of `<ui-segment>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), slots, parts and states.
 *   The shape is `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - The attributes become Fomantic's class words, in Fomantic's order (`ClassBuilder`):
 *   `<ui-segment raised padded="very" attached="top">` => `ui raised very padded top attached segment`.
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
    { name: "raised", group: "appearance", kind: "keyOnly", description: "Lifted off the page with a shadow." },
    {
      name: "stacked",
      group: "appearance",
      kind: "keyOrValueAndKey",
      values: ["tall"],
      description: 'A page peeking out below;  `stacked="tall"` shows two.'
    },
    { name: "piled", group: "appearance", kind: "keyOnly", description: "A pile of rotated sheets behind it." },
    { name: "vertical", group: "layout", kind: "keyOnly", description: "A band of a page:  no box, a rule above." },
    {
      name: "placeholder",
      group: "form",
      kind: "keyOnly",
      description: "A tinted, centred block reserving room for content."
    },
    { name: "circular", group: "appearance", kind: "keyOnly", description: "A round badge sized by its content." },
    { name: "compact", group: "layout", kind: "keyOnly", description: "Only as wide as its content." },
    {
      name: "padded",
      group: "layout",
      kind: "keyOrValueAndKey",
      values: ["very"],
      description: 'More padding;  `padded="very"` for even more.'
    },
    { name: "basic", group: "appearance", kind: "keyOnly", description: "No box:  no background, border or shadow." },
    { name: "clearing", group: "appearance", kind: "keyOnly", description: "Contains its floated children." },
    {
      name: "floated",
      group: "layout",
      kind: "valueAndKey",
      values: "floats",
      description: "Floats `left` or `right`."
    },
    {
      name: "text-align",
      group: "layout",
      kind: "textAlign",
      values: ["left", "center", "right"],
      description: "Aligns its text `left`, `center` or `right`."
    },
    {
      name: "secondary",
      group: "appearance",
      kind: "keyOnly",
      description: "Less emphasis:  a tinted surface, muted text."
    },
    {
      name: "tertiary",
      group: "appearance",
      kind: "keyOnly",
      description: "Least emphasis:  a darker tint, muted text."
    },
    {
      name: "attached",
      group: "layout",
      kind: "keyOrValueAndKey",
      values: ["top", "bottom", "left", "right"],
      description: "Joined edge to edge with the elements above / below;  bare `attached` sits in the middle."
    },
    {
      name: "seamless",
      group: "appearance",
      kind: "keyOnly",
      description: "With `attached`:  no line where attached segments meet."
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
      name: "fitted",
      group: "layout",
      kind: "keyOrValueAndKey",
      values: ["horizontally", "vertically"],
      description: "No padding;  `horizontally` / `vertically` keep the other axis' padding."
    },
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
