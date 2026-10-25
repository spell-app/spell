/**
 * The English vocabulary of `<ui-header>`, one of the 13 generic content parts:  every name the tag uses.
 * - The shape is `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - The noun IS the part word, and the class its root carries:  `<ui-header>` => `class="header"`.
 *   Parts have no `ui` class (`ui: false`), except a STANDALONE `<ui-header>`, which is Fomantic's `ui header`.
 * - Owners declare the parts they own (`ownsParts` in THEIR vocabularies).
 *   `OwnerContext` finds a part's nearest owner, and the part sets `:state(in-<owner>)`;
 *   its `states` list the owners Fomantic styles it in.
 * - `<ui-header>` owns parts too:  a nested `<ui-header>` is its sub header, a `<ui-content>` its text column.
 * - `UIParts.css` styles every part;  its header lists the tokens owners must set.
 */

import type { E } from "spell-ui/core"

/****************
 * ### `headerVocabulary`
 * The names of `<ui-header>`, a header:  standalone, `<div class="ui ... header">` (`<h1>` ... `<h6>` with `level`);
 * owned, `<div class="header">`.
 ****************/
export const headerVocabulary = {
  tag: "ui-header",
  topics: ["content parts", "typography", "text", "basic", "elements"],
  aka: ["heading", "title", "h1", "headline"],
  skeleton: "medium line",
  noun: "header",
  plural: "headers",
  description: "A header provides a short summary of content.",
  attributes: [
    {
      name: "level",
      group: "appearance",
      kind: "enum",
      values: ["1", "2", "3", "4", "5", "6"],
      description: "Page header:  renders `<h1>` ... `<h6>`, sized by level unless `size` is set."
    },
    {
      name: "size",
      group: "appearance",
      kind: "size",
      description:
        "Content header size relative to the surrounding text, `mini` ... `massive`;  `medium` is the default."
    },
    { name: "color", group: "appearance", kind: "color", description: "Hue of the text (and of a `dividing` rule)." },
    {
      name: "sub",
      group: "appearance",
      kind: "keyOnly",
      description: "A sub heading:  small, uppercase.  Inside a header, its sub header."
    },
    {
      name: "icon",
      group: "content",
      kind: "keyOnly",
      description: "Icon header:  a large slotted icon centred above the text."
    },
    { name: "dividing", group: "appearance", kind: "keyOnly", description: "A rule below it." },
    { name: "block", group: "layout", kind: "keyOnly", description: "In a tinted box." },
    {
      name: "attach",
      group: "layout",
      kind: "valueOnly",
      values: ["both", "top", "bottom"],
      classes: { both: "attached", top: "top attached", bottom: "bottom attached" },
      replaces: [{ from: "attached", value: "both" }],
      description:
        "Joined to a segment below (`top`) or above (`bottom`);  `both` sits between two.  Its old name is `attached`."
    },
    {
      name: "seamless",
      group: "appearance",
      kind: "keyOnly",
      description: "With `attached`:  no line where it meets the segment."
    },
    {
      name: "floated",
      group: "layout",
      kind: "valueAndKey",
      values: "floats",
      description: "Floats `left` or `right`."
    },
    {
      name: "align",
      group: "layout",
      kind: "textAlign",
      values: "alignments",
      replaces: ["text-align"],
      description: "Aligns its text `left`, `center`, `right` or `justified`.  Its old name is `text-align`."
    },
    {
      name: "padding",
      group: "layout",
      kind: "valueOnly",
      values: ["none"],
      classes: { none: "fitted" },
      replaces: [{ from: "fitted", value: "none" }],
      description: "`none`:  no padding.  Its old name is `fitted`."
    },
    { name: "disabled", group: "states", kind: "keyOnly", description: "Dimmed." },
    {
      name: "inverted",
      group: "appearance",
      kind: "keyOnly",
      description: "For dark backgrounds:  the dark scheme, for it and its parts."
    },
    {
      name: "link",
      group: "link",
      kind: "string",
      replaces: ["href"],
      description: "Renders a link (`<a>`) styled as a header.  Its old name is `href`."
    }
  ],
  events: [],
  slots: [
    {
      name: "",
      description: "Text, a slotted `<ui-icon>` / `<img>`, a `<ui-content>` and a nested `<ui-header>` (sub header)."
    }
  ],
  parts: [{ name: "header", description: "The header box (`<div>`, `<h1>` ... `<h6>`, or `<a>`)." }],
  states: [
    { name: "in-card", description: "Owned by a card." },
    { name: "in-item", description: "Owned by an item." },
    { name: "in-modal", description: "Owned by a modal." },
    { name: "in-flyout", description: "Owned by a flyout." },
    { name: "in-message", description: "Owned by a message." },
    { name: "in-list", description: "Owned by a list." },
    { name: "in-popup", description: "Owned by a popup." },
    { name: "in-toast", description: "Owned by a toast." },
    { name: "in-header", description: "Owned by a header." },
    { name: "in-menu", description: "Owned by a menu:  an item's sub header (a vertical menu's `.item > .header`)." }
  ],
  texts: [],
  ownsParts: ["header", "content"]
} as const satisfies E.ComponentVocabulary
