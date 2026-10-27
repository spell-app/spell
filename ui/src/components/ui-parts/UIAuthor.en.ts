/**
 * The English vocabulary of `<ui-author>`, one of the 13 generic content parts:  every name the tag uses.
 * - The shape is `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - The noun IS the part word, and the class its root carries:  `<ui-author>` => `class="author"`.
 *   Parts have no `ui` class (`ui: false`), except a STANDALONE `<ui-header>`, which is Fomantic's `ui header`.
 * - Owners declare the parts they own (`ownsParts` in THEIR vocabularies).
 *   `OwnerContext` finds a part's nearest owner, and the part sets `:state(in-<owner>)`;
 *   its `states` list the owners Fomantic styles it in.
 * - `UIParts.css` styles every part;  its header lists the tokens owners must set.
 */

import type { E } from "spell-ui/core"

/****************
 * ### `authorVocabulary`
 * The names of `<ui-author>`, an author:  `<span class="author">` (`<a>` with `link`).
 ****************/
export const authorVocabulary = {
  tag: "ui-author",
  topics: ["content parts", "social"],
  aka: ["user name", "byline", "poster"],
  noun: "author",
  ui: false,
  description: "Who wrote a comment or did a feed event (Fomantic's feed `user`).",
  attributes: [
    {
      name: "link",
      group: "link",
      kind: "string",
      replaces: ["href"],
      description: "Renders a link (`<a>`), e.g. to a profile.  Its old name was `href`."
    },
    { name: "target", group: "link", kind: "string", description: "Link target, with `link`." }
  ],
  events: [],
  slots: [{ name: "", description: "The name." }],
  parts: [{ name: "author", description: "The author box." }],
  states: [
    { name: "in-comment", description: "Owned by a comment." },
    { name: "in-feed", description: "Owned by a feed." }
  ],
  texts: []
} as const satisfies E.ComponentVocabulary
