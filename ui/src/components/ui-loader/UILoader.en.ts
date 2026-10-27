/**
 * The English vocabulary of `<ui-loader>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), slots, parts, states and texts.
 *   The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - Pure data:  node imports it (`yarn site:data`, `yarn gen:root`), so `spell/ui/core` for types only.
 * - The attributes become Fomantic's class words, in Fomantic's order (`ClassBuilder`):
 *   `<ui-loader size="large" color="red" speed="slow" visible inline>` => `ui large red slow inline active loader`.
 * - `active` is Fomantic's shown-loader class:
 *   no attribute here, but the class the box has while the element shows (the shared `visible` / `hidden`).
 * - `speed` is `kind: "valueOnly"` because it writes its value alone (`slow` / `fast`), like dropdown's `state`.
 * - Accessibility (see `UILoader.css`):
 *   - the element is `role="status"` + `aria-live="polite"` (through `internals`)
 *   - with no slotted text, its accessible name is the `loading` text
 *   - the spinner is decorative
 */

import type { E } from "spell/ui/core"

/****************
 * ### `loaderVocabulary`
 * The names of `<ui-loader>`, a spinner:  `<div class="ui … loader" part="loader">` around a slot for its text.
 ****************/
export const loaderVocabulary = {
  tag: "ui-loader",
  topics: ["loading", "feedback", "progress", "elements"],
  aka: ["spinner", "loading indicator", "busy", "throbber", "activity indicator"],
  noun: "loader",
  description: "A loader tells people to wait for an activity to complete.",
  attributes: [
    {
      name: "size",
      group: "appearance",
      kind: "size",
      description: "Spinner and text size, `mini` ... `massive`;  `medium` is the default."
    },
    { name: "color", group: "appearance", kind: "color", description: "Hue of the turning arc." },
    {
      name: "speed",
      group: "appearance",
      kind: "valueOnly",
      values: ["slow", "fast"],
      description: "Spin `slow` or `fast`;  absent is normal."
    },
    { name: "disabled", group: "states", kind: "keyOnly", description: "Hidden, even when `visible`." },
    { name: "text", group: "name", kind: "keyOnly", description: "Shows the slotted text below the spinner." },
    {
      name: "inline",
      group: "layout",
      kind: "keyOnly",
      description: "Sits in the text flow instead of centred over its positioned container."
    },
    {
      name: "align",
      group: "layout",
      kind: "valueOnly",
      values: ["center"],
      classes: { center: "centered" },
      replaces: [{ from: "centered", value: "center" }],
      description: "With `inline`:  `center`, a block of its own, centred.  Old name:  `centered`."
    },
    {
      name: "indeterminate",
      group: "states",
      kind: "keyOnly",
      description: "Unsure how long it'll take:  turns backwards, slower."
    },
    { name: "double", group: "appearance", kind: "keyOnly", description: "Two opposite arcs." },
    {
      name: "elastic",
      group: "appearance",
      kind: "keyOnly",
      description: "Two arcs that stretch and chase each other."
    },
    {
      name: "inverted",
      group: "appearance",
      kind: "keyOnly",
      description: "For dark backgrounds:  a white arc on a faint track."
    }
  ],
  events: [],
  slots: [{ name: "", description: "Text shown below the spinner, with `text`;  also the accessible name." }],
  parts: [{ name: "loader", description: "The loader box;  its `::before` is the track, `::after` the arc." }],
  states: [{ name: "disabled", description: "Hidden." }],
  texts: [
    { key: "loading", text: "Loading…", description: "Accessible name of the `status` host when nothing is slotted." }
  ]
} as const satisfies E.ComponentVocabulary
