/**
 * The English vocabulary of `<ui-action>`:  `<ui-item>`'s, under the action's own tag, with the action it draws.
 * The shape is `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - Built ON the item's:  the same attributes, slots and states, so a menu or toolbar draws it as one of its items
 *   (the same noun, `item`).
 * - Its own:  the `action` it draws (a property), its `shortcut` and the key caps that show it, and the names of
 *   the keys that aren't letters.
 */

import type { E } from "spell-ui/core"
import { itemVocabulary } from "spell-ui/components/ui-item/UIItem.en"

/****************
 * ### `actionVocabulary`
 * The names of `<ui-action>`, an action:  a menu item or toolbar button drawn from something a program can do --
 * its title, icon and shortcut keys, greyed while it can't be done, ticked while it's on.
 ****************/
export const actionVocabulary = {
  ...itemVocabulary,
  tag: "ui-action",
  topics: ["menus", "buttons", "controls"],
  aka: ["action", "command", "menu item", "toolbar button", "context menu item", "keyboard shortcut"],
  skeleton: "inline 8 x 2.5",
  description: "A menu item or toolbar button drawn from an action:  its title, icon and shortcut keys.",
  attributes: [
    ...itemVocabulary.attributes,
    {
      name: "action",
      group: "behaviour",
      kind: "json",
      reflect: false,
      description:
        "PROPERTY:  the action it draws and runs:  `{ title, icon?, shortcut?, isEnabled, isSelected, run() }`, " +
        "read live.  Spell's `core.menuOf()` gives a menu's."
    },
    {
      name: "shortcut",
      group: "content",
      kind: "string",
      description:
        "Its keys, drawn as key caps at the end:  `meta+T` is ⌘T on a Mac, Ctrl+T elsewhere.  " +
        "Defaults to the action's."
    }
  ],
  parts: [
    ...itemVocabulary.parts,
    { name: "shortcut", description: "The key caps of its shortcut, at the end:  a `<kbd>` each." }
  ],
  texts: [
    { key: "keyControl", text: "Ctrl", description: "The Control key's cap, away from a Mac." },
    { key: "keyShift", text: "Shift", description: "The Shift key's cap, away from a Mac." },
    { key: "keyAlt", text: "Alt", description: "The Alt key's cap, away from a Mac." },
    { key: "keySpace", text: "Space", description: "The space bar's cap." }
  ]
} as const satisfies E.ComponentVocabulary
