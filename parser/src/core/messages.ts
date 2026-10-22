/**
 * `core.message()`:  what the core says to the person running a program, in the program's language (epic `spanish` P12).
 * - English is built in (`CORE_MESSAGES`);  another language's words come from the project's words file,
 *   e.g. `cartas.es.js`'s `messages`, which the runner hands `core.useMessages()` before the program runs.
 * - A key the words don't have, or no words at all:  English.
 * - Part of `core`:  imported by `spell-lang/core`'s barrel (and `spell-lang/core/model`) for its side effect.
 * - Python's twin is `spell_core.messages`.
 */
import { core } from "./core"
import { CORE_MESSAGES, defineCoreModule, type CoreMessageKey } from "./core.types"

export const messageMethods = defineCoreModule({
  /** The running program's words for the core's messages, by key:  `undefined` for English -- see `useMessages()`. */
  _messages: undefined as Partial<Record<string, string>> | undefined,

  /**
   * Speak the program's language:  `messages` from its words file (`words.messages`), by key.
   * - `undefined`:  back to English, e.g. for the next program.
   * - A runner calls it before each run, as a program's tests print as it loads.
   */
  useMessages(messages?: Partial<Record<string, string>>): void {
    core._messages = messages
  },

  /**
   * Message `key` in the program's language, each `{name}` in it filled with `values.name`:
   * `core.message("cant-draw", { type: "Card" })` => `⚠ Card can't draw`.
   * - English when the program's words have no such key -- see `useMessages()`.
   * - A placeholder with no value stays as written:  `{type}`.
   */
  message(key: CoreMessageKey, values: Record<string, unknown> = {}): string {
    const template = core._messages?.[key] ?? CORE_MESSAGES[key]
    return template.replace(PLACEHOLDER, (whole, name: string) => (name in values ? String(values[name]) : whole))
  }
})
Object.assign(core, messageMethods)

/** A named placeholder in a message, `{type}`. */
const PLACEHOLDER = /\{(\w+)\}/g
