/**
 * The English vocabulary of `<ui-space>`:  every name the tag uses.
 * - Its tag and attributes (each with its kind and allowed values).
 *   The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - An empty box with no look of its own (epic `elemental-spell` P28):  a line break, or a gap of a given size.
 * - No class words:  every attribute is property-only, drawn as the box's own layout.
 */

import type { E } from "spell/ui/core"

/****************
 * ### `spaceVocabulary`
 * The names of `<ui-space>`, a gap between things:  a line break by default.
 ****************/
export const spaceVocabulary = {
  tag: "ui-space",
  topics: ["layout", "basic"],
  aka: ["spacer", "gap", "line break", "br", "spring", "filler", "strut"],
  noun: "space",
  description:
    "A space is a gap between things.  Bare, it is a line break;  `inline`, a gap inside the line;  `fluid`, " +
    "it takes the room left in its row or column.  It has no look of its own.",
  attributes: [
    {
      name: "inline",
      group: "layout",
      kind: "boolean",
      description:
        "A gap inside the line, not a line break:  a space's width (0.25em) unless `width` says.  " +
        "Without it, what follows the space starts on a new line."
    },
    {
      name: "width",
      group: "layout",
      kind: "string",
      description:
        "How wide:  a number of pixels (`20`), a space step (`xs`, `sm`, `md`, `lg`, `xl`, or `none`) " +
        "or any CSS length (`2em`, `50%`)."
    },
    {
      name: "height",
      group: "layout",
      kind: "string",
      description: 'How tall, in the same forms as `width`:  a band of blank space between lines (`height="md"`, 1em).'
    },
    {
      name: "fluid",
      group: "layout",
      kind: "boolean",
      description:
        "Grows into the room left in its row or column, and gives it back when there's none (`flex: 1 1`):  " +
        '`<ui-stack direction="horizontal">` with a `fluid` space between two buttons puts one left and one right.'
    },
    {
      name: "grow",
      group: "layout",
      kind: "string",
      description:
        'How much it grows into the room left, bare (1) or a number:  `grow="2"` takes twice the room of a ' +
        "bare `grow` beside it.  Wins over `fluid`'s half."
    },
    {
      name: "shrink",
      group: "layout",
      kind: "string",
      description:
        "How much room it gives back when there's too little, bare (1) or a number.  Wins over `fluid`'s half."
    }
  ],
  events: [],
  slots: [],
  parts: [],
  states: [],
  texts: []
} as const satisfies E.ComponentVocabulary
