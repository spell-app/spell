/**
 * What `<ui-video>` and `<ui-audio>` share:  their attributes and events, as vocabulary pieces.
 * - Pure data:  the vocabularies import it, and node reads them.
 */

import type { E } from "spell-ui/core"

/** The attributes every player takes:  what to play, and how. */
export const MediaAttributes = [
  { name: "src", group: "link", kind: "string", description: "The file to play, relative to the page." },
  {
    name: "autoplay",
    group: "behaviour",
    kind: "boolean",
    description:
      "Starts playing as soon as it can.  A browser allows that only when `muted`, or after the reader has " +
      "clicked on the page."
  },
  { name: "muted", group: "behaviour", kind: "boolean", description: "Starts with the sound off." },
  { name: "loop", group: "behaviour", kind: "boolean", description: "Starts again at the end." }
] as const satisfies readonly E.AttributeSpec[]

/** The events every player sends, from its native element's. */
export const MediaEvents = [
  { name: "ui-play", detail: "{ currentTime: number }", description: "It started playing (or went on)." },
  { name: "ui-pause", detail: "{ currentTime: number }", description: "It paused." },
  { name: "ui-ended", detail: "{ currentTime: number }", description: "It played to the end." }
] as const satisfies readonly E.EventSpec[]
