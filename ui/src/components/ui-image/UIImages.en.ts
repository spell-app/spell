/**
 * The English vocabulary of `<ui-images>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), slots and parts.
 *   The shape is `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - How the family's attributes become class words:  `UIImage.en.ts`.
 */

import type { E } from "spell-ui/core"

/****************
 * ### `imagesVocabulary`
 * The names of `<ui-images>`, a group of images in one wrapping row:  `<div class="ui … images" part="group">`.
 ****************/
export const imagesVocabulary = {
  tag: "ui-images",
  topics: ["images", "media", "layout", "elements"],
  aka: ["image group", "gallery", "avatars"],
  noun: "images",
  description: "A group of images can be formatted together.",
  attributes: [
    {
      name: "size",
      group: "appearance",
      kind: "size",
      description: "Width of every image in the group, `mini` ... `massive`."
    },
    { name: "avatar", group: "content", kind: "keyOnly", description: "Every image a small circle." },
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
        "Every image's look, several words at once:  `bordered` (a hairline border), `circular` (cropped to a " +
        "circle), `rounded` (softly rounded corners).  Old names:  `bordered`, `circular`, `rounded` written alone."
    },
    {
      name: "align",
      group: "layout",
      kind: "valueOnly",
      values: ["center"],
      classes: { center: "centered" },
      replaces: [{ from: "centered", value: "center" }],
      description: "`center`:  rows centred in the container.  Its old name is `centered`."
    },
    { name: "disabled", group: "states", kind: "keyOnly", description: "The whole group faded." },
    {
      name: "fluid",
      group: "layout",
      kind: "keyOnly",
      description: "Every image fills the group's width, one per row."
    },
    {
      name: "floated",
      group: "layout",
      kind: "valueAndKey",
      values: "floats",
      description: "Floats the group `left` or `right`."
    },
    {
      name: "vertical-align",
      group: "layout",
      kind: "verticalAlign",
      values: ["top", "middle", "bottom"],
      description: "Aligns the images of a row `top`, `middle` (default) or `bottom`."
    }
  ],
  events: [],
  slots: [{ name: "", description: "`<ui-image>`s (or plain `<img>`s)." }],
  parts: [{ name: "group", description: "The group box." }],
  states: [],
  texts: []
} as const satisfies E.ComponentVocabulary
