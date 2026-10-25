/**
 * The English vocabulary of `<ui-image>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), slots, parts and states.
 *   The shape is `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - The attributes become Fomantic's class words, in Fomantic's order (`ClassBuilder`):
 *   `<ui-image size="small" rounded floated="right" vertical-align="top">` =>
 *   `ui small rounded right floated top aligned image`.
 * - `size` is a WIDTH here (Fomantic's 35px … 960px ladder), not a text scale.
 *   `medium` stays the no-op default (the natural size), so the component never writes Fomantic's 300px `.medium`.
 *   See `UIImage.css`.
 * - `src`, `alt`, `width`, `height`, `loading` pass straight through to the shadow `<img>`.
 * - NOT the generic content part `<ui-image>` of cards / items (`plan.md`):  those land with their owners.
 */

import type { E } from "spell-ui/core"

/****************
 * ### `imageVocabulary`
 * The names of `<ui-image>`, an image:  `<img class="ui … image" part="image">`,
 * or `<a class="ui … image" part="image">` around `<img part="img">` with `link`.
 ****************/
export const imageVocabulary = {
  tag: "ui-image",
  topics: ["images", "media", "basic", "elements"],
  aka: ["picture", "img", "photo", "avatar", "thumbnail"],
  skeleton: "10 wide: square image",
  noun: "image",
  plural: "images",
  description: "An image is a graphic representation of something.",
  attributes: [
    {
      name: "size",
      group: "appearance",
      kind: "size",
      description: "Width, `mini` (35px) ... `massive` (960px) at 16px;  `medium` is the natural size."
    },
    { name: "avatar", group: "content", kind: "keyOnly", description: "A small circle sitting in a line of text." },
    {
      name: "appearance",
      group: "appearance",
      kind: "multiple",
      // the words are the classes:  no key after them (`ClassBuilder`)
      classes: {},
      values: ["bordered", "circular", "rounded"],
      replaces: [
        { from: "bordered", value: "bordered" },
        { from: "circular", value: "circular" },
        { from: "rounded", value: "rounded" }
      ],
      description:
        "The look, several words at once:  `bordered` (a hairline border, for images with white edges), " +
        "`circular` (cropped to a circle;  a pill when not square), `rounded` (softly rounded corners).  " +
        "Old names:  `bordered`, `circular`, `rounded` written alone."
    },
    {
      name: "align",
      group: "layout",
      kind: "valueOnly",
      values: ["center"],
      classes: { center: "centered" },
      replaces: [{ from: "centered", value: "center" }],
      description: "`center`:  a block centred in its container.  Its old name is `centered`."
    },
    { name: "disabled", group: "states", kind: "keyOnly", description: "Faded:  shown as unavailable." },
    { name: "fluid", group: "layout", kind: "keyOnly", description: "Fills its container's width." },
    {
      name: "inline",
      group: "layout",
      kind: "keyOnly",
      description: "Sits inline in running text instead of as a block."
    },
    {
      name: "floated",
      group: "layout",
      kind: "valueAndKey",
      values: "floats",
      description: "Floats `left` or `right` of the text."
    },
    {
      name: "spacing",
      group: "layout",
      kind: "valueOnly",
      values: ["md", "left", "right"],
      classes: { md: "spaced", left: "left spaced", right: "right spaced" },
      replaces: [{ from: "spaced", value: "md" }],
      description:
        "Room from the text around it:  `md` on both sides, or `left` / `right` only.  Its old name is `spaced`."
    },
    {
      name: "vertical-align",
      group: "layout",
      kind: "verticalAlign",
      values: "verticalAlignments",
      description: "Aligns `top`, `middle` or `bottom` against the text (or, in a group, the row)."
    },
    { name: "src", group: "link", kind: "string", description: "Image URL, as the native `<img src>`." },
    {
      name: "alt",
      group: "content",
      kind: "string",
      description: 'Text alternative, as the native `<img alt>`;  `alt=""` marks the image decorative.'
    },
    {
      name: "width",
      group: "layout",
      kind: "number",
      description:
        "Intrinsic width in px, as the native `<img width>`:  reserves space before load.  NOT the column " +
        "`width` grammar;  size variations still set the rendered width."
    },
    {
      name: "height",
      group: "layout",
      kind: "number",
      description: "Intrinsic height in px, as the native `<img height>`:  reserves space before load."
    },
    {
      name: "loading",
      group: "states",
      kind: "enum",
      values: ["eager", "lazy"],
      description: "When to load, as the native `<img loading>`."
    },
    {
      name: "link",
      group: "link",
      kind: "string",
      replaces: ["href"],
      description: "Renders a link (`<a>`) around the image.  Its old name is `href`."
    }
  ],
  events: [],
  slots: [],
  parts: [
    { name: "image", description: "The image box:  the `<img>`, or the `<a>` with `link`." },
    { name: "img", description: "With `link`:  the `<img>` inside the link." }
  ],
  states: [{ name: "disabled", description: "Faded:  shown as unavailable." }],
  texts: []
} as const satisfies E.ComponentVocabulary
