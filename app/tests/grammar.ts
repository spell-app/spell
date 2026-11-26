/**
 * Spell's grammar, loaded before each browser test file (epic `solid-2-final` P20):  the parser's barrel holds none,
 * and the editor's page loads it only on first use (`SP.loadGrammar()`).
 * - The browser tests parse on the page itself, as `<spell-editor>` and the static build do:  up front, as theirs is.
 * - The `app:browser` project's `setupFiles` (`vitest.config.ts`);  the node projects load every language instead
 *   (`allLanguages.ts`).
 */
import "spell/parser/spell/languages/en"
