/**
 * The English vocabulary of `<ui-keys>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), slots, parts, states and texts.
 *   The shape is `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - Key caps for a keyboard shortcut (epic `ui-gaps` P9):  `<ui-keys shortcut="mod+S">` shows ⌘S on a Mac,
 *   Ctrl S elsewhere.
 * - `mod` (or `modifier`) is ⌘ on a Mac and Ctrl elsewhere, as the runtime's `Chord` reads it;
 *   `meta` is the Meta key itself (Owen, 2026-10-25).
 * - The texts:  what a screen reader says for each modifier, and the words of the caps a keyboard prints no symbol
 *   for (off a Mac:  Ctrl, Shift ...;  the space bar everywhere), `keyCapTexts`, which `<ui-action>` shares.
 */

import type { E } from "spell-ui/core"

/**
 * The words of the key caps a keyboard prints no symbol for:  every modifier and named key off a Mac, the space bar
 * everywhere (`UIKeys.capsOf()`).
 * - Spread into the texts of both tags that draw caps, `<ui-keys>` and `<ui-action>`:  each translates its own.
 */
export const keyCapTexts = [
  { key: "keyControl", text: "Ctrl", description: "The Control key's cap, away from a Mac." },
  { key: "keyShift", text: "Shift", description: "The Shift key's cap, away from a Mac." },
  { key: "keyAlt", text: "Alt", description: "The Alt key's cap, away from a Mac." },
  { key: "keyMeta", text: "Meta", description: "The Meta key's cap, away from a Mac." },
  { key: "keyEnter", text: "Enter", description: "The Enter key's cap, away from a Mac." },
  { key: "keyEscape", text: "Esc", description: "The Escape key's cap, away from a Mac." },
  { key: "keyTab", text: "Tab", description: "The Tab key's cap, away from a Mac." },
  { key: "keyBackspace", text: "Backspace", description: "The Backspace key's cap, away from a Mac." },
  { key: "keyDelete", text: "Del", description: "The Delete key's cap, away from a Mac." },
  { key: "keySpace", text: "Space", description: "The space bar's cap." }
] as const

/** One of `keyCapTexts`' keys:  `keyShift`. */
export type KeyCapText = (typeof keyCapTexts)[number]["key"]

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
    { key: "or", text: "or", description: "Between two shortcuts, as a screen reader says them." },
    ...keyCapTexts
  ]
} as const satisfies E.ComponentVocabulary
