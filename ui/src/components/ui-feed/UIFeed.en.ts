/**
 * The English vocabulary of `<ui-feed>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), slots, parts and states.
 *   The shape is `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - Class words come out through `ClassBuilder`, in Fomantic's grammar:
 *   `<ui-feed connected ordered size="small">` => `ui small connected ordered feed`;  an event has no `ui`
 *   (`<ui-event basic>` => `basic event`).  `UIFeed.css` keys on those.
 * - The FEED owns the content parts (`ownsParts`):  an event is a part itself, transparent to their climbs,
 *   so `<ui-summary>`, `<ui-date>`, `<ui-meta>`, `<ui-extra>`, `<ui-author>` (Fomantic's `.user`) inside it get
 *   `:state(in-feed)` -- Fomantic's `.ui.feed > .event > .content .summary`.
 */

import type { E } from "spell-ui/core"

/****************
 * ### `feedVocabulary`
 * The names of `<ui-feed>`, an activity feed:
 * `<ul class="ui ... feed" role="list">` (`<ol>` when `ordered`) of `<ui-event>`s.
 ****************/
export const feedVocabulary = {
  tag: "ui-feed",
  topics: ["social", "lists", "data display", "views"],
  aka: ["activity feed", "timeline", "news feed", "activity stream"],
  skeleton: "header with image, 2 line paragraph",
  noun: "feed",
  description: "A feed presents people's activity chronologically.",
  attributes: [
    {
      name: "size",
      group: "appearance",
      kind: "size",
      description: "Text size, `mini` ... `massive`;  `medium` is the default."
    },
    {
      name: "color",
      group: "appearance",
      kind: "color",
      description: "Hue of the events' number circles (`ordered`) and connecting line (`connected`)."
    },
    {
      name: "connected",
      group: "appearance",
      kind: "keyOnly",
      description: "A line joins each event's label to the next."
    },
    {
      name: "ordered",
      group: "appearance",
      kind: "keyOnly",
      description: "Numbers the events, in a circle where the label goes.  Renders `<ol>`."
    },
    { name: "divided", group: "layout", kind: "keyOnly", description: "A rule between events." },
    {
      name: "basic",
      group: "appearance",
      kind: "keyOnly",
      description: "Ordered:  outlined number circles instead of filled ones."
    },
    { name: "inverted", group: "appearance", kind: "keyOnly", description: "For dark backgrounds:  the dark scheme." },
    { name: "disabled", group: "states", kind: "keyOnly", description: "Faded and inert." }
  ],
  events: [],
  slots: [{ name: "", description: "`<ui-event>`s." }],
  parts: [{ name: "feed", description: "The `<ul>` / `<ol>` box." }],
  states: [],
  texts: [],
  ownsParts: ["event", "content", "summary", "date", "meta", "extra", "author"]
} as const satisfies E.ComponentVocabulary
