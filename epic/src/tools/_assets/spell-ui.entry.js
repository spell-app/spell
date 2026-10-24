/**
 * Entry of `spell-ui.js`, the ONE classic script a `.html` doc loads -- `file://` blocks ES modules.
 * - Built by `node src/tools/bundle-spell-ui.js`, from spell-epic's root (part of `epic pages update`);  edit THIS,
 *   never the bundle.
 * - `spell-ui` ~== UI's built `dist/index.js`:  every family, each `define()`s its tags as it's imported.
 *   Solid comes from UI's `node_modules`, so there's exactly one copy.
 * - Order matters -- imports run top to bottom:
 *   - `spell-ui:icons` FIRST:  a module the bundler writes, registering the icons our widgets and pages draw
 *     with `UI.icons` before any element asks for one (a classic script can't load UI's icon packs)
 *   - then UI, which defines -- and so upgrades -- every `ui-*` already in the page
 *   - then `spell-ui:lazy`, pointing `<ui-code>` / `<ui-markdown>`'s engine loaders at their lazy scripts (before
 *     any element highlights:  that waits for `UI.load()`), and the source elements' saver (`spell-ui-sources.js`)
 *   - then the page runtime, with every tag defined
 *   - then the site header (`spell/server/site`):  `defineSite()` runs once every import has, so `<spell-site-header>`
 *     upgrades -- and sets `--spell-site-header-height` -- before the runtime first measures its sticky offsets
 *     (the runtime waits for the `ui-*` definitions first)
 * - Every import is a package name:  Spell UI's from its built `dist/` (`spellUiResolver()`), spell-epic's as their
 *   source files (the kit's `sourceNames()`), the rest by their packages' `exports`.
 * - Exports become `window.SpellUI` (`UI`), for the page runtime's checks and for poking in DevTools.
 * - Component packs (epic `epic-components`):  `<ui-components source="x.pack.js">` in a `<ui-root>` loads a pack's
 *   classic script, which calls `SpellUI.registerPack(pack)` and imports the modules it shares with the page from
 *   `SpellUI.packModules` (`spell pack build` maps each of their specifiers there, as written), so a pack never brings a
 *   second Solid or Spell UI.
 *   - `packModules` is the EXACT specifier a pack's build leaves external => that module's namespace.  Add one here
 *     AND to the pack build's externals, together.
 *   - `import * as` a Solid package, against Spell UI's `AGENTS.md` ("One Solid per page"), on purpose and ONLY
 *     here:  that rule keeps a library's bundles from pinning all of Solid, but this map exists so a pack can use any
 *     export, which no tree-shaker can know ahead.  So the whole of `solid-js` / `@solidjs/web` stays in this bundle
 *     (`ui`'s own code never holds such a map).
 * - The look:  UI's `spell-brand` theme (the Spell brand as Claude Design drew it), on every page, applied as soon
 *   as the bundle runs (epic `design-system`, P9;  `spell` before, which stays as it is for everything else).
 *   Its sheet is inlined like every other `import()`, so it registers a few microtasks after the bundle runs, not
 *   a network round trip later.  It ships no font files:  its serif is an installed Palatino, else `serif`.
 *   - it adds the brand's roles (`--spell-surface-warm`, `--spell-type-lede` ...), which `spell-doc.css` and the
 *     other docs sheets read for eyebrows, ledes, asides and panels
 */

import "spell-ui:icons"
import "spell-ui:emoji"
import { UI } from "spell-ui"
import * as solidH from "@solidjs/h"
import * as solidWeb from "@solidjs/web"
import * as solid from "solid-js"
import * as uiCore from "spell-ui/core"
import * as uiForms from "spell-ui/forms"
import * as uiRoot from "spell-ui/components/ui-root"
import * as uiCode from "spell-ui/components/ui-code"
import * as uiMarkdown from "spell-ui/components/ui-markdown"
import "spell-ui:lazy"
import "./spell-ui-sources.js"
import "./spell-doc-runtime.js"
import { defineSite } from "spell/server/site"

export { UI }
export { registerPack } from "spell-ui"

/**
 * What a component pack imports, by the specifier its build leaves external => the page's copy of that module.
 * - The keys are the import names themselves, as every repo's source writes them (epic `repo-split` P14, Q45):
 *   the kit's `PACK_MODULES` (`spell/element-tools/packModules`) and spell-app's shared-Solid builds read them.
 * - `spell/element`, what the packs' elements are written on:  Spell UI's core module, which carries all of it
 *   (`spell-ui/core` re-exports it, and its `E` holds every name spell-element's `E` does), so a page has one.
 * - `spell-ui/components/ui-root` is for `<spell-app>` / `<spell-editor>`'s scripts (`spell-solid-shared.js`,
 *   spell-app's `app/vite.solid.config.ts`), not for packs:  `<spell-app>` is a root, a subclass of `UIRoot`.
 * - `@solidjs/h` likewise:  what compiled spell draws with (`spell-runtime.js`, through `spell-solid-shared.js`),
 *   so a program on a docs page draws with the page's one Solid.
 * - `spell-ui/components/ui-code` and `spell-ui/components/ui-markdown` likewise (epic `repo-split` P2):  the families spell's
 *   own `<spell-code>` / `<spell-markdown>` (spell-app's app package, `spell-code.js` / `spell-markdown.js`) EXTEND,
 *   through `spell-ui-shared.js`, so they extend THIS page's `UICode` / `UIMarkdown`:  one Spell UI.  Without them
 *   those scripts stop with an error saying so.  Not packs' externals:  the epics pack imports neither.
 */
export const packModules = Object.freeze({
  "solid-js": solid,
  "@solidjs/web": solidWeb,
  "@solidjs/h": solidH,
  "spell/element": uiCore,
  "spell-ui/core": uiCore,
  "spell-ui/forms": uiForms,
  "spell-ui/components/ui-root": uiRoot,
  "spell-ui/components/ui-code": uiCode,
  "spell-ui/components/ui-markdown": uiMarkdown
})

/**
 * The site header's tabs on a doc whose server names none (`defineSite({ tabs })`):  a doc opened from disk
 * (`file://`), a server without `"siteTabs"` in its settings.
 * - served by spell-app's page server or the epic server:  the checkout's `"pageServer"` `"siteTabs"` instead, which
 *   name the other parts of the site too (Spell/UI, the app ...);  the header names none itself (epic `repo-split` I4)
 * - the docs' own areas, the list pages `epic pages index` writes (`index.js` `LISTS`), and the engine's own
 *   component set, in the header's order (Owen, 2026-10-11, epic `epic-workflow` J40)
 *   - Epic/UI:  greyed out from disk, as every tab only a server has
 */
const DOCS_TABS = [
  { name: "Guides", path: "guides/index.html", areas: ["guides"] },
  { name: "Sagas", path: "sagas/index.html", areas: ["sagas", "goals"] },
  { name: "Epics", path: "epics/index.html", areas: ["epics"] },
  { name: "Epic/UI", path: "/components/epics/", serverOnly: true, sets: ["epics"], paths: ["/spell-epic/src/docs/"] },
  { name: "Brand", path: "brand/index.html", areas: ["brand"], sets: ["brand"] }
]

void UI.load()
  .then((ui) => ui.themes.apply("spell-brand"))
  .catch((error) => console.error("spell-ui:  the spell-brand theme", error))
defineSite({ tabs: DOCS_TABS })
