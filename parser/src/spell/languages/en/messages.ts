/**
 * English's words for what the core says to the person running a program (epic `spanish` P12):
 * the core's own, `CORE_MESSAGES`, as they are.
 * - The core speaks English when a program's words file has no `messages`:
 *   so an English project's words file has none (`SP.SpellWords.of()`).
 */
import { CORE_MESSAGES, type CoreMessages } from "spell-lang/core/core.types"

/** English's messages:  the core's built-in ones. */
export const englishMessages: CoreMessages = CORE_MESSAGES
