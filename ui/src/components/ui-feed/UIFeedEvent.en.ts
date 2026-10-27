/**
 * The English vocabulary of `<ui-event>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), events, slots, parts, states and texts.
 *   The shape is `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - The family's grammar notes are in `UIFeed.en.ts`.
 */

import type { E } from "spell-ui/core"

/****************
 * ### `eventVocabulary`
 * The names of `<ui-event>`, one event of a feed:  `<div class="[color] [keyOnly ...] event">`,
 * a label (icon, image, text) beside a content block.
 ****************/
export const eventVocabulary = {
  tag: "ui-event",
  topics: ["social", "content parts", "views"],
  aka: ["activity", "feed item", "timeline entry"],
  noun: "event",
  ui: false,
  description: "One event of a feed:  a label (a picture, an icon, a number) beside what happened.",
  attributes: [
    {
      name: "color",
      group: "appearance",
      kind: "color",
      description: "Hue of its number circle and of the line to the next event (`connected`)."
    },
    { name: "icon", group: "content", kind: "icon", description: "Icon name, shown as the label." },
    {
      name: "image",
      group: "content",
      kind: "string",
      description: 'Image URL, shown round as the label (decorative, `alt=""`).'
    },
    {
      name: "label",
      group: "name",
      kind: "string",
      description: "Short text in a circle as the label, e.g. an initial (Fomantic's `data-text`)."
    },
    {
      name: "appearance",
      group: "appearance",
      kind: "multiple",
      values: ["basic"],
      // each word draws itself:  no key after it
      classes: {},
      replaces: [{ from: "basic", value: "basic" }],
      description: "The look:  `basic`, its number / text circle outlined instead of filled.  Old name:  `basic`."
    },
    { name: "disabled", group: "states", kind: "keyOnly", description: "Faded and inert." }
  ],
  events: [],
  slots: [
    { name: "", description: "The content:  a `<ui-content>` of `<ui-summary>`, `<ui-extra>`, `<ui-meta>` ..." },
    { name: "label", description: "The label's content instead of a shorthand:  an `<img>`, a `<ui-icon>`." }
  ],
  parts: [
    { name: "event", description: "The event box." },
    { name: "label", description: "The label box beside the content." },
    { name: "image", description: "The `<img>` of the `image` shorthand." },
    { name: "icon", description: "The icon box of the `icon` shorthand." }
  ],
  states: [
    { name: "in-feed", description: "In a feed:  `role=listitem`." },
    { name: "disabled", description: "`disabled`." }
  ],
  texts: []
} as const satisfies E.ComponentVocabulary
