/**
 * Every language, loaded before each node test file:  Spell's grammar in each, and Spell UI's names in each
 * (epic `solid-2-final` P11).
 * - In a browser, a language past English loads on first use (`SP.Language.loadFor()`);
 *   the tests that compile a Spanish project at once, with no load before it, need it there already.
 * - The node projects' `setupFiles` (`vitest.config.ts`).
 */
import { SP } from "spell/parser/spell"

import "spell/parser/spell/languages/all"
import "spell/app/spaces/models/spellUIPack"

await SP.ComponentPacks.loadLanguage("es")
