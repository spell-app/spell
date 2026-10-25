/**
 * Every name `<epic-mark>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell-epic/definitions"

/****************
 * ### `<epic-mark>`
 * An item's id as a chip in the item's state colour (`I126`), on the page that holds the item (epic `epic-engine` P45).
 ****************/
export const epicMarkVocabulary = {
  tag: "epic-mark",
  topics: ["documentation", "text", "navigation"],
  aka: ["mark", "item mark", "id chip", "item reference", "to review"],
  noun: "mark",
  ui: false,
  description:
    "An item's id as a chip, in the colour of the item's state:  `<epic-mark item=\"i126\" link>` draws `I126`, red " +
    "while it waits on Owen, green when it's newly decided, grey once it's old (the same rule as the item's own chip, " +
    "`ItemAge`).  The item's title is its tooltip;  with `link`, a click lands on the item.  The tool writes them in a " +
    'phase\'s To review field (Owen, 2026-10-25:  "`<epic-mark link>` for rendering the I126 mark").',
  attributes: [
    {
      name: "item",
      kind: "string",
      required: true,
      format: "anchor",
      description: "The item's id on this page, any case (`i126`, `Q3`):  drawn in capitals."
    },
    {
      name: "link",
      kind: "boolean",
      description: "A link that lands on the item, opening it;  without it, the chip alone."
    }
  ],
  events: [],
  slots: [],
  parts: [
    { name: "base", description: "The chip:  an `<a>` with `link`, else a `<span>`." },
    { name: "id", description: "The item's id, in capitals." }
  ],
  states: [{ name: "missing", description: "No item with that id on the page (yet):  the chip in the accent colour." }],
  texts: [{ key: "missing", text: "Not on this page:  {id}", description: "The tooltip of a mark with no item." }],
  children: [],
  flow: true
} as const satisfies EpicVocabulary
