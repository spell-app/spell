/**
 * The English vocabulary of `<ui-menu>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), events, slots, parts, states and texts.
 *   The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - Pure data:  node imports it (`yarn site:data`, `yarn gen:root`), so `spell/ui/core` for types only,
 *   `UIT` by value straight from `components.types`.
 * - Class words come out through `ClassBuilder`, in Fomantic's grammar:
 *   `<ui-menu appearance="secondary pointing" size="large" items="3">` => `ui large three item secondary pointing menu`.
 *   `UIMenu.css` keys on those words.
 * - Items are the generic `<ui-item>` (`spell/ui/components/ui-item`), styled by owner context:  `ownsParts` has `item`.
 *   A `<ui-menu>` inside a menu is a SUB-MENU (Fomantic's `<div class="right menu">`), so `menu` is owned too;
 *   a `<ui-header>` inside an item is a vertical menu's sub header.
 * - `tabular` is Fomantic's classic word;  2.9 renamed it `tabbed` (`@variationMenuTabbedLegacyTabular`).
 * - The look is `appearance`, several words at once (`UIT.MenuAppearances`, shared with `<ui-tabs>`, plus `link` and
 *   `borderless`);  the older booleans (`tabular`, `pointing`, `secondary`, `text`, `link`, `borderless`) are its
 *   old names (`replaces`, epic `ui-gaps` P4), and draw the same class words.
 * - Item layout:  `align` (`UIT.ItemAlignments`;  its old name `alignment`) places the items, `equal` sizes them alike
 *   from the items themselves;  `items="3"` / `items="equal"` stay as the older count-based aliases.
 * - `shrinkable` fits the items' titles to the row (`TitleFit`, epic `ui-gaps` P13):  cut, then icons only, then one
 *   overflow button;  its slot, parts, states and text are its own.
 */

import type { E } from "spell/ui/core"
import * as UIT from "spell/ui/components/components.types"

/****************
 * ### `menuVocabulary`
 * The names of `<ui-menu>`, a menu:  a `<nav>` of items (links) by default,
 * a `role="menubar"` with roving focus when `interactive`,
 * or a sub-menu `<div class="right menu">` inside another menu.
 ****************/
export const menuVocabulary = {
  tag: "ui-menu",
  // a segmented menu with a `name` is a native form's field too (epic `debut` J166)
  formControl: true,
  topics: ["menus", "navigation", "basic", "collections"],
  aka: ["navbar", "nav", "tabs bar", "toolbar", "sidebar menu", "pagination"],
  skeleton: "3 tall",
  noun: "menu",
  description: "A menu displays grouped navigation actions.",
  attributes: [
    {
      name: "size",
      group: "appearance",
      kind: "size",
      description: "Size, `mini` ... `massive`;  `medium` is the default."
    },
    {
      name: "color",
      group: "appearance",
      kind: "color",
      description: "Hue of the active item;  with `inverted`, the menu's fill;  `segmented`, the selected item's fill."
    },
    {
      name: "appearance",
      group: "appearance",
      kind: "multiple",
      values: [...UIT.MenuAppearances, "link", "borderless", "header"],
      // its words are Fomantic's classes as they are
      classes: {},
      replaces: [...UIT.MenuAppearances.filter((word) => word !== "segmented"), "link", "borderless"].map((word) => ({
        from: word,
        value: word
      })),
      description:
        "The look, several words at once:  `tabular` (tabs on a rule), `pointing` (the active item points at the " +
        "content;  an underline with `secondary`), `secondary` (no box, rounded items), `text` (plain words), " +
        "`segmented` (a segmented control:  a bordered group of joined items, the selected one filled with `color`, " +
        "else the primary colour;  it moves `selected` to the item chosen itself;  `--ui-menu-segmented-*` restyle " +
        "it as a pill track with a raised thumb), `link` (every item interactive:  a `<button>` with the link " +
        "hover), `borderless` (no dividers between items), `header` (alone:  a whole bar across the top of a window, flat " +
        "and short, 38px and 13px, over a hairline, in the theme's bar;  with `segmented`:  the row of a pane's bar, 13px, " +
        "with no track of its own, the bar behind it being the track, and its items sharing the row's width).  Old names:  the bare switches `tabular`, `pointing`, " +
        "`secondary`, `text`, `link`, `borderless`."
    },
    {
      name: "name",
      group: "form",
      kind: "string",
      description:
        "A `segmented` menu's name in a form:  the form reads its `value` and writes it back, as a select's " +
        "(epic `debut` P31)."
    },
    {
      name: "value",
      group: "form",
      kind: "string",
      description:
        "A `segmented` menu's chosen item, by its `value` (else its text):  setting it selects that item;  " +
        "choosing one sets it, and sends `ui-changed` with `{ value }`."
    },
    {
      name: "choose",
      group: "behaviour",
      kind: "valueOnly",
      values: ["one", "many"],
      classes: { one: "", many: "toggles" },
      description:
        "A `segmented` menu's choice:  `one` (the default) selects the item chosen and unselects the rest;  " +
        "`many` makes each item a toggle, pressed in while selected (`aria-pressed`), with no sliding thumb.  " +
        "One stays on:  turning off the only one on turns on the next, to its right or below (round to the first)."
    },
    {
      name: "position",
      group: "layout",
      kind: "valueOnly",
      values: ["left", "right", "center"],
      description:
        "Sub-menu:  pushes it to the `right` / `left` end, or the `center`.  A `vertical tabular` menu:  `right` " +
        "opens its tabs to the left, for a menu on the content's right (`ui right vertical tabular menu`)."
    },
    {
      name: "direction",
      group: "layout",
      kind: "valueOnly",
      values: ["horizontal", "vertical"],
      classes: { horizontal: "" },
      replaces: [{ from: "vertical", value: "vertical" }],
      description:
        "Which way the items run:  `horizontal` (the default) or `vertical`, stacked top to bottom.  " +
        "Its old name was the bare `vertical` switch."
    },
    { name: "pagination", group: "appearance", kind: "keyOnly", description: "Page links:  compact, centred items." },
    { name: "icon", group: "content", kind: "keyOnly", description: "Icon-only items." },
    {
      name: "labeled",
      group: "appearance",
      kind: "keyOnly",
      key: "labeled icon",
      description: "Labeled icon items:  a large icon above each item's text."
    },
    { name: "fluid", group: "layout", kind: "keyOnly", description: "Takes the full width of its container." },
    { name: "stackable", group: "layout", kind: "keyOnly", description: "Stacks its items on mobile." },
    { name: "centered", group: "layout", kind: "keyOnly", description: "Centred in its container, items centred." },

    {
      name: "wrapping",
      group: "layout",
      kind: "keyOnly",
      description: "Items wrap onto more lines when they don't fit."
    },
    {
      name: "wrap",
      group: "appearance",
      kind: "keyOnly",
      key: "wrapped",
      replaces: ["wrapped"],
      description: "With `wrapping`:  square corners where the lines meet.  Its old name was `wrapped`."
    },
    {
      name: "inverted",
      group: "appearance",
      kind: "keyOnly",
      description: "The dark scheme;  with `color`, filled with the colour."
    },
    {
      name: "padding",
      group: "layout",
      kind: "valueOnly",
      values: ["none", "none-x", "none-y", "compact"],
      classes: { none: "fitted", "none-x": "horizontally fitted", "none-y": "vertically fitted" },
      replaces: [
        { from: "fitted", value: "none", values: { horizontally: "none-x", vertically: "none-y" } },
        { from: "compact", value: "compact" }
      ],
      description:
        "`none`:  no item padding;  `none-x` / `none-y` keep only the top and bottom, or the left and right;  " +
        "`compact`:  only as wide as its items.  Old names:  `fitted` (`horizontally`, `vertically`), `compact`."
    },
    {
      name: "attach",
      group: "layout",
      kind: "valueOnly",
      values: ["both", "top", "bottom"],
      classes: { both: "attached", top: "top attached", bottom: "bottom attached" },
      replaces: [{ from: "attached", value: "both" }],
      description:
        "Joined edge to edge with a segment above (`top`), below (`bottom`), or both (`both`, in the middle).  " +
        "Its old name was `attached`."
    },
    {
      name: "fixed",
      group: "layout",
      kind: "keyOrValueAndKey",
      values: ["top", "bottom", "left", "right"],
      description: "Fixed to an edge of the viewport."
    },
    {
      name: "align",
      group: "layout",
      kind: "valueAndKey",
      key: "aligned",
      values: UIT.ItemAlignments,
      replaces: ["alignment"],
      description:
        "Where the items sit:  `fluid` -- they fill the bar;  `left` / `center` / `right` -- packed at that end of " +
        'a full-width bar (a `segmented` menu moves as a whole).  `align="center"` => `center aligned`.  ' +
        "Its old name was `alignment`."
    },
    {
      name: "equal",
      group: "layout",
      kind: "keyOnly",
      description:
        'Every item the same width, from the items themselves (no count):  with `align="fluid"` each takes an ' +
        "equal share of the bar;  otherwise each is as wide as the widest, packed."
    },
    {
      name: "items",
      group: "content",
      kind: "width",
      widthClass: "item",
      canEqual: true,
      description:
        'Older, count-based alias of `equal`:  divides the width evenly between N items (`items="3"` => ' +
        '`three item`);  `items="equal"` => `equal width` (Fomantic\'s, ~== `equal alignment="fluid"`).'
    },
    {
      name: "shrinkable",
      group: "layout",
      kind: "boolean",
      description:
        "Fits its items' titles to its width:  every title whole while they fit;  then the longest cut first, " +
        "each ending in `…`;  once one would be cut under `--ui-menu-title-min`, icons only (`:state(icons-only)`, " +
        "each title its item's tooltip;  an item with no icon shows its title's first letter);  once a button " +
        "would be under `--ui-menu-item-min`, every item folds into one `…` button whose menu holds them all " +
        "(`:state(overflow)`).  A `segmented` one becomes a dropdown instead (`:state(dropdown)`):  one button " +
        "showing the chosen item.  Items with no words (an icon button) stay as they are.  Off by default."
    },
    {
      name: "interactive",
      group: "behaviour",
      kind: "boolean",
      description:
        "An application menubar (`role=menubar`):  one Tab stop, arrow keys between items, every item a " +
        "`menuitem`.  Default:  a `<nav>` landmark of links."
    }
  ],
  events: [
    {
      name: "ui-choosing",
      detail: "{ value: string, item: Element, originalEvent?: Event }",
      cancelable: true,
      description:
        "An interactive item (a link or button) was activated.  `value` is the item's `value`, else its text.  " +
        "The menu doesn't move `selected` itself, except a `segmented` one (a single-choice control), which " +
        "selects the item and unselects the rest:  `preventDefault()` keeps the old choice."
    },
    {
      name: "ui-changed",
      detail: "{ value?: string, values?: string[] }",
      description:
        "A `segmented` menu's choice changed:  `value`, the item chosen;  a `choose=\"many\"` menu's `values`, the " +
        "items now on, in order (each one's `value`, else its text)."
    },
    {
      name: "ui-form-value",
      detail: "{}",
      description:
        "A `segmented` menu with a `name` is drawn, so it holds a form value now:  a `<ui-form>` around it binds it."
    }
  ],
  slots: [
    { name: "", description: "`<ui-item>`s, sub-menus (`<ui-menu position>`), and other content." },
    {
      name: "overflow",
      description: '`shrinkable`:  what the overflow button shows instead of its `…`, e.g. `<ui-icon name="bars">`.'
    }
  ],
  parts: [
    { name: "menu", description: "The menu box:  `<nav>`, `<div role=menubar>`, or a sub-menu's `<div>`." },
    {
      name: "overflow",
      description:
        "`shrinkable`:  the overflow button, shown once the items fold into it (a `segmented` one's dropdown)."
    },
    { name: "overflow-menu", description: "`shrinkable`:  the overflow button's menu, every item in a row." }
  ],
  states: [
    { name: "interactive", description: "A menubar (`interactive`)." },
    { name: "vertical", description: 'Items stacked (`direction="vertical"`).' },
    { name: "icons-only", description: "`shrinkable`:  the titles are gone, the icons only." },
    { name: "overflow", description: "`shrinkable`:  every item folded into the overflow button." },
    { name: "dropdown", description: "`shrinkable` and `segmented`:  one button showing the chosen item, a dropdown." },
    {
      name: "form-value",
      description: "A `segmented` menu with a `name`:  a form reads and writes its `value`, as a select's."
    }
  ],
  texts: [
    {
      key: "more",
      text: "More",
      description: "`shrinkable`:  the overflow button's accessible name and tooltip, and its menu's name."
    }
  ],
  ownsParts: ["item", "menu", "header"]
} as const satisfies E.ComponentVocabulary
