/**
 * `yarn site:bundle`:  build the Spell UI site's bundle, `site/_assets/` (git-ignored), from `site/_src/site.ts`
 * with `vite.site.config.ts`, then report its sizes.
 * - Run by `spell bundle ui-site` (`spell/server`'s `Bundle`), which the page server runs when it starts and
 *   the sources changed;  it then records their hash in `site/_assets/.bundle.json`.
 * - Its steps are the kit's `Bundle`'s, as the brand's build:
 *   - `clearOutput()`:  `site/_assets/` emptied first (everything but `icon-packs`, the record too),
 *     so a removed chunk doesn't linger
 *   - `linkIconPacks()`:  `site/_assets/icon-packs` a LINK to `src/icons/icon-packs`, never a copy
 *   - `sizeReport()`:  every file but the packs, raw and gzipped;  EAGER is `site.css` + `site.js` and the chunks it
 *     imports statically (what a page loads before any `import()`)
 * - Every component set's pages load this one bundle (the page server's `componentSets` setting):  the page server
 *   serves it as each set's `_assets/` (`/components/epics/_assets/`).  The other sets' own build (`site/_assets/sets/`, epic
 *   `epic-workflow` P10) is gone since epic `epic-engine`, which gave Spell UI's pages the component packs too.
 */
import path from "node:path"
import { build } from "vite"

import { SRV } from "spell/server"
import { SITE_ASSETS } from "spell/ui/vite.site.config.ts"
import { Terminal } from "spell/element-tools/Terminal"

SRV.Bundle.clearOutput(SITE_ASSETS)
const started = performance.now()
await build({ configFile: path.resolve(import.meta.dirname, "../vite.site.config.ts") })
SRV.Bundle.linkIconPacks(SITE_ASSETS)
const seconds = (performance.now() - started) / 1000
for (const line of SRV.Bundle.sizeReport({
  name: "site",
  folder: SITE_ASSETS,
  seconds,
  entries: ["site.css", "site.js"]
}))
  Terminal.out(line)
