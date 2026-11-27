/**
 * Lets a page of ANY component set load component packs (`<ui-components source="x.pack.js">`):  `globalThis.SpellUI`,
 * what a pack's classic script calls `registerPack()` on and takes its shared modules from (`packModules`), as the
 * docs bundle gives them (`epic/src/tools/_assets/spell-ui.entry.js`).
 * - Why:  every set's pages (the page server's `componentSets` setting:  Spell UI's at `/components/ui/`, Epic UI's at
 *   `/components/epics/`, App UI's at `/components/app/`, the brand's at `/components/brand/`) load the epics pack,
 *   `epics.pack.js`, whose `<epic-thread>` and `<epic-comment-pane>` draw the comments (epic `epic-engine`);  and the
 *   other sets draw their live examples with a pack's elements (`<epic-*>`, the app's `spell.pack.js`).
 * - In the site's ONE build (`site.ts`), every set's, since epic `epic-engine`:  every module here stays WHOLE (a pack
 *   may use any export), so a page's eager script grows:  Spell UI's 305 KB => 555 KB (79 => 155 KB gzipped,
 *   2026-10-20).  Until then only the other sets' own build of the site had it (`sets.ts`, `site/_assets/sets/`, epic
 *   `epic-workflow` P10), to spare Spell UI's pages that;  once they loaded the epics pack for the comments they needed
 *   it too, and the two builds were the same.
 * - `import * as` the Solid packages, against "One Solid per page" in Spell UI's `AGENTS.md`, on purpose and ONLY
 *   here and in the docs bundle.
 * - SIDE EFFECT:  sets `globalThis.SpellUI`;  listed in `package.json`'s `sideEffects`, or the bundler drops it.
 * - `packModules` MUST name the pack build's externals (`PACK_MODULES`, the kit's `element-tools/packModules.ts`).
 *   - Also `@solidjs/h` and `ui-root`, as the docs bundle's:  the app's element bundles (`/element/spell.pack.js`,
 *     App UI's live `<spell-viewer>`) take the page's Solid only when ALL their shared modules are here
 *     (`spell-solid-shared.js`, app's `vite.solid.config.ts`), else they'd load a second one.
 * - A pack's elements draw Spell UI's in their shadow roots (`<epic-phase>`'s `<ui-section>`), which the root never
 *   sees:  so a pack's `define()` waits for EVERY Spell UI family first (`spell-ui`), as the docs bundle has them.  Only
 *   then, after the root is in, so it never defines the root early.
 *   - `ui-root` arrives later, from the site entry (`site.ts`), once it imports it:  importing it defines
 *     `<ui-root>`, which the site does only once its layout and theme are in.  A pack's script comes a network round
 *     trip after the root asks for it, by when it's in the map.
 * - The rest of Spell UI's ONE list (`PackModules`) joins the map then, as a pack's `define()` starts, from Spell UI's
 *   barrel:  the code and markdown families, which the app's `<spell-code>` and `<spell-markdown>` extend
 *   (`spell-ui-shared.js`, app's `vite.solid.config.ts`), so on App UI's pages they extend the page's own;  the graph
 *   and tree families, which a pack's own elements may extend (`PACK_MODULES`).  The same list spell-app's pages fill
 *   theirs from (`PagePacks.ts`).
 */
import * as solidH from "@solidjs/h"
import * as solidWeb from "@solidjs/web"
import * as solid from "solid-js"
import * as uiCore from "spell/ui/core"
import * as uiForms from "spell/ui/forms"
import * as imageZoom from "spell/ui/components/ui-zoom/ImageZoom"
import type { ComponentPack } from "spell/ui/components/ui-components/UIComponents.types"
import { registerPack } from "spell/ui/components/ui-components/ComponentPacks"
import { PackModules } from "spell/ui/components/ui-components/PackModules"
import { PackHotSwap } from "spell/ui/hot"

// a rebuilt pack (a merge) swaps into the live page instead of reloading it (epic `epic-engine` I116):
// installed now, before any pack defines its tags
PackHotSwap.install()

/**
 * What a pack imports, by its `packModules` key => the page's copy of that module.
 * - The keys are the pack build's externals, by the names its source imports them by:  `spell/ui/core`.
 * - `spell/element`:  Spell UI's core module, which carries all of it (`spell/ui/core` re-exports it):  one per page.
 */
const packModules: Record<string, unknown> = {
  "solid-js": solid,
  "@solidjs/web": solidWeb,
  "@solidjs/h": solidH,
  "spell/element": uiCore,
  "spell/ui/core": uiCore,
  "spell/ui/forms": uiForms,
  // the page's zoom for its screenshots:  plain DOM, no element (epic `ui-gaps` P14)
  "spell/ui/components/ui-zoom/ImageZoom": imageZoom
}

/**
 * `registerPack()`, its `define()` after every Spell UI family's:  the ones its elements draw in their shadow roots.
 * - The rest of the modules a pack may import join `packModules` first (`PackModules.share()`), from Spell UI's barrel.
 */
function registerWithFamilies(pack: ComponentPack): void {
  registerPack({
    ...pack,
    define: () => sharedFrom(import("spell/ui")).then(() => pack.define())
  })
}

/** Fill `packModules` from Spell UI's one list, once all of Spell UI (`ui`) is in. */
async function sharedFrom(ui: Promise<Record<string, unknown>>): Promise<void> {
  const barrel = await ui
  await PackModules.share(packModules, {
    "solid-js": () => solid,
    "@solidjs/web": () => solidWeb,
    "@solidjs/h": () => solidH,
    "spell/ui/core": () => uiCore,
    "spell/ui/forms": () => uiForms,
    "spell/ui/components/ui-zoom/ImageZoom": () => imageZoom,
    "spell/ui": () => barrel
  })
}

const spellUI = (globalThis as { SpellUI?: object }).SpellUI
Object.assign(globalThis, { SpellUI: { ...spellUI, UI: uiCore.UI, registerPack: registerWithFamilies, packModules } })
