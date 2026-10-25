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
    { name: "fitted", group: "layout", kind: "keyOnly", description: "No gap after the group." },
    {
      name: "circular",
      group: "appearance",
      kind: "keyOnly",
      description: "Inside a circular ring, the first icon centred."
    },
    {
      name: "bordered",
      group: "appearance",
      kind: "keyOnly",
      description: "Inside a square ring, the first icon centred."
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
