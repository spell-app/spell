/**
 * Every name `<epic-zoom>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell-epic/definitions"

/****************
 * ### `<epic-zoom>`
 * One image shown full size over the page, in a modal (epic `epic-engine` I129).
 ****************/
export const epicZoomVocabulary = {
  tag: "epic-zoom",
  topics: ["documentation", "overlays"],
  aka: ["zoom", "lightbox", "full size", "image viewer", "screenshot"],
  noun: "zoom",
  ui: false,
  description:
    "One image shown full size over the page:  as large as fits the window, never cropped or enlarged, on a dark " +
    "backdrop, its alt text under it.  Escape, a click anywhere or its close button close it.  ONE per page, made " +
    "by `ImageZoom.show()` when a zoomable image is clicked (a screenshot on an epic page, a details page or a " +
    "guide;  a request's thumbnail):  never written in a page.",
  attributes: [
    {
      name: "src",
      kind: "string",
      description: "The image's address, relative or whole:  shown while it's set;  removed as it closes."
    },
    { name: "alt", kind: "string", description: "The image's alt text:  the caption, and the zoomed image's own." }
  ],
  events: [],
  slots: [],
  parts: [
    { name: "base", description: "The `<ui-modal>`, over the whole window." },
    { name: "image", description: "The image, as large as fits." },
    { name: "caption", description: "Its alt text, under it." }
  ],
  states: [],
  texts: [
    { key: "zoomed", text: "{alt}, full size", description: "The zoomed image's alt text (its own `alt`)." },
    { key: "untitled", text: "Image, full size", description: "The zoomed image's alt text, when it had none." }
  ],
  children: []
} as const satisfies EpicVocabulary
