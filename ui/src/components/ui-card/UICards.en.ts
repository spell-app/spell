/**
 * The English vocabulary of `<ui-cards>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), events, slots, parts, states and texts.
 *   The shape is `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - The family's grammar notes are in `UICard.en.ts`.
 */

import type { E } from "spell-ui/core"
import * as UIT from "spell-ui/components/components.types"

/****************
 * ### `cardsVocabulary`
 * The names of `<ui-cards>`, a group of cards:  `<div class="ui ... cards" role="list">`, a wrapping row.
 ****************/
export const cardsVocabulary = {
  tag: "ui-cards",
  topics: ["cards", "layout", "lists", "views"],
  aka: ["card grid", "card group", "gallery"],
  noun: "cards",
  description: "A group of cards, laid out in a wrapping row.",
  attributes: [
    { name: "size", group: "appearance", kind: "size", description: "Text size of every card in the group." },
    { name: "color", group: "appearance", kind: "color", description: "Colour of every card in the group." },
    {
      name: "columns",
      group: "layout",
      kind: "width",
      widthClass: "",
      values: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
      description: 'Cards per row, `1` ... `10` (`columns="3"` => `three cards`);  default a fixed card width.'
    },
    {
      name: "doubling",
      group: "layout",
      kind: "keyOnly",
      description: "With `columns`:  fewer cards per row in a narrow group (tablet, mobile widths)."
    },
    {
      name: "stackable",
      group: "layout",
      kind: "keyOnly",
      description: "One card per row in a narrow group (mobile widths)."
    },
    {
      name: "stack-with",
      group: "layout",
      kind: "enum",
      values: UIT.StackWithValues,
      description:
        "What `stackable` and `doubling` measure:  `container` (the default) -- the group's own width;  " +
        "`page` -- the screen's, as in Fomantic.  Unset:  the page-wide `--ui-stack-with` token decides " +
        "(`<ui-root stack-with>`)."
    },
    {
      name: "align",
      group: "layout",
      kind: "valueOnly",
      values: ["center"],
      classes: { center: "centered" },
      replaces: [{ from: "centered", value: "center" }],
      description: "`center`:  centres each row of cards.  Its old name was `centered`."
    },
    {
      name: "direction",
      group: "layout",
      kind: "valueOnly",
      values: ["horizontal"],
      replaces: [{ from: "horizontal", value: "horizontal" }],
      description: "`horizontal`:  every card horizontal.  Its old name was `horizontal`."
    },
    {
      name: "appearance",
      group: "appearance",
      kind: "multiple",
      values: ["raised", "link", "basic"],
      classes: {},
      replaces: [
        { from: "raised", value: "raised" },
        // `link` written bare, the old look, is read by the group itself:  `link` is every tag's link now
        { from: "basic", value: "basic" }
      ],
      description:
        "Every card's look, several words at once:  `raised`, `link` (rises on hover;  a look, links need " +
        "`link=` on the cards), `basic` (no border or shadow).  Their old names were `raised`, `link` (bare), `basic`."
    },
    { name: "inverted", group: "appearance", kind: "keyOnly", description: "Every card in the dark scheme." }
  ],
  events: [],
  slots: [{ name: "", description: "`<ui-card>`s." }],
  parts: [{ name: "group", description: "The group box." }],
  states: [
    {
      name: "cards",
      description: "Always set:  the host is a block and the size container (`ui-cards`) its cards answer to."
    }
  ],
  texts: [],
  ownsParts: ["card"]
} as const satisfies E.ComponentVocabulary
