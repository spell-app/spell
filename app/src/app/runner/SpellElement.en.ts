/**
 * Every name a view's element starts with:  its tag (set per type), attributes, events, texts.
 * Schema:  `E.ComponentVocabulary` (`spell/ui/core`).
 * - Each view template gets its own copy, with its own tag, e.g. `solitaire-card` -- see `SpellElement.defineFor()`.
 * - Pure data:  `import type` only.
 */

import type { E } from "spell/element"

/****************
 * ### `<spell-element>`
 * A view, drawn in its own element:  `<solitaire-card>` for a card in a solitaire app.
 * Never defined by this tag:  each view template's element copies these names, under its own tag.
 ****************/
export const spellElementVocabulary = {
  tag: "spell-element",
  topics: ["views"],
  aka: ["web component", "custom element", "view"],
  noun: "view",
  ui: false,
  description:
    "A spell thing drawn in its own element, with its own shadow root, styles and error boundary:  `a card is a " +
    "view` in a solitaire app is drawn as `<solitaire-card>`.",
  attributes: [
    {
      name: "thing",
      kind: "json",
      description:
        "The thing it draws:  set by the program that draws it, e.g. `draw the card`.  " +
        'A tag written in markup names the program\'s thing by its `id` instead:  `<solitaire-tableau id="T1">`.'
    },
    {
      name: "move-delay",
      kind: "number",
      description:
        "A list people may reorder (`its items can be reordered`):  how many seconds the pointer rests on a place " +
        "before the dragged items move there, in place of what its type says."
    }
  ],
  // a drag's page events (epic `language` P67):  named in the program's language by core's messages
  // (`ui-dragged-over`, Spanish `arrastrado-sobre`), never cancelable
  events: [
    {
      name: "ui-dragged-over",
      detail: "{ thing: object, list: object, x: number, y: number }",
      description:
        "A thing is dragged over this list:  as it comes over, then while it moves, at most every 100ms.  " +
        "`thing` and `list` are the program's things, `x` and `y` where the pointer is."
    },
    {
      name: "ui-dragged-out",
      detail: "{ thing: object, list: object }",
      description: "The thing left this list, or was dropped on it and not taken."
    },
    {
      name: "ui-dropped",
      detail: "{ thing: object, list: object }",
      description: "The thing was dropped on this list, and the list took it."
    },
    {
      name: "ui-file-dragged-over",
      detail: '{ count: number, kinds: string[], via: "drop", x: number, y: number }',
      description:
        "Files from the desktop are dragged over a view with a file line (`when a file is dropped on it:`):  " +
        "how many, and their kinds;  again while they move, at most every 100ms."
    },
    {
      name: "ui-file-dragged-out",
      detail: '{ count: number, kinds: string[], via: "drop" }',
      description: "The files left without being dropped."
    },
    {
      name: "ui-file-dropped",
      detail:
        '{ file: File, name: string, path: string, size: number, type: string, lastModified: number, via: "drop", entry?: FileSystemEntry, handle?: FileSystemHandle }',
      description: "A file was dropped on the view:  the same detail as `<ui-uploader>`'s, one event per file."
    },
    {
      name: "ui-folder-dropped",
      detail:
        '{ name: string, path: string, files: File[], via: "drop", entry?: FileSystemEntry, handle?: FileSystemHandle }',
      description: "A folder was dropped on the view:  a `ui-file-dropped` follows for each file in it."
    }
  ],
  slots: [],
  parts: [
    {
      name: "menu-bar",
      description: "An app's menu bar, above its drawing:  the menu its template names (`- its menu bar is ...`)."
    },
    {
      name: "drop-line",
      description: "The line showing where dragged items would go, in a list people may reorder."
    }
  ],
  states: [],
  texts: []
} as const satisfies E.ComponentVocabulary
