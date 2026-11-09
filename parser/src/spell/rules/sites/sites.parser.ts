/**
 * The `sites` rule module's parser:  each of its rule files registers on it (`sites.addRule()`),
 * and `rules/index.ts` combines it into `spellParser`.
 * - A file of its own, so a rule file can import it without importing its siblings.
 */
// Import directly to avoid circular import
import { SpellParser } from "spell/parser/spell/SpellParser"

/** Rule module for a site (epic `mockup` P1):  its line, and the lines naming its pages, dialogs and sidebars. */
export const sites = new SpellParser({ module: "sites" })
