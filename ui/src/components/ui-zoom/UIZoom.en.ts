/**
 * The English vocabulary of `<ui-zoom>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), slots, parts, states and texts.
 *   The shape is `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - Moved from the epics pack's `<epic-zoom>` (epic `ui-gaps` P14, from epic `epic-engine` P14 and its Q22):
 *   it zooms an image, as `<epic-zoom>` did, AND anything it wraps.
 * - No class words:  every attribute is property-only.
 */

import type { E } from "spell-ui/core"

/****************
 * ### `zoomVocabulary`
 * The names of `<ui-zoom>`:  something shown small, or not at all, and full size over the page on a click.
 ****************/
export const zoomVocabulary = {
  tag: "ui-zoom",
  topics: ["images", "media", "overlays"],
  aka: ["lightbox", "zoom", "full size", "image viewer", "magnifier", "expand", "screenshot", "thumbnail"],
  noun: "zoom",
  description:
    "A zoom shows something full size, over the page.  Round any content it shows it shrunk, within a width and " +
    "height, and full size on a click;  with `src` it shows that image full size.  Escape, a click outside it or " +
    "its close button close it.",
  attributes: [
    {
      name: "max-width",
      group: "layout",
      kind: "string",
      description:
        "The widest the shrunk view gets, a CSS length (`320px`, `50%`);  none:  its container's width.  " +
        "Content past it is cut off, until it's shown full size."
    },
    {
      name: "max-height",
      group: "layout",
      kind: "string",
      description:
        "The tallest the shrunk view gets, a CSS length (`200px`, `20em`);  none:  as tall as its content.  " +
        "Content past it is cut off, until it's shown full size."
    },
    {
      name: "shrink",
      group: "layout",
      kind: "string",
      default: "50%",
      description:
        "How big its content is in the shrunk view, a percentage of its full size:  `50%` by default;  `100%` " +
        "keeps it full size, cut off by `max-width` / `max-height`."
    },
    {
      name: "open",
      group: "states",
      kind: "boolean",
      description: "Shown full size, over the page.  Set to open it from script;  closing it clears it."
    },
    {
      name: "src",
      group: "link",
      kind: "string",
      description:
        "An image to show full size, in place of its content:  open while it's set, and cleared as it closes.  " +
        "The page's zoom for its screenshots (`ImageZoom`) is one of these."
    },
    {
      name: "alt",
      group: "content",
      kind: "string",
      description: "With `src`:  the image's alt text, its caption, and the zoomed image's own name."
    }
  ],
  events: [],
  slots: [{ name: "", description: "What it zooms:  any content, shown shrunk, then full size on a click." }],
  parts: [
    { name: "view", description: "The shrunk view of its content, in the page." },
    { name: "button", description: "The button over the shrunk view that shows it full size." },
    { name: "base", description: "The `<ui-modal>`, over the whole window." },
    { name: "content", description: "Its content, full size, in the modal." },
    { name: "image", description: "With `src`:  the image, as large as fits." },
    { name: "caption", description: "With `src`:  its alt text, under it." }
  ],
  states: [{ name: "open", description: "Shown full size, over the page." }],
  texts: [
    { key: "show", text: "Show full size", description: "The name of the button over the shrunk view." },
    { key: "zoomed", text: "{alt}, full size", description: "The zoomed image's alt text (its own `alt`)." },
    { key: "untitled", text: "Image, full size", description: "The zoomed image's alt text, when it had none." }
  ]
} as const satisfies E.ComponentVocabulary
