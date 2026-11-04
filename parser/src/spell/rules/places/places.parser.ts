/**
 * The `places` rule module's parser:  each of its rule files registers on it (`places.addRule()`),
 * and `rules/index.ts` combines it into `spellParser`.
 * - A file of its own, so a rule file can import it without importing its siblings.
 */
// Import directly to avoid circular import
import { SpellParser } from "spell/parser/spell/SpellParser"

/** Rule module for where data lives:  a place's line, a type saved there, and the words only a saved type has. */
export const places = new SpellParser({ module: "places" })
