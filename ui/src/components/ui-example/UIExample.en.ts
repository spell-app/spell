/**
 * The English vocabulary of `<ui-example>`:  every name the tag uses.
 * - Its tag, attributes, events, slots, parts, states and texts.
 *   The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - The docs site's `<ui-docs-example>` until epic `ui-gaps` P14 made it a component (from epic `epic-engine` P14):
 *   the old tag is renamed by `spell ui rename` (`OldNames`), and its old `header` is `heading`.
 * - Class words:  `bare`, `variation` (`ui bare example`);  the open state is `:state(open)`, not a class.
 */

import type { E } from "spell/ui/core"

/****************
 * ### `exampleVocabulary`
 * The names of `<ui-example>`, Fomantic's docs example block:  a heading and description,
 * its own children LIVE, and their source in a code pane the code button shows and hides.
 ****************/
export const exampleVocabulary = {
  tag: "ui-example",
  topics: ["documentation", "data display"],
  aka: ["example", "demo", "live example", "code sample", "playground", "show code"],
  skeleton: "header, 2 line paragraph",
  noun: "example",
  description:
    "An example shows its own markup live, under a heading and description, with the same markup as code a button " +
    "shows and hides.",
  attributes: [
    {
      name: "heading",
      replaces: ["header"],
      kind: "string",
      description: "Its title, e.g. `Emphasis`:  Fomantic's `h4` above the example.  Its old name was `header`."
    },
    {
      name: "description",
      kind: "string",
      description:
        "One sentence under the heading;  `` `x` `` becomes code, `[words](link)` a link.  Slot `description` " +
        "for richer text (a message, several paragraphs):  drawn after it."
    },
    {
      name: "level",
      kind: "number",
      default: 4,
      description: "Heading level of the title, `1` ... `6`:  Fomantic's examples are `h4`, under the section's `h2`."
    },
    {
      name: "code",
      kind: "boolean",
      description:
        "The code pane is open;  the code button toggles it, so it's the LIVE state too (reflected, `ui-opened` / `ui-closed`).  " +
        "Set it in markup to open the code at start."
    },
    {
      name: "language",
      kind: "string",
      default: "html",
      description:
        "Language of the code pane (`<ui-code language>`).  The source is the markup, so `html` unless a " +
        "`code` child says otherwise."
    },
    {
      name: "bare",
      kind: "keyOnly",
      description: "No segment frame around the live example and code, even while the code is open."
    },
    {
      name: "variation",
      kind: "keyOnly",
      description:
        "Fomantic's smaller variation style:  a smaller title and less space around it, for a run of " +
        "small examples under one heading."
    }
  ],
  events: [
    {
      name: "ui-opened",
      detail: "{ open: true, originalEvent?: Event }",
      description: "The code button opened the code pane."
    },
    {
      name: "ui-closed",
      detail: "{ open: false, originalEvent?: Event }",
      description: "The code button closed the code pane."
    }
  ],
  slots: [
    {
      name: "",
      description:
        "The example itself, shown live;  its markup is the code shown.  A `<template>` child instead:  stamped out " +
        "live, and its markup shown EXACTLY as written."
    },
    { name: "description", description: "Rich description, in place of the `description` attribute." },
    {
      name: "source",
      description:
        "What the code pane shows in place of the markup, e.g. an editor of the example's code.  Shown only while " +
        "the code is open, as the markup is."
    },
    {
      name: "tools",
      description:
        "Buttons of the page's own, in a row just left of the code button and in its look, e.g. a notebook's Add, " +
        "Move and Delete.  The page decides when they show."
    }
  ],
  parts: [
    { name: "example", description: "The whole block (`<section>`)." },
    { name: "header", description: "The `<ui-header>` title." },
    { name: "toggle", description: 'The code button (`<ui-button circular basic icon="code">`).' },
    { name: "tools", description: "The row round the `tools` slot, just left of the code button." },
    { name: "description", description: "The description under the title." },
    { name: "demo", description: "The `<ui-segment>` around the live example." },
    { name: "code", description: "The `<ui-segment>` around the code pane." },
    { name: "source", description: "The `<ui-code>` showing the markup." }
  ],
  states: [
    { name: "open", description: "The code pane is open." },
    { name: "code-shown", description: "The code pane is drawn:  open, or still rolling closed." },
    {
      name: "open-at-start",
      description: "The code was open from the start:  it showed at once, without rolling open."
    }
  ],
  texts: [
    { key: "showCode", text: "Show code", description: "The code button's label while the code is hidden." },
    { key: "hideCode", text: "Hide code", description: "The code button's label while the code shows." }
  ]
} as const satisfies E.ComponentVocabulary
