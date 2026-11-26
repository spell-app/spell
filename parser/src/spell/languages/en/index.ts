/**
 * The GRAMMAR's entry (epic `solid-2-final` P20):  every spell rule, assembled into `spellParser` (`rules/index.ts`),
 * given to English's pack as its parser.
 * - `SP.loadGrammar()` loads it on first use;  a side-effect import loads it up front:
 *   `import "spell/parser/spell/languages/en"` (the editor's language worker, the element builds' grammar bundle),
 *   or `"spell/parser/spell/languages/all"` (node programs and tests).
 * - English's pack itself, its words and messages, is the barrel's (`./english`):  there with no grammar.
 */
import { SP } from "spell/parser/spell"
import { spellParser } from "spell/parser/spell/rules"

/** English's language pack, its parser now `spellParser`. */
export const english = SP.english.useParser(spellParser)
