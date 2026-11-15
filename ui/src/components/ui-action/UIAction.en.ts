/**
 * The English vocabulary of `<ui-action>`:  `<ui-item>`'s, under the action's own tag, with the action it draws.
 * The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - Built ON the item's:  the same attributes, slots and states, so a menu or toolbar draws it as one of its items
 *   (the same noun, `item`).
 * - Its own:  the `action` it draws (a property), its `shortcut` and the key caps that show it, and the words of
 *   the caps with no symbol:  `<ui-keys>`' (`keyCapTexts`), as it draws its caps through `<ui-keys>`' table.
 */

import type { E } from "spell/ui/core"
import { itemVocabulary } from "spell/ui/components/ui-item/UIItem.en"
import { keyCapTexts } from "spell/ui/components/ui-keys/UIKeys.en"

/****************
 * ### `actionVocabulary`
 * The names of `<ui-action>`, an action:  a menu item or toolbar button drawn from something a program can do --
 * its title, icon and shortcut keys, greyed while it can't be done, ticked while it's on.
 ****************/
export const actionVocabulary = {
  ...itemVocabulary,
  tag: "ui-action",
  partOfSpeech: "action",
  icon: "play",
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
        "Its keys, drawn as key caps at the end, as `<ui-keys>` draws them:  `mod+T` is ⌘T on a Mac, Ctrl+T " +
        "elsewhere;  `meta` is the Meta key.  " +
        "Defaults to the action's."
    },
    {
      name: "icon-only",
      group: "appearance",
      kind: "keyOnly",
      description:
        "Only its icon, at every width:  its title is its tooltip and its name for a screen reader, and its row in " +
        "a `shrinkable` menu's `…` menu.  " +
        "In a vertical menu, icon-only actions side by side share one row (Undo and Redo).  " +
        "No icon:  its title shows."
    }
  ],
  parts: [
    ...itemVocabulary.parts,
    { name: "shortcut", description: "The key caps of its shortcut, at the end:  a `<kbd>` each." }
  ],
  states: [
    ...itemVocabulary.states,
    { name: "icon-only", description: "`icon-only`, with an icon:  its icon alone, its title hidden." }
  ],
  texts: [...keyCapTexts]
} as const satisfies E.ComponentVocabulary
