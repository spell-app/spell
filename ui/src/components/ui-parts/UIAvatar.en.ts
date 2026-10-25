/**
 * The English vocabulary of `<ui-avatar>`, one of the 13 generic content parts:  every name the tag uses.
 * - The shape is `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - The noun IS the part word, and the class its root carries:  `<ui-avatar>` => `class="avatar"`.
 *   Parts have no `ui` class (`ui: false`), except a STANDALONE `<ui-header>`, which is Fomantic's `ui header`.
 * - Owners declare the parts they own (`ownsParts` in THEIR vocabularies).
 *   `OwnerContext` finds a part's nearest owner, and the part sets `:state(in-<owner>)`;
 *   its `states` list the owners Fomantic styles it in.
 * - `UIParts.css` styles every part;  its header lists the tokens owners must set.
 */

import type { E } from "spell-ui/core"

/****************
 * ### `avatarVocabulary`
 * The names of `<ui-avatar>`, an avatar:  `<span class="avatar"><img alt=""></span>`.
 ****************/
export const avatarVocabulary = {
  tag: "ui-avatar",
  topics: ["content parts", "images", "social"],
  aka: ["profile picture", "user image", "userpic"],
  noun: "avatar",
  ui: false,
  description: "A small picture of a person:  a comment's or a card's.",
  attributes: [
    { name: "src", group: "link", kind: "string", description: "Image URL;  renders the `<img>` (or slot one)." },
    {
      name: "tooltip",
      group: "content",
      kind: "string",
      replaces: ["alt"],
      description:
        "Who it is:  the picture's tooltip and its alternative text for screen readers.  " +
        "Default none (decorative:  the name is nearly always beside it).  Its old name is `alt`."
    }
  ],
  events: [],
  slots: [{ name: "", description: "An `<img>`, instead of `src`." }],
  parts: [
    { name: "avatar", description: "The avatar box." },
    { name: "image", description: "The `<img>` rendered from `src`." }
  ],
  states: [
    { name: "in-card", description: "Owned by a card." },
    { name: "in-item", description: "Owned by an item." },
    { name: "in-comment", description: "Owned by a comment." }
  ],
  texts: []
} as const satisfies E.ComponentVocabulary
