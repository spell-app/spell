/**
 * The English vocabulary of `<ui-audio>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), events, slots, parts and states.
 *   The shape is `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - The browser's own audio player (epic `ui-gaps` P11).
 *   Without `controls` it draws nothing:  a sound the page plays from script (a game's).
 */

import type { E } from "spell-ui/core"
import { MediaAttributes, MediaEvents } from "./UIVideo.types"

/****************
 * ### `audioVocabulary`
 * The names of `<ui-audio>`:  `<audio part="audio">`, the browser's player.
 ****************/
export const audioVocabulary = {
  tag: "ui-audio",
  topics: ["media", "elements"],
  aka: ["audio", "sound", "music", "sound effect", "audio player"],
  noun: "audio",
  description: "An audio plays a sound file:  in the browser's own player, or unseen, when the page says.",
  attributes: [
    ...MediaAttributes,
    {
      name: "controls",
      group: "behaviour",
      kind: "boolean",
      description: "Shows the browser's player.  Without it, nothing shows:  the page plays it (`play()`)."
    }
  ],
  events: [...MediaEvents],
  slots: [],
  parts: [{ name: "audio", description: "The `<audio>`." }],
  states: [{ name: "silent", description: "No `controls`:  nothing shows." }],
  texts: []
} as const satisfies E.ComponentVocabulary
