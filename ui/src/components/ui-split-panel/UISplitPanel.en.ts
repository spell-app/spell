/**
 * The English vocabulary of `<ui-split-panel>`:  every name the tag uses.
 * The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 */

import type { E } from "spell/ui/core"

/****************
 * ### `splitPanelVocabulary`
 * The names of `<ui-split-panel>`:  its children side by side or one above the other,
 * sized as `columns` or `rows` say, with bars to drag between them when `resizable`.
 ****************/
export const splitPanelVocabulary = {
  tag: "ui-split-panel",
  topics: ["layout", "containers"],
  aka: ["split view", "split pane", "resizable panes", "panes", "splitter", "sash"],
  noun: "split panel",
  description: "A split panel lays its children out side by side or one above the other, with bars to resize them.",
  attributes: [
    {
      name: "columns",
      group: "layout",
      kind: "string",
      description:
        'Side by side, sized across:  a comma list, one size for each pane, such as `"20%,*,380px"`.  ' +
        "A number, `px` or `em` is a fixed size;  `%` is that share of what the fixed panes leave;  " +
        "`*` or a missing size shares the percent that's left;  `auto` is as big as its content.  Empty:  all the same."
    },
    {
      name: "rows",
      group: "layout",
      kind: "string",
      description: "One above the other, sized down, as `columns` says.  With neither, the panes are side by side."
    },
    {
      name: "resizable",
      group: "behaviour",
      kind: "keyOnly",
      description: "A bar between each two panes, to drag or to move with the arrow keys."
    },
    {
      name: "min-size",
      group: "behaviour",
      kind: "string",
      description:
        "The smallest a dragged pane may get, `10%` for shares or `60px` for fixed sizes.  Default:  `5%` and `0px`."
    }
  ],
  events: [
    {
      name: "ui-changed",
      detail: "{ sizes: string, panes: HTMLElement[] }",
      description:
        "A bar was let go, or moved with a key:  `sizes` in the form `columns` and `rows` take, to keep and give back."
    }
  ],
  slots: [
    {
      name: "",
      description:
        "The panes, one per child.  A child with `hidden` isn't one:  the others share its room, and it stays as it is."
    }
  ],
  parts: [
    { name: "bar", description: "The bar between two panes." },
    { name: "last-bar", description: "The last of them, also a `bar`:  before the last pane." }
  ],
  states: [
    { name: "rows", description: "One above the other." },
    { name: "resizable", description: "Its bars drag." },
    { name: "dragging", description: "A bar is being dragged." }
  ],
  texts: [{ key: "resizePanes", text: "Resize these panes", description: "A bar's name, for a screen reader." }]
} as const satisfies E.ComponentVocabulary
