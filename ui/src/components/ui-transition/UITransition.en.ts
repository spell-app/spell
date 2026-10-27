/**
 * Every name `<ui-transition>` uses:  tag, attributes (kind + allowed values), events, slots, parts, states, texts.
 * Schema:  `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - Class words come out through `ClassBuilder`, in Fomantic's grammar:
 *   `<ui-transition color="red" pulsating looping>` => `ui red looping pulsating transition`;
 *   the element adds its state before the noun (`visible`, `animating`), the words Fomantic's script added.
 * - `visible` / `hidden` and `animation` are every element's (`SharedVocabulary`).
 *   - A transition starts hidden (`elementSetup.visible`).
 *   - `animation` takes Fomantic's names, spaces and all (`fade up`, `horizontal flip`),
 *     attention ones (`shake`) included.
 */

import type { E } from "spell/ui/core"

/****************
 * ### `<ui-transition>`
 * Shows / hides (or shakes, pulses ...) its content with the animation catalogue:
 * `<div class="ui ... transition" part="transition"><slot>`.
 ****************/
export const transitionVocabulary = {
  tag: "ui-transition",
  topics: ["animation", "modules"],
  aka: ["animate", "fade", "slide", "motion", "effect"],
  noun: "transition",
  description: "A transition is an animation used to show or hide content, or to draw attention to it.",
  attributes: [
    {
      name: "duration",
      group: "behaviour",
      kind: "string",
      description: "Length of each animation:  ms (`300`) or a CSS time (`0.3s`);  default the animation's own."
    },
    {
      name: "interrupt",
      group: "advanced",
      kind: "boolean",
      description: "A new animation stops the running one instead of waiting for it (Fomantic's `queue: false`)."
    },
    {
      name: "allow-repeats",
      group: "advanced",
      kind: "boolean",
      description: "Queue the same animation twice in a row (Fomantic's `allowRepeats`);  by default it's dropped."
    },
    { name: "color", group: "appearance", kind: "color", description: "Hue of a `pulsating` ring." },
    {
      name: "inline",
      group: "layout",
      kind: "keyOnly",
      description: "An inline block around inline content (an image, a button)."
    },
    { name: "inverted", group: "appearance", kind: "keyOnly", description: "A `pulsating` ring for dark backgrounds." },
    { name: "looping", group: "appearance", kind: "keyOnly", description: "Repeats every animation until removed." },
    {
      name: "pulsating",
      group: "appearance",
      kind: "keyOnly",
      description: "A ring pulsing out of the box (with `looping`, forever)."
    },
    { name: "disabled", group: "states", kind: "keyOnly", description: "Pauses the running animation." }
  ],
  events: [
    {
      name: "ui-opened",
      detail: "{ visible: true, animation: string }",
      description: "Shown, its animation finished (Fomantic's `onVisible`)."
    },
    {
      name: "ui-closed",
      detail: "{ visible: false, animation: string }",
      description: "Hidden, its animation finished (Fomantic's `onHidden`)."
    },
    {
      name: "ui-animated",
      detail: "{ visible: boolean, animation: string }",
      description: "Any animation finished, attention ones included (Fomantic's `onComplete`)."
    }
  ],
  slots: [{ name: "", description: "The content to animate." }],
  parts: [{ name: "transition", description: "The animated box around the content." }],
  states: [{ name: "animating", description: "An animation is running." }],
  texts: []
} as const satisfies E.ComponentVocabulary
