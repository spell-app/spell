/**
 * `hot` lib entry (`spell-ui/hot`):  hot replacement of a page's rebuilt component packs, `PackHotSwap`
 * (epic `epic-engine` I116).
 * - Its own entry, so only the pages that swap packs carry the kit's `HotDefinitions`:
 *   the docs bundle (spell-epic's `spell-ui.entry.js`) and the site's (`SitePacks.ts`).
 */

export { PackHotSwap } from "spell-ui/components/ui-components/PackHotSwap"
