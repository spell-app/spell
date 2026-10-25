/**
 * The English vocabulary of `<ui-item>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), slots, parts and states.
 *   The shape is `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - ONE generic item, as Fomantic's `.item` is shared by dropdown, list and menu:  it renders by OWNER
 *   (`PartContext`), never `ui-list-item` / `ui-menu-item`.  See `notes/grammar.md`, "Items".
 * - Class words come out through `ClassBuilder`, no `ui`:
 *   `<ui-item color="red" selected appearance="link">` => `red active link item` -- the owner's sheet (`UIList.css`,
 *   `UIMenu.css`) styles them by context.
 * - Attributes name what ANY owner needs;  each description says who reads it.
 * - `ownsParts`:  CONDITIONAL (`ConditionalOwner`) -- the item owns them only in the Items view (`<ui-items>`);
 *   in a list or menu they see through it to their owner.
 */

import type { E } from "spell-ui/core"

/****************
 * ### `itemVocabulary`
 * The names of `<ui-item>`, one item of a dropdown (data), list, menu or Items view (a rendered `.item`).
 ****************/
export const itemVocabulary = {
  tag: "ui-item",
  topics: ["lists", "content parts", "data display", "views"],
  aka: ["list item", "media object", "row"],
  noun: "item",
  ui: false,
  description: "An item of a dropdown, list, menu or Items view.",
  attributes: [
    {
      name: "color",
      group: "appearance",
      kind: "color",
      description: "Menu:  hue of the item while selected (`red active item`)."
    },
    {
      name: "position",
      group: "layout",
      kind: "valueOnly",
      values: ["left", "right"],
      description: "Menu:  `right` pushes the item (and what follows) to the far end."
    },
    {
      name: "value",
      group: "form",
      kind: "string",
      description: "Value;  defaults to `label`.  Ordered list:  shown as the marker."
    },
    {
      name: "label",
      group: "name",
      kind: "string",
      replaces: ["text"],
      description: "Dropdown:  its words;  defaults to the text content.  Its old name was `text`."
    },
    {
      name: "description",
      group: "content",
      kind: "string",
      description: "Dropdown:  secondary text, shown at the end."
    },
    { name: "icon", group: "content", kind: "icon", description: "Icon name, shown before the text." },
    {
      name: "image",
      group: "content",
      kind: "string",
      description: "Image URL, shown before the text:  an avatar in a list, the item's picture in the Items view."
    },
    {
      name: "flag",
      group: "content",
      kind: "string",
      description: "Dropdown:  country code, shown as a flag before the text."
    },
    {
      name: "link",
      group: "link",
      kind: "string",
      replaces: ["href"],
      description: "List / menu:  where it goes:  renders a link (`<a>`).  Its old name was `href`."
    },
    { name: "target", group: "link", kind: "string", description: "Link target, with `link`." },
    {
      name: "appearance",
      group: "appearance",
      kind: "multiple",
      values: ["link"],
      // its words are Fomantic's classes as they are
      classes: {},
      replaces: [{ from: "link", value: "link" }],
      description:
        "The look:  `link` -- list / menu:  interactive without a `link`, a `<button>` with the link hover.  " +
        "Its old name was the bare `link` switch."
    },
    { name: "disabled", group: "states", kind: "keyOnly", description: "Can't be chosen or followed." },
    {
      name: "selected",
      group: "states",
      kind: "keyOnly",
      key: "active",
      description:
        "Chosen:  the dropdown's value, the list's / menu's current item (`aria-current`).  Alias:  `active`.  " +
        "NOTE: Fomantic's word for it is `active`;  its `selected` means highlighted."
    },
    {
      name: "padding",
      group: "layout",
      kind: "valueOnly",
      values: ["none", "none-x", "none-y"],
      classes: { none: "fitted", "none-x": "horizontally fitted", "none-y": "vertically fitted" },
      replaces: [{ from: "fitted", value: "none", values: { horizontally: "none-x", vertically: "none-y" } }],
      description:
        "Menu:  `none`, no padding;  `none-x` / `none-y` drop only the left and right, or top and bottom.  " +
        "Its old name was `fitted` (`horizontally`, `vertically`)."
    },
    {
      name: "kind",
      group: "content",
      kind: "enum",
      values: ["item", "header", "divider"],
      default: "item",
      replaces: ["type"],
      description:
        "An item, a group `header` (dropdown, menu), or a `divider` line (dropdown).  Its old name was `type`."
    }
  ],
  events: [],
  slots: [
    {
      name: "",
      description: "Content:  text, `<ui-icon>`, `<ui-content>` (header, description), a nested list / menu."
    },
    { name: "icon", description: "List / menu:  replaces the `icon` shorthand's glyph." }
  ],
  parts: [
    { name: "item", description: "List / menu:  the item box (`<a>`, `<button>` or `<div>`)." },
    { name: "icon", description: "List / menu:  the icon box of the `icon` shorthand." },
    { name: "image", description: "List / menu:  the `<img>` of the `image` shorthand." }
  ],
  states: [
    { name: "selected", description: "Chosen (`selected` or `active`)." },
    { name: "disabled", description: "Can't be chosen." }
  ],
  texts: [],
  ownsParts: ["content", "header", "meta", "description", "extra", "avatar"]
} as const satisfies E.ComponentVocabulary
