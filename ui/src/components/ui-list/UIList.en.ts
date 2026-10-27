/**
 * The English vocabulary of `<ui-list>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), events, slots, parts and states.
 *   The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - Class words come out through `ClassBuilder`, in Fomantic's grammar:
 *   `<ui-list spacing="xl" divided size="large">` => `ui large divided very relaxed list`.
 *   `UIList.css` keys on those words.
 * - Items are the GENERIC `<ui-item>` (`ownsParts` lists `item`), never a `ui-list-item`:  the list tells each
 *   item how to render (`ItemOwner.itemContext()`) and hands it `UIList.css`.
 * - `ownsParts` also lists `list`:  a `<ui-list>` inside a list is Fomantic's sub-list (`<div class="list">`),
 *   and `content` / `header` / `description`, which `UIParts.css` styles `:state(in-list)`.
 */

import type { E } from "spell/ui/core"

/****************
 * ### `listVocabulary`
 * The names of `<ui-list>`, a list:
 * `<ul class="ui ... list" role="list">` (`<ol>` when `ordered`) around its `<ui-item>`s.
 ****************/
export const listVocabulary = {
  tag: "ui-list",
  topics: ["lists", "data display", "typography", "basic", "elements"],
  aka: ["ul", "ol", "bullet list", "list view"],
  skeleton: "3 line paragraph",
  noun: "list",
  description: "A list groups related content.",
  attributes: [
    {
      name: "size",
      group: "appearance",
      kind: "size",
      description: "Text size, `mini` ... `massive`;  `medium` is the default."
    },
    { name: "bulleted", group: "appearance", kind: "keyOnly", description: "Marks each item with a bullet." },
    {
      name: "ordered",
      group: "appearance",
      kind: "keyOnly",
      description:
        "Numbers each item (`1.`, `1.1` in a sub-list);  an item's `value` replaces its number.  Renders `<ol>`."
    },
    {
      name: "suffixed",
      group: "appearance",
      kind: "keyOnly",
      description: "Ordered:  a dot follows each number (`1.`)."
    },
    {
      name: "appearance",
      group: "appearance",
      kind: "multiple",
      values: ["link"],
      // its words are Fomantic's classes as they are
      classes: {},
      replaces: [{ from: "link", value: "link" }],
      description:
        "The look:  `link` -- items are links:  muted until hovered, the selected one strongest.  " +
        "Its old name was the bare `link` switch."
    },
    {
      name: "selection",
      group: "appearance",
      kind: "keyOnly",
      description: "Items are choices:  `<button>`s with a hover background, `ui-select` on activation."
    },
    {
      name: "hover",
      group: "appearance",
      kind: "valueOnly",
      values: ["indent"],
      classes: { indent: "animated" },
      replaces: [{ from: "animated", value: "indent" }],
      description: "What an item does when hovered:  `indent`, it moves in.  Its old name was `animated`."
    },
    {
      name: "direction",
      group: "layout",
      kind: "valueOnly",
      values: ["vertical", "horizontal"],
      classes: { vertical: "" },
      replaces: [{ from: "horizontal", value: "horizontal" }],
      description:
        "Which way the items run:  `vertical` (the default) or `horizontal`, in a row.  " +
        "Its old name was the bare `horizontal` switch."
    },
    { name: "divided", group: "layout", kind: "keyOnly", description: "A rule between items." },
    { name: "celled", group: "layout", kind: "keyOnly", description: "A rule around every item." },
    {
      name: "spacing",
      group: "layout",
      kind: "valueOnly",
      values: ["lg", "xl"],
      classes: { lg: "relaxed", xl: "very relaxed" },
      replaces: [{ from: "relaxed", value: "lg", values: { very: "xl" } }],
      description: 'Room between items:  `lg` more, `xl` even more.  Its old name was `relaxed` (`relaxed="very"`).'
    },
    {
      name: "padding",
      group: "layout",
      kind: "valueOnly",
      values: ["none"],
      classes: { none: "fitted" },
      replaces: [{ from: "fitted", value: "none" }],
      description:
        "`none`:  no horizontal item padding;  a `selection` list's hover background reaches past its edges.  " +
        "Its old name was `fitted`."
    },
    { name: "inverted", group: "appearance", kind: "keyOnly", description: "For dark backgrounds:  the dark scheme." },
    {
      name: "vertical-align",
      group: "layout",
      kind: "verticalAlign",
      values: "verticalAlignments",
      description: "Aligns each item's icon, image and content:  `top` (default), `middle` or `bottom`."
    }
  ],
  events: [
    {
      name: "ui-chosen",
      detail: "{ value: string, item: Element, originalEvent?: Event }",
      description:
        "An interactive item was activated (click, Enter, Space):  a `selection` list's item, or an item link / " +
        "button.  `value` is the item's `value`, else its text."
    }
  ],
  slots: [{ name: "", description: "`<ui-item>`s;  a nested `<ui-list>` inside an item is its sub-list." }],
  parts: [{ name: "list", description: "The `<ul>` / `<ol>` box." }],
  states: [
    { name: "in-list", description: 'Nested in another list:  renders the sub-list (`class="list"`, no `ui`).' }
  ],
  texts: [],
  ownsParts: ["item", "list", "content", "header", "description"]
} as const satisfies E.ComponentVocabulary
