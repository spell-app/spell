/**
 * The English vocabulary of `<ui-card>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), slots, parts, states and texts.
 *   The shape is `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - Class words come out through `ClassBuilder`, in Fomantic's grammar:
 *   `<ui-card appearance="raised" color="red" size="small">` => `ui small red raised card`;
 *   `<ui-cards columns="3" doubling stackable>` => `ui doubling stackable three cards`.  `UICard.css` keys on those.
 * - A card owns the generic content parts (`ownsParts`):  `<ui-content>`, `<ui-header>`, `<ui-meta>`,
 *   `<ui-description>`, `<ui-extra>`, `<ui-avatar>` inside it get `:state(in-card)` (`UIParts.css`).
 * - A group owns its cards (`ownsParts:  card`):  a card in a group gets `:state(in-cards)` and takes the group's
 *   variations (`size`, `color`, `raised` ...) as its own classes, as Fomantic's `.ui.raised.cards > .card` has it.
 */

import type { E } from "spell-ui/core"

/****************
 * ### `cardVocabulary`
 * The names of `<ui-card>`, a card of content parts, with shorthands:
 * an `<article class="ui ... card">` (an `<a>` with `link`).
 ****************/
export const cardVocabulary = {
  tag: "ui-card",
  topics: ["cards", "containers", "data display", "views"],
  aka: ["tile", "panel", "profile card"],
  skeleton: "18 wide: square image, header, 3 line paragraph",
  noun: "card",
  plural: "cards",
  description: "A card displays site content in a manner similar to a playing card.",
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
      description: "A coloured line along the bottom edge (a tinted fill when `basic`)."
    },
    {
      name: "direction",
      group: "layout",
      kind: "valueOnly",
      values: ["horizontal"],
      replaces: [{ from: "horizontal", value: "horizontal" }],
      description:
        "`horizontal`:  image and content side by side;  the extra content spans the bottom.  " +
        "Its old name was `horizontal`."
    },
    {
      name: "appearance",
      group: "appearance",
      kind: "multiple",
      values: ["raised", "link", "basic", "dashed"],
      classes: {},
      replaces: [
        { from: "raised", value: "raised" },
        // `link` written bare, the old look, is read by the card itself:  `link` is the card's link now
        { from: "basic", value: "basic" },
        { from: "dashed", value: "dashed" }
      ],
      description:
        "The look, several words at once:  `raised` (lifted off the page with a stronger shadow), `link` (rises " +
        "on hover, as a link card does;  a look only:  `link=` makes it one), `basic` (no border or shadow), " +
        "`dashed` (a placeholder:  a dashed border, `--ui-card-border-color`, and no drop shadow unless `raised`;  " +
        "not Fomantic's).  Their old names were `raised`, `link` (bare), `basic`, `dashed`."
    },
    { name: "fluid", group: "layout", kind: "keyOnly", description: "Takes the width of its container." },
    {
      name: "align",
      group: "layout",
      kind: "valueOnly",
      values: ["center"],
      classes: { center: "centered" },
      replaces: [{ from: "centered", value: "center" }],
      description: "`center`:  centred in its container.  Its old name was `centered`."
    },
    { name: "inverted", group: "appearance", kind: "keyOnly", description: "For dark backgrounds:  the dark scheme." },
    {
      name: "disabled",
      group: "states",
      kind: "keyOnly",
      description: "Faded and inert;  a link card loses its `link`."
    },
    { name: "loading", group: "states", kind: "keyOnly", description: "Dimmed under a spinner, announced as busy." },
    {
      name: "link",
      group: "link",
      kind: "string",
      replaces: ["href"],
      description:
        "Makes the whole card a link (`<a>`), going here.  Written bare (`<ui-card link>`):  the old look, " +
        '`appearance="link"`.  Its old name was `href`.'
    },
    { name: "target", group: "link", kind: "string", description: "Link target, with `link`." },
    {
      name: "heading",
      replaces: ["header"],
      group: "name",
      kind: "string",
      description: "Shorthand:  the header of a content block.  Its old name was `header`."
    },
    { name: "meta", group: "content", kind: "string", description: "Shorthand:  metadata below the header." },
    {
      name: "description",
      group: "content",
      kind: "string",
      description: "Shorthand:  the description of the content block."
    },
    {
      name: "extra",
      group: "content",
      kind: "string",
      description: "Shorthand:  extra content at the bottom (a footer)."
    },
    {
      name: "image",
      group: "content",
      kind: "string",
      description: "Shorthand:  image URL, shown at the top (at the start when horizontal)."
    },
    {
      name: "alt",
      group: "content",
      kind: "string",
      description: 'Alternative text of the `image` shorthand;  default `""` (decorative:  the card\'s text names it).'
    }
  ],
  events: [],
  slots: [
    {
      name: "",
      description:
        "Content:  `<ui-content>` blocks (header, meta, description), `<img>`s (full-width images), `<ui-extra>`, " +
        "buttons.  A slotted part of a shorthand's noun replaces that shorthand."
    }
  ],
  parts: [
    { name: "card", description: "The card box (`<article>`, or `<a>` with `link`)." },
    { name: "image", description: "The `image` shorthand's box." },
    { name: "content", description: "The content block the `header` / `meta` / `description` shorthands render." },
    { name: "header", description: "The `header` shorthand." },
    { name: "meta", description: "The `meta` shorthand." },
    { name: "description", description: "The `description` shorthand." },
    { name: "extra", description: "The `extra` shorthand." }
  ],
  states: [
    { name: "in-cards", description: "In a `<ui-cards>` group:  sized and spaced by it, `role=listitem`." },
    { name: "disabled", description: "`disabled`." },
    { name: "loading", description: "`loading`." }
  ],
  texts: [{ key: "loading", text: "Loading…", description: "Announced while `loading`." }],
  ownsParts: ["content", "header", "meta", "description", "extra", "avatar"]
} as const satisfies E.ComponentVocabulary
