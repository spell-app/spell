/**
 * The English vocabulary of `<ui-keys>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), slots, parts, states and texts.
 *   The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - Key caps for a keyboard shortcut (epic `ui-gaps` P9):  `<ui-keys shortcut="mod+S">` shows ⌘S on a Mac,
 *   Ctrl S elsewhere.
 * - `mod` (or `modifier`) is ⌘ on a Mac and Ctrl elsewhere, as the runtime's `Chord` reads it;
 *   `meta` is the Meta key itself (Owen, 2026-10-25).
 * - The texts are what a screen reader says for each modifier:  the caps themselves are symbols.
 */

import type { E } from "spell/ui/core"

/****************
 * ### `keysVocabulary`
 * The names of `<ui-keys>`:  `<kbd class="ui keys" part="keys">` of a `<kbd part="key">` per key.
 ****************/
export const keysVocabulary = {
  tag: "ui-keys",
  topics: ["text", "typography"],
  aka: ["kbd", "keyboard shortcut", "key caps", "hotkey", "accelerator"],
  noun: "keys",
  description: "Keys show a keyboard shortcut as key caps, the way the reader's own keyboard writes it.",
  attributes: [
    {
      name: "shortcut",
      group: "content",
      kind: "string",
      description:
        'The keys, joined by `+`:  `"mod+S"`, `"shift+mod+P"`, `"escape"`.  `mod` is ⌘ on a Mac and Ctrl ' +
        "elsewhere;  `ctrl`, `alt` (Option), `shift` and `meta` are those keys.  Two shortcuts, a space apart, " +
        "show both."
    },
    {
      name: "platform",
      group: "advanced",
      kind: "enum",
      values: ["auto", "apple", "other"],
      default: "auto",
      description: "Whose keys to draw:  the reader's own (`auto`), a Mac's (`apple`) or everyone else's (`other`)."
    }
  ],
  events: [],
  slots: [],
  parts: [
    { name: "keys", description: "The whole shortcut (`<kbd>`)." },
    { name: "key", description: "One key cap (`<kbd>`)." }
  ],
  states: [],
  texts: [
    { key: "command", text: "Command", description: "What a screen reader says for ⌘." },
    { key: "control", text: "Control", description: "What a screen reader says for Ctrl." },
    { key: "option", text: "Option", description: "What a screen reader says for ⌥ (Alt on a Mac)." },
    { key: "alt", text: "Alt", description: "What a screen reader says for Alt." },
    { key: "shift", text: "Shift", description: "What a screen reader says for Shift." },
    { key: "meta", text: "Meta", description: "What a screen reader says for the Meta key, off a Mac." },
    { key: "or", text: "or", description: "Between two shortcuts, as a screen reader says them." }
  ]
} as const satisfies E.ComponentVocabulary
