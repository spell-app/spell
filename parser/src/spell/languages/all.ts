/**
 * Every language pack, loaded at once:  for node programs and tests, which read every language
 * (the `spell` command, the language server's process, the test helpers;  epic `solid-2-final` P11).
 * - In a browser, a pack past English loads on first use instead (`SP.Language.loadsOnFirstUse()`):
 *   `await SP.Language.loadFor(files)` before reading them.
 * - A side-effect import:  `import "spell/parser/spell/languages/all"`.  The barrel never imports it.
 */
import "spell/parser/spell/languages/es"
