/****************
 * ### Pack modules
 * The modules a component pack SHARES with the page, by the keys a page's `SpellUI.packModules` offers them under
 * (`ComponentPack`'s build;  "Component packs" in Spell UI's `AGENTS.md`).
 * - Its own file, of no imports:  spell-epic's guide experiments import it too
 *   (`spell-kit/element-tools/packModules`), and never load the pack build (Vite).
 * - The kit's since epic `repo-split` P10:  the keys name Spell UI's shared entries, the runtime every pack registers
 *   with (`SpellUI.registerPack()`), as data;  the kit imports nothing of Spell UI.
 ****************/

/**
 * The modules a pack SHARES with the page instead of bundling:  the import specifiers its build leaves external,
 * each the key it's read under, `globalThis.SpellUI.packModules[<specifier>]`.
 * - The keys are the import names themselves, as every repo's source writes them (epic `repo-split` P14, Q45):
 *   `spell-ui/core`, `spell-kit/element`.
 * - Pages that offer them:  spell-epic's docs bundle (`spell-ui.entry.js`), the component sets' site build
 *   (Spell UI's `site/_src/SitePacks.ts`), and spell-app's element build (`app/vite.shared.ts`).
 * - `spell-kit/element`:  what the pack's elements are written on (`E.UIComponent` ...).
 *   The page's is Spell UI's core module, which carries all of it, so a page has one (`packModules`).
 * - Any other Spell UI, `spell-kit/element/...` or Solid import fails the build:
 *   a second copy of spell-element, Spell UI's core or Solid on a page breaks them.
 * - Another one:  add it here AND to every page's `packModules` above.
 */
export const PACK_MODULES = ["solid-js", "@solidjs/web", "spell-kit/element", "spell-ui/core", "spell-ui/forms"]
