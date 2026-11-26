/**
 * Every language pack, and the grammar with English's, loaded at once:  for node programs and tests, which read every
 * language (the `spell` command, the language server's process, the test helpers;  epic `solid-2-final` P11, P20).
 * - In a browser, each pack loads on first use instead (`SP.Language.loadsOnFirstUse()`):
 *   `await SP.loadGrammar()` before parsing, `await SP.Language.loadFor(files)` before reading another language.
 * - A side-effect import:  `import "spell/parser/spell/languages/all"`.  The barrel never imports it.
 */
// HTML's whole entity table, which a browser loads on first use
import "spell/parser/parser/htmlEntitiesUpFront"
import "spell/parser/spell/languages/en"
import "spell/parser/spell/languages/es"
