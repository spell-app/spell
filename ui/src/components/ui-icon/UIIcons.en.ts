/**
 * The English vocabulary of `<ui-icons>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), slots, parts and states.
 *   The shape is `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - How the family's attributes become class words:  `UIIcon.en.ts`.
 * - `iconsVocabulary.ownsParts` lists `icon`:  a `<ui-icon>` directly inside a `<ui-icons>` finds it
 *   through `OwnerContext` and sets `:state(in-icons)`, which `UIIcon.css` stacks and positions it by.
 */

import type { E } from "spell-ui/core"

/****************
 * ### `iconsVocabulary`
 * The names of `<ui-icons>`, several icons stacked into one glyph:  `<span class="ui … icons" part="icons"><slot>`.
 ****************/
export const iconsVocabulary = {
  tag: "ui-icons",
  topics: ["icons", "elements"],
  aka: ["icon group", "stacked icons", "icon stack"],
  skeleton: "inline 1 x 1",
  noun: "icons",
  description: "Several icons can be used together as a group.",
  attributes: [
    {
      name: "size",
      group: "appearance",
      kind: "size",
      description: "Size of the whole group, relative to the surrounding text."
    },
    {
      name: "label",
      group: "name",
      kind: "string",
      description: "Accessible name for the combined glyph (`role=img`);  without it the group is decorative."
    },
    { name: "disabled", group: "states", kind: "keyOnly", description: "Dimmed and inert." },
    { name: "loading", group: "states", kind: "keyOnly", description: "The whole group spins." },
    {
      name: "padding",
      group: "layout",
      kind: "valueOnly",
      values: ["none"],
      classes: { none: "fitted" },
      replaces: [{ from: "fitted", value: "none" }],
      description: "`none`:  no gap after the group.  Its old name is `fitted`."
    },
    {
      name: "appearance",
      group: "appearance",
      kind: "multiple",
      // the words are the classes:  no key after them (`ClassBuilder`)
      classes: {},
      values: ["circular", "bordered"],
      replaces: [
        { from: "circular", value: "circular" },
        { from: "bordered", value: "bordered" }
      ],
      description:
        "The look, several words at once:  `circular` (inside a circular ring), `bordered` (inside a square ring), " +
        "the first icon centred.  Old names:  `circular`, `bordered` written alone."
    },
    {
      name: "inverted",
      group: "appearance",
      kind: "keyOnly",
      description: "A filled `circular` / `bordered` ring, for dark backgrounds."
    }
  ],
  events: [],
  slots: [{ name: "", description: "`<ui-icon>`s:  the first is the base glyph, the rest stack on it (`corner`)." }],
  parts: [{ name: "icons", description: "The group box." }],
  states: [],
  texts: [],
  ownsParts: ["icon"]
} as const satisfies E.ComponentVocabulary
