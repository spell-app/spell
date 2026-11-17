/**
 * The English vocabulary of `<ui-submenu>`:  every name the tag uses.
 * The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - A row of a menu, as `<ui-item>` is (the same noun, `item`, so its menu owns it as one of its items),
 *   that opens a FLY-OUT, a menu beside it.
 * - Its names are `<ui-item>`'s where they mean the same:
 *   `label` (its words), `icon`, `disabled`, the `icon` slot, the `item`, `icon` and `title` parts.
 * - Its own:
 *   - `menu`, the id of a menu elsewhere on the page to show as its fly-out
 *   - `split`:  its title chooses, as a plain item's does;  only its chevron end opens the fly-out
 *     (`value`, what the choice reports;  its `label` by default)
 *   - `flyout-label`, the fly-out's own name, and a split row's chevron tooltip
 *   - the `chevron` and `flyout` parts
 *   - the `open` state
 */

import type { E } from "spell/ui/core"

/****************
 * ### `submenuVocabulary`
 * The names of `<ui-submenu>`, a menu's row opening a fly-out beside it:  its label, its icon and a chevron;
 * the fly-out holds the items written inside it, or the menu its `menu` names.
 ****************/
export const submenuVocabulary = {
  tag: "ui-submenu",
  icon: "caret right",
  // no snippet:  a row only inside a menu, never offered on its own
  topics: ["menus", "navigation"],
  aka: ["submenu", "flyout menu", "cascading menu", "nested menu", "menu item with submenu"],
  skeleton: "inline 8 x 2.5",
  noun: "item",
  partOfSpeech: "structure",
  ui: false,
  description: "A menu's row that opens another menu beside it:  its fly-out.",
  attributes: [
    {
      name: "label",
      group: "name",
      kind: "string",
      description:
        "The row's words, its title.  As `<ui-item>`'s `label`:  an attribute, since what's written inside is the " +
        "fly-out's items."
    },
    {
      name: "icon",
      group: "content",
      kind: "icon",
      description:
        "Icon name:  where the menu's items show theirs (its icon column, or after the words in a vertical menu)."
    },
    {
      name: "menu",
      group: "content",
      kind: "string",
      description:
        "Id of a `<ui-menu>` elsewhere on the page to show as the fly-out, in place of the items inside.  It stays " +
        "where it is, shown beside the row while open;  write `popover` on it, so it's hidden until then."
    },
    {
      name: "flyout-label",
      group: "name",
      kind: "string",
      description:
        "The fly-out's own name, when it isn't the row's `label`:  its menu's name for a screen reader, and with " +
        '`split` the chevron end\'s tooltip ("Pick one of the parts under the mouse").  Default:  its `label`.'
    },
    {
      name: "value",
      group: "behaviour",
      kind: "string",
      description:
        "With `split`:  what its menu's `ui-choosing` reports when its title is chosen.  Default:  its `label`."
    },
    {
      name: "split",
      group: "behaviour",
      kind: "keyOnly",
      description:
        "Two things in one row:  its title is a plain item, which a click, Enter or Space chooses (the menu's " +
        "`ui-choosing`, as any item's);  its chevron end, set off by a faint line, opens the fly-out, by the " +
        "pointer, a click or the arrow key toward it."
    },
    { name: "disabled", group: "states", kind: "keyOnly", description: "Can't be opened." }
  ],
  events: [],
  slots: [
    {
      name: "",
      description:
        "The fly-out's items:  `<ui-item>`s, dividers, headers, other `<ui-submenu>`s.  No `<ui-menu>` needed."
    },
    { name: "icon", description: "Replaces the `icon` shorthand's glyph." }
  ],
  parts: [
    { name: "item", description: "The row:  a `<button>`, `aria-haspopup=menu`." },
    { name: "icon", description: "The row's icon box." },
    { name: "title", description: "The row's label." },
    {
      name: "chevron",
      description: "The chevron at the row's end, pointing to the fly-out;  with `split`, what opens it."
    },
    {
      name: "flyout",
      description: "The fly-out's box, beside the row in the top layer, around the menu of the items inside."
    }
  ],
  states: [
    { name: "open", description: "Its fly-out is showing." },
    { name: "split", description: "Its title chooses;  its chevron end opens the fly-out (`split`)." },
    { name: "disabled", description: "Can't be opened." }
  ],
  texts: []
} as const satisfies E.ComponentVocabulary
