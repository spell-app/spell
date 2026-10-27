/**
 * The English vocabulary of `<ui-video>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), events, slots, parts and states.
 *   The shape is `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - The browser's own video player (epic `ui-gaps` P11):  a video FILE, where `<ui-embed>` plays another site's.
 * - Its name for a screen reader is the shared `label`.
 */

import type { E } from "spell-ui/core"
import { MediaAttributes, MediaEvents } from "./UIVideo.types"

/****************
 * ### `videoVocabulary`
 * The names of `<ui-video>`:  `<video part="video">`, the browser's player.
 ****************/
export const videoVocabulary = {
  tag: "ui-video",
  topics: ["media", "elements"],
  aka: ["video", "movie", "clip", "player", "video player"],
  noun: "video",
  description: "A video plays a video file in the browser's own player.",
  attributes: [
    ...MediaAttributes,
    { name: "poster", group: "content", kind: "string", description: "A picture shown before it plays." },
    {
      name: "controls",
      group: "behaviour",
      kind: "boolean",
      default: true,
      description: 'The browser\'s play, pause and volume controls;  `controls="false"` hides them.'
    },
    {
      name: "captions",
      group: "content",
      kind: "string",
      description: "A captions file (WebVTT, `.vtt`), in the page's language:  the player offers them."
    },
    {
      name: "ratio",
      group: "layout",
      kind: "string",
      description: 'Its shape, width to height:  `"16/9"`, `"4/3"`, `"1"`.  By default, the video\'s own.'
    }
  ],
  events: [...MediaEvents],
  slots: [],
  parts: [{ name: "video", description: "The `<video>`." }],
  states: [],
  texts: [{ key: "captions", text: "Captions", description: "The captions track's name in the player's menu." }]
} as const satisfies E.ComponentVocabulary
