/**
 * Every name `<ui-popup>` uses:  tag, attributes (kind + allowed values), events, slots, parts, states, texts.
 * Schema:  `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - Pure data:  node imports it (`yarn site:data`, `yarn gen:root`), so `spell-ui/core` for types only,
 *   `UIT` by value straight from `components.types`.
 * - Class words come out through `ClassBuilder`, in Fomantic's grammar:
 *   `<ui-popup size="small" inverted wide="very">` => `ui small inverted very wide popup`.
 *   The element adds the `position` words before the noun (`ui inverted bottom left popup`),
 *   the words Fomantic's script added.
 * - `visible`, Fomantic's shown-popup class, is the element's own while it shows (the shared `visible` / `hidden`),
 *   so static markup and the element share one sheet.
 * - A popup OWNS the `header` and `content` parts:
 *   slotted `<ui-header>` / `<ui-content>` get `:state(in-popup)` and style themselves from `UIParts.css`.
 * - `target` is a PROPERTY (an element);  first paint never needs it --
 *   `for` or the previous sibling carry what markup must say.
 */

import type { E } from "spell-ui/core"
import * as UIT from "spell-ui/components/components.types"

/****************
 * ### `<ui-popup>`
 * A popup:  a popover DOM element anchored to its target, holding `<div class="ui ... popup" part="popup">`.
 ****************/
export const popupVocabulary = {
  tag: "ui-popup",
  topics: ["popups", "overlays", "feedback", "modules"],
  aka: ["tooltip", "popover", "hint", "hover card", "info bubble"],
  noun: "popup",
  description: "A popup displays additional information on top of a page.",
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
      description: "Hue:  fills the popup (and its arrow), with a readable text colour."
    },
    { name: "basic", group: "appearance", kind: "keyOnly", description: "No pointing arrow." },
    {
      name: "fixed",
      group: "layout",
      kind: "keyOnly",
      description: "Always its maximum width (`wide` / `very wide` widen it)."
    },
    {
      name: "flowing",
      group: "appearance",
      kind: "keyOnly",
      description: "No maximum width:  as wide as its content, e.g. a grid."
    },
    { name: "fluid", group: "layout", kind: "keyOnly", description: "As wide as its target." },
    {
      name: "inverted",
      group: "appearance",
      kind: "keyOnly",
      description: "The opposite scheme:  dark on a light page."
    },
    { name: "loading", group: "states", kind: "keyOnly", description: "Busy:  a spinner over faded content." },
    {
      name: "wide",
      group: "layout",
      kind: "keyOrValueAndKey",
      values: ["very"],
      description: 'A wider maximum width;  `wide="very"` wider still (`very wide`).'
    },
    {
      name: "position",
      group: "layout",
      kind: "enum",
      values: "positions",
      default: "top left",
      description:
        "Where it sits against its target:  `top left` (default) ... `right center`, `left top` ... `right bottom` " +
        "(beside, lined up with its top / bottom edge).  It flips to the other " +
        "side when there's no room."
    },
    {
      name: "open-on",
      group: "appearance",
      kind: "enum",
      values: UIT.PopupTriggers,
      default: UIT.PopupTrigger.hover,
      description:
        "What opens it:  `hover` (also keyboard focus), `focus`, `click` (toggles;  a non-modal dialog), or " +
        "`manual` (only `visible`)."
    },
    {
      name: "for",
      group: "appearance",
      kind: "string",
      property: "htmlFor",
      description: "Id of the target, in the popup's own tree;  without it, the previous element sibling."
    },
    {
      name: "header",
      group: "name",
      kind: "string",
      description: "Shorthand for a header line (Fomantic's `title`);  a slotted `<ui-header>` is the rich version."
    },
    {
      name: "content",
      group: "content",
      kind: "string",
      description: "Shorthand for the text (Fomantic's `content`);  slotted content is the rich version."
    },
    {
      name: "hoverable",
      group: "behaviour",
      kind: "boolean",
      default: true,
      description:
        "`hover`:  the popup stays open while the pointer is over it, so it can be reached and its text read or " +
        "selected -- on by default, as WCAG 1.4.13 (Content on Hover or Focus) asks for.  " +
        '`hoverable="false"` is Fomantic\'s `hoverable: false` (its default):  it closes as the pointer leaves ' +
        "the target, after `hide-delay`."
    },
    {
      name: "show-delay",
      group: "behaviour",
      kind: "number",
      default: 50,
      description: "`hover`:  ms before it shows."
    },
    {
      name: "hide-delay",
      group: "appearance",
      kind: "number",
      default: 70,
      description: "`hover`:  ms before it hides."
    },
    {
      name: "target",
      group: "behaviour",
      kind: "json",
      reflect: false,
      description: "The target as a PROPERTY (an `Element`);  wins over `for`."
    }
  ],
  events: [
    {
      name: "ui-open",
      detail: "{ visible: true, originalEvent?: Event }",
      cancelable: true,
      description:
        "About to show for a person's action (the trigger, an invoker command);  `preventDefault()` keeps it hidden."
    },
    {
      name: "ui-close",
      detail: "{ visible: false, originalEvent?: Event }",
      cancelable: true,
      description:
        "About to hide;  `preventDefault()` keeps it shown.  NOT cancelable in effect when the browser already " +
        "dismissed a `hint` popover (Escape, a click elsewhere)."
    }
  ],
  slots: [{ name: "", description: "Content:  text, `<ui-header>` / `<ui-content>` parts, a grid, controls." }],
  parts: [
    { name: "popup", description: "The popup box (its arrow is `::before`)." },
    { name: "header", description: "The `header` shorthand." },
    { name: "content", description: "The `content` shorthand." }
  ],
  states: [{ name: "fluid", description: "As wide as its target (`fluid`)." }],
  texts: [],
  ownsParts: ["header", "content"]
} as const satisfies E.ComponentVocabulary
