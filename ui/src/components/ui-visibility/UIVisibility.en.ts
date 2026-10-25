/**
 * Every name `<ui-visibility>` uses:  tag, attributes (kind + allowed values), events, slots, parts, states, texts.
 * Schema:  `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - No class attributes:  visibility is a behaviour (Fomantic's has no stylesheet);  the root is `ui visibility`.
 * - Events are Fomantic's callbacks as `ui-*` events, `detail` the calculations (`VisibilityCalculations`).
 */

import type { E } from "spell-ui/core"

/****************
 * ### `<ui-visibility>`
 * A wrapper that reports where it is against the screen, and can lazy-load the images inside it:
 * `<div class="ui visibility" part="visibility">` around the slot.
 ****************/
export const visibilityVocabulary = {
  tag: "ui-visibility",
  topics: ["animation", "media", "modules"],
  aka: ["scroll spy", "in view", "intersection", "lazy load", "on screen"],
  noun: "visibility",
  description: "Visibility provides a set of callbacks for when content appears in the viewport.",
  attributes: [
    {
      name: "once",
      group: "appearance",
      kind: "boolean",
      default: true,
      description: 'Each event fires at most once (Fomantic\'s default);  `once="false"`:  each time it turns true.'
    },
    {
      name: "continuous",
      group: "appearance",
      kind: "boolean",
      description: "Events fire at every check while their condition holds (each crossing, not every scrolled pixel)."
    },
    {
      name: "offset",
      group: "layout",
      kind: "number",
      default: 0,
      description: "Pixels below the viewport top that count as the screen top, e.g. under a fixed menu."
    },
    {
      name: "type",
      group: "appearance",
      kind: "enum",
      values: ["image"],
      description: "`image`:  every `<img data-src>` inside gets its source once on screen, then fades in (`ui-loaded`)."
    },
    {
      name: "duration",
      group: "behaviour",
      kind: "number",
      default: 1000,
      description: '`type="image"`:  that animation\'s ms.'
    }
  ],
  events: [
    { name: "ui-in-view", detail: "VisibilityCalculations", description: "Some of it came on screen (`onOnScreen`)." },
    { name: "ui-out-of-view", detail: "VisibilityCalculations", description: "None of it is on screen (`onOffScreen`)." },
    { name: "ui-top-in-view", detail: "VisibilityCalculations", description: "Its top came on screen." },
    { name: "ui-bottom-in-view", detail: "VisibilityCalculations", description: "Its bottom came on screen." },
    { name: "ui-top-passed", detail: "VisibilityCalculations", description: "Its top passed the screen top." },
    { name: "ui-bottom-passed", detail: "VisibilityCalculations", description: "Its bottom passed the screen top." },
    { name: "ui-passing", detail: "VisibilityCalculations", description: "It spans the screen top." },
    {
      name: "ui-loaded",
      detail: "{ image: HTMLImageElement }",
      description: '`type="image"`:  an image got its source (and finished its transition).'
    }
  ],
  slots: [{ name: "", description: 'The content;  its `<img data-src>`s with `type="image"`.' }],
  parts: [{ name: "visibility", description: "The box around the slot." }],
  states: [{ name: "visible", description: "Some of it is on screen now (as of the last check)." }],
  texts: []
} as const satisfies E.ComponentVocabulary
