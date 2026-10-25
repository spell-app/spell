/**
 * Every name `<ui-tabs>` and `<ui-tab>` use:  tags, attributes (kind + allowed values), events, slots, parts,
 * states, texts.  Schema:  `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - Fomantic's words:  a `.ui.tab` is a PANE (`<div class="ui bottom attached tab segment" data-tab>`);
 *   the tabs you click are the items of a `tabular` (or `pointing` / `secondary` / `text`) MENU.
 *   So `<ui-tab>` is the pane, and `<ui-tabs>` draws the menu from its panes' `label`s, with `UIMenu.css`.
 * - Class words come out through `ClassBuilder`:
 *   - `<ui-tabs appearance="tabular" attach="top" size="small">` => the root `ui small tabular top attached tabs`
 *     and its tab list `ui small tabular top attached menu` (the same words, Fomantic's noun `menu`)
 *   - `<ui-tab>` in those tabs => `ui active bottom attached tab segment`
 *     (the menu's opposite edge;  `active` while selected)
 * - `selected` is the canonical chosen state (`active`, Fomantic's word, is an alias);
 *   the chosen pane is the tabs' `value`.
 * - The tab list's look is the menu's `appearance` (`UIT.MenuAppearances`:  `tabular`, `pointing`, `secondary`,
 *   `text`, `segmented`), several words at once;  the older booleans are its old names (epic `ui-gaps` P4).
 *   Its `basic` word is the PANES' look.  `align` and `equal` place and size the tabs, as on `<ui-menu>`.
 */

import type { E } from "spell-ui/core"
import * as UIT from "spell-ui/components/components.types"

/****************
 * ### `<ui-tabs>`
 * A tab set:  `<div class="ui ... tabs" part="tabs">` holding a `role="tablist"` menu of `<button role="tab">`s
 * (one per `<ui-tab>` pane) and the panes' slot.
 ****************/
export const tabsVocabulary = {
  tag: "ui-tabs",
  topics: ["navigation", "menus", "containers", "modules"],
  aka: ["tab bar", "tab strip", "tabbed panel", "tab view"],
  skeleton: "medium line, 3 line paragraph",
  noun: "tabs",
  description: "A tab is a hidden section of content activated by a menu.",
  attributes: [
    {
      name: "size",
      group: "appearance",
      kind: "size",
      description: "Size of the tab menu, `mini` ... `massive`;  `medium` is the default."
    },
    {
      name: "color",
      group: "appearance",
      kind: "color",
      description: "Hue of the selected tab (`segmented`:  its fill;  default the primary colour)."
    },
    {
      name: "appearance",
      group: "appearance",
      kind: "multiple",
      values: [...UIT.MenuAppearances, "basic"],
      // its words are Fomantic's classes as they are
      classes: {},
      replaces: ["tabular", "pointing", "secondary", "text", "basic"].map((word) => ({ from: word, value: word })),
      description:
        "The look, several words at once:  the tab list's, as `<ui-menu appearance>` -- `tabular` (file-folder " +
        "tabs), `pointing` (the selected tab points at its pane;  an underline with `secondary`), `secondary` " +
        "(no box), `text` (plain words), `segmented` (a bordered group of joined tabs, the selected one filled:  a " +
        "segmented control);  and the panes' -- `basic` (no segment box:  no border, no shadow).  Old names:  the " +
        "bare switches `tabular`, `pointing`, `secondary`, `text`, `basic`."
    },
    {
      name: "inverted",
      group: "appearance",
      kind: "keyOnly",
      description: "The dark scheme for the tabs and the panes."
    },
    {
      name: "direction",
      group: "layout",
      kind: "valueOnly",
      values: ["horizontal", "vertical"],
      classes: { horizontal: "" },
      replaces: [{ from: "vertical", value: "vertical" }],
      description:
        "Which way the tabs run:  `horizontal` (the default), or `vertical`, stacked in a column beside the panes " +
        "(ArrowUp / ArrowDown move between them).  Its old name was the bare `vertical` switch."
    },
    {
      name: "fluid",
      group: "layout",
      kind: "keyOnly",
      description: "The tab menu takes the full width (or, vertical, its column's)."
    },
    {
      name: "padding",
      group: "layout",
      kind: "valueOnly",
      values: ["compact"],
      replaces: [{ from: "compact", value: "compact" }],
      description:
        "`compact`:  the tab menu is only as wide as its tabs (Fomantic's `compact` menu).  Old name:  `compact`."
    },
    {
      name: "align",
      group: "layout",
      kind: "valueAndKey",
      key: "aligned",
      values: UIT.ItemAlignments,
      replaces: ["alignment"],
      description:
        "Where the tabs sit:  `fluid` -- they fill the row;  `left` / `center` / `right` -- packed at that end (a " +
        '`segmented` tab list moves as a whole).  Ignored when `direction="vertical"`.  Its old name was `alignment`.'
    },
    {
      name: "equal",
      group: "layout",
      kind: "keyOnly",
      description:
        'Every tab the same width, from the tabs themselves (no count):  with `align="fluid"` an equal share ' +
        "of the row each;  otherwise each as wide as the widest."
    },
    {
      name: "attach",
      group: "layout",
      kind: "valueOnly",
      values: ["top", "bottom"],
      classes: { top: "top attached", bottom: "bottom attached" },
      replaces: [{ from: "attached", value: "top" }],
      description:
        "Joins the tab menu and the panes edge to edge:  `top` puts the tabs above (`top attached` menu, " +
        "`bottom attached` panes);  `bottom` puts them below.  Its old name was `attached` (bare ~== `top`)."
    },
    {
      name: "value",
      group: "form",
      kind: "string",
      description:
        "Value of the selected pane (its `value`, else its index).  Controlled:  set it to switch panes;  " +
        "`ui-changing` can veto a person's changes.  Without it, the first `selected` pane, else the first enabled one."
    },
    {
      name: "activation",
      group: "behaviour",
      kind: "enum",
      values: ["automatic", "manual"],
      default: "automatic",
      description:
        "`automatic`:  moving focus with the arrow keys selects the tab (APG's default).  `manual`:  arrows only " +
        "move focus;  Enter / Space select."
    },
    {
      name: "history",
      group: "advanced",
      kind: "boolean",
      description:
        "Mirror the selected pane in the URL hash (`#value`):  selecting pushes a history entry, Back / Forward and " +
        "links to `#value` select the pane, and a page opened on `#value` starts there."
    }
  ],
  events: [
    {
      name: "ui-changing",
      detail: "{ value: string, tab: Element, originalEvent?: Event }",
      cancelable: true,
      description:
        "A pane is about to be selected (click, key, or the URL hash with `history`);  `preventDefault()` keeps the " +
        "current one."
    },
    {
      name: "ui-changed",
      detail: "{ value: string, tab: Element, originalEvent?: Event }",
      description: "A pane was selected:  after `ui-changing`, unless it was cancelled."
    }
  ],
  slots: [{ name: "", description: "`<ui-tab>` panes;  each one's `label` becomes a tab." }],
  parts: [
    { name: "tabs", description: "The whole tab set:  menu and panes." },
    { name: "menu", description: "The tab list (`role=tablist`), a menu in the class grammar." },
    { name: "tab", description: 'One tab (`<button role=tab class="item">`).' },
    { name: "icon", description: "A tab's icon, from its pane's `icon`." }
  ],
  states: [{ name: "vertical", description: 'Tabs in a column (`direction="vertical"`).' }],
  texts: [],
  ownsParts: ["tab"]
} as const satisfies E.ComponentVocabulary
