/****************
 * ### Pack modules
 * The modules a component pack SHARES with the page, by the keys a page's `SpellUI.packModules` offers them under
 * (`ComponentPack`'s build;  "Component packs" in Spell UI's `AGENTS.md`).
 * - Its own file, of no imports:  spell-epic's guide experiments import it too
 *   (`spell/element-tools/packModules`), and never load the pack build (Vite).
 * - The kit's since epic `repo-split` P10:  the keys name Spell UI's shared entries, the runtime every pack registers
 *   with (`SpellUI.registerPack()`), as data;  the kit imports nothing of Spell UI.
 ****************/

/**
 * The modules a pack SHARES with the page instead of bundling:  the import specifiers its build leaves external,
 * each the key it's read under, `globalThis.SpellUI.packModules[<specifier>]`.
 * - The keys are the import names themselves, as every repo's source writes them (epic `repo-split` P14, Q45):
 *   `spell/ui/core`, `spell/element`.
 * - Pages that offer them:  spell-epic's docs bundle (`spell-ui.entry.js`), the component sets' site build
 *   (Spell UI's `site/_src/SitePacks.ts`), and spell-app's pages (`PagePacks.ts`), the last two from Spell UI's
 *   `PackModules`.
 * - `spell/element`:  what the pack's elements are written on (`E.UIComponent` ...).
 *   The page's is Spell UI's core module, which carries all of it, so a page has one (`packModules`).
 * - Any other Spell UI, `spell/element/...` or Solid import fails the build:
 *   a second copy of spell-element, Spell UI's core or Solid on a page breaks them.
 * - `spell/ui/components/ui-zoom/ImageZoom`:  the page's ONE zoom for its screenshots (epic `ui-gaps` P14), which
 *   `<epic-field>`'s request thumbnails open in;  plain DOM, but shared so a page has one rule and one zoom.
 * - `spell/ui/components/ui-graph` and `spell/ui/components/ui-tree`:  families a pack's element may EXTEND
 *   (`class X extends UIGraph`, `extends UITree`), so its subclass is built on the page's own class, as the app's
 *   `<spell-code>` extends the page's `UICode`;  their vocabularies by `UIGraph.describe()` / `UITree.describe()`,
 *   never `UIGraph.en` (a file of the family, which no page shares).
 *   Offered by the site's packs (`SitePacks.ts`) and spell-app's pages (`PagePacks.ts`);  not yet by spell-epic's docs
 *   bundle, whose packs extend neither.
 * - Another one:  add it here AND to Spell UI's one list of what a page offers (`PackModules.HOLDERS`, which the site's
 *   bundle and spell-app's pages fill theirs from;  its test checks every entry here is there), and to spell-epic's
 *   docs bundle's map.
 */
export const PACK_MODULES = [
  "solid-js",
  "@solidjs/web",
  "spell/element",
  "spell/ui/core",
  "spell/ui/forms",
  "spell/ui/components/ui-zoom/ImageZoom",
  "spell/ui/components/ui-graph",
  "spell/ui/components/ui-tree"
]
