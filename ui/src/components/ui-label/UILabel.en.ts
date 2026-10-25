/**
 * The English vocabulary of `<ui-label>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), events, slots, parts, states and texts.
 *   The shape is `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - The attributes become Fomantic's class words, in Fomantic's order (`ClassBuilder`):
 *   `<ui-label color="red" pointing="left" basic>` => `ui red basic left pointing label`.
 *   `UILabel.css` keys on those words.
 * - A group needs no help from the components:  `<ui-labels tag>` draws `ui tag labels`,
 *   and `UILabel.css` hands the look to its children through inherited tokens.
 * - `labelVocabulary.ownsParts` lists `detail`:  a slotted `<ui-detail>` finds its label through `OwnerContext`,
 *   and styles itself from `UIParts.css` (`:state(in-label)`).
 */

import type { E } from "spell-ui/core"

/****************
 * ### `labelVocabulary`
 * The names of `<ui-label>`, a small tag or badge:
 * `<span class="ui … label">` (an `<a>` with `link`) in its shadow root.
 ****************/
export const labelVocabulary = {
  tag: "ui-label",
  topics: ["status", "text", "basic", "elements"],
  aka: ["badge", "chip", "tag", "pill", "lozenge", "count"],
  skeleton: "inline 4 x 1.8",
  noun: "label",
  plural: "labels",
  description: "A label displays content classification.",
  attributes: [
    {
      name: "size",
      group: "appearance",
      kind: "size",
      description: "Size, `mini` ... `massive`;  `medium` is the default."
    },
    {
      name: "color",
      group: "appearance",
      kind: "color",
      description: "Hue;  fills the label (its ring and text when `basic`)."
    },
    {
      name: "image",
      group: "content",
      kind: "string",
      description:
        'Image label:  a photo flush with the start edge (class `image`).  Presence (`""`, bare `image`) means ' +
        "an image label styled around a slotted `<img>`;  a non-empty value is the `src` of the label's own " +
        "`img.image` child."
    },
    { name: "tag", group: "appearance", kind: "keyOnly", description: "Shaped like a price tag." },
    {
      name: "corner",
      group: "appearance",
      kind: "keyOrValueAndKey",
      values: ["left", "right"],
      description: 'A triangle on the owner\'s top corner holding an icon:  `corner` (end) or `corner="left"`.'
    },
    {
      name: "ribbon",
      group: "appearance",
      kind: "keyOrValueAndKey",
      values: ["right"],
      description: 'A ribbon pulled past the owner\'s start edge;  `ribbon="right"` past its end edge.'
    },
    {
      name: "pointing",
      group: "layout",
      kind: "keyOrValueAndKey",
      values: ["above", "below", "left", "right"],
      description: "An arrow pointing at related content:  `pointing` (above), `below`, `left` or `right`."
    },
    {
      name: "floating",
      group: "appearance",
      kind: "keyOrValueAndKey",
      values: ["left", "bottom", "bottom left"],
      description: "Floats over the owner's top end corner, e.g. a count on a menu item;  `left` / `bottom` move it."
    },
    {
      name: "basic",
      group: "appearance",
      kind: "keyOnly",
      description: "Less pronounced:  an outline on the surface colour."
    },
    {
      name: "tinted",
      group: "appearance",
      kind: "keyOnly",
      description:
        "Soft:  the colour's tint as the fill and its text colour as the text, as a pill or badge.  Not Fomantic's."
    },
    {
      name: "attached",
      group: "layout",
      kind: "keyOrValueAndKey",
      values: ["top", "bottom", "top left", "top right", "bottom left", "bottom right"],
      description: "Attached across (or on a corner of) the owner's top or bottom edge;  bare `attached` is `top`."
    },
    {
      name: "horizontal",
      group: "layout",
      kind: "keyOnly",
      description: "A fixed-width tag before a line of text, e.g. in a list."
    },
    { name: "circular", group: "appearance", kind: "keyOnly", description: "A round badge." },
    { name: "empty", group: "appearance", kind: "keyOnly", description: "With `circular`:  an empty dot." },
    { name: "fluid", group: "layout", kind: "keyOnly", description: "Takes the full width of its container." },
    { name: "centered", group: "layout", kind: "keyOnly", description: "Centres its content." },
    {
      name: "prompt",
      group: "content",
      kind: "keyOnly",
      description: "A form field's validation message:  the negative colour on the surface, wins over `color`."
    },
    { name: "active", group: "states", kind: "keyOnly", description: "Selected / on." },
    { name: "disabled", group: "states", kind: "keyOnly", description: "Dimmed and inert." },
    { name: "inverted", group: "appearance", kind: "keyOnly", description: "For dark backgrounds." },
    {
      name: "icon",
      group: "content",
      kind: "icon",
      description: "Icon name, shown before the text;  with no text the label gets the `icon` class (icon centred)."
    },
    {
      name: "detail",
      group: "content",
      kind: "string",
      description: "Shorthand for a dimmer second value after the text, e.g. a count."
    },
    {
      name: "removable",
      group: "behaviour",
      kind: "boolean",
      description: "Shows a delete icon button;  clicking it dispatches `ui-remove`."
    },
    {
      name: "link",
      group: "link",
      kind: "string",
      replaces: ["href"],
      description: "Renders a link (`<a>`) styled as a label.  Its old name is `href`."
    },
    { name: "target", group: "link", kind: "string", description: "Link target, with `link`." }
  ],
  events: [
    {
      name: "ui-remove",
      detail: "{ originalEvent?: Event }",
      cancelable: true,
      description: "The delete icon of a `removable` label was activated.  NOTE: the element doesn't remove itself."
    }
  ],
  slots: [
    { name: "", description: "Content, usually text;  a slotted `<img>` for an `image` label, `<ui-detail>`s." },
    { name: "icon", description: "Icon, instead of the `icon` attribute." }
  ],
  parts: [
    { name: "label", description: "The label box (`<span>`, or `<a>` with `link`)." },
    { name: "image", description: "The `<img>` of an `image` label with a URL." },
    { name: "icon", description: "The icon box." },
    { name: "detail", description: "The `detail` shorthand." },
    { name: "delete", description: "The delete icon button of a `removable` label." }
  ],
  states: [
    { name: "active", description: "Selected / on." },
    { name: "disabled", description: "Dimmed and inert." }
  ],
  texts: [{ key: "remove", text: "Remove", description: "Accessible name of the delete icon button." }],
  ownsParts: ["detail"]
} as const satisfies E.ComponentVocabulary
