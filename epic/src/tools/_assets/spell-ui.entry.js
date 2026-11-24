/**
 * Entry of the docs pages' bundle, the ES module `spell-ui/main.js` that `spell-ui.js` (a few lines of classic script,
 * the ONE script a page names) imports (epic `solid-2-final` P7).
 * - Built by `node src/tools/bundle-spell-ui.js` (from `epic/`), from Spell UI's SOURCE, with Vite, as the Spell UI
 *   site's bundle is:  code-split, every family a lazy chunk.  Edit THIS, never the build (`_assets/spell-ui/`,
 *   git-ignored, built by the page server when stale:  `spell bundle epic-docs`).
 * - What it holds, in import order (ES modules evaluate top to bottom):
 *   - `spell-ui:icons` FIRST:  a module the build writes, registering the icons our widgets and pages draw with
 *     `UI.icons` before any element asks for one (`ICONS` in the build;  no icon pack is fetched)
 *   - Spell UI's core and the root's loader, but NO family:  each loads the first time one of its elements is made,
 *     in the page, in a shadow root or by a script (`RootLoader.loadOnFirstUse()`), as the site's root loads them
 *     - a page has no `<ui-root>` around its elements (most guides):  this does what a root would, for the page
 *     - so the code waiting for an element waits for its FAMILY (`whenAttached()`, the docs helpers), never
 *       `customElements.whenDefined()`, which every catalog tag passes at once
 *   - the source elements' saver (`spell-ui-sources.js`), then the page runtime
 *   - then the site header (`spell/server/site`):  `defineSite()` runs once every import has, so
 *     `<spell-site-header>` upgrades -- and sets `--spell-site-header-height` -- before the runtime first measures its
 *     sticky offsets (the runtime starts a microtask later)
 * - The source elements' engines (highlight.js, marked, Mermaid, ELK), the runtime, emoji names and the theme sheets
 *   are lazy chunks of their own, as in the site's bundle.
 * * - `globalThis.SpellUI` (`UI`, `registerPack`, `packModules`, `themed`, `ready`), for the page runtime, the component packs and
 *   poking in DevTools;  set as this module runs.  A classic script that reads it waits for `SpellUI.loading` (set by
 *   `spell-ui.js`).
 * - Component packs (epic `epic-components`):  `<ui-components source="x.pack.js">` loads a pack's classic script,
 *   which calls `SpellUI.registerPack(pack)` and takes the modules it shares with the page from `SpellUI.packModules`.
 *   - a pack built as a family per chunk (`loadFamily`, the epics pack since epic `solid-2-final` P7) loads each
 *     family on first use too (`registerPackLazily()`);  an older pack is defined whole
 *   - `packModules` is the EXACT specifier a pack's build leaves external => that module's namespace.  Add one here
 *     AND to the pack build's externals (`PACK_MODULES`), together.
 *   - `import * as` a Solid package, against Spell UI's `AGENTS.md` ("One Solid per page"), on purpose and ONLY
 *     here and in the site's bundle:  a pack may use any export, so the whole of `solid-js` / `@solidjs/web` stays.
 * - The theme:  the ONE the person picked, for every place Spell draws (`ThemePreference`, epic `debut` P21),
 *   applied as soon as the bundle runs;  Glass until they pick another.
 *   - light / dark:  part of the same choice (`ColorScheme`)
 *   - Spell's sheet adds the brand's roles (`--spell-surface-warm`, `--spell-type-lede` ...), which `spell-doc.css` and
 *     the other docs sheets read;  in another theme they're missing, and every sheet that reads one has a fallback
 * - The theme menu (`<ui-theme-menu>`) goes in the site header's `theme` slot, in place of its light / dark button
 *   (Q30):  the header names no menu, it only gives the page's own a place (`addThemeMenu()`).
 * - Before P7 it was ONE classic script of every family (an IIFE, 873 KB brotli), so a page opened from `file://`
 *   worked;  pages are always served now (epic `epic-engine` P46).
 */

import "spell-ui:icons"
import * as solidH from "@solidjs/h"
import * as solidWeb from "@solidjs/web"
import * as solid from "solid-js"
import * as uiCore from "spell/ui/core"
import * as uiForms from "spell/ui/forms"
import * as uiRoot from "spell/ui/components/ui-root"
import * as uiCode from "spell/ui/components/ui-code"
import * as uiMarkdown from "spell/ui/components/ui-markdown"
import * as imageZoom from "spell/ui/components/ui-zoom/ImageZoom"
import { ComponentPacks, registerPack } from "spell/ui/components/ui-components"
import { ThemePreference } from "spell/ui/components/ui-theme-menu/ThemePreference"
import { PackHotSwap } from "spell/ui/hot"
import "./spell-ui-sources.js"
import "./spell-doc-runtime.js"
import { defineSite } from "spell/server/site"

const { UI } = uiCore
const { RootLoader } = uiRoot

/**
 * The tags nearly every docs page draws, in its own markup or its elements' shadow roots (the site header's bar, a
 * section, the toolbar, a block's actions, the theme menu):  their families start loading as the bundle runs
 * (epic `solid-2-final` P7;  measured on a guide, an epic page, a details page and the changelog).
 * - Above the code below:  it's read as the module runs
 */
const EVERY_PAGE = [
  "ui-section",
  "ui-button",
  "ui-icon",
  "ui-label",
  "ui-menu",
  "ui-toolbar",
  "ui-breadcrumbs",
  "ui-divider",
  "ui-dropdown",
  "ui-popup",
  "ui-sticky",
  "ui-table",
  "ui-theme-menu"
]

// every family on first use, anywhere on the page:  before the runtime starts (a microtask after this module runs)
RootLoader.loadOnFirstUse()
// and the ones nearly every docs page draws, at once and side by side:  waiting to find each in a shadow root
// (an epic element's, a section's) costs a round trip per level, 1.3 => 3.2s to an epic page's ready (P7, measured)
for (const tag of EVERY_PAGE) RootLoader.loadTag(tag)?.catch((error) => console.error(`spell-ui:  <${tag}>`, error))

// a rebuilt pack (a merge) swaps into the live page instead of reloading it (epic `epic-engine` I116):
// installed now, before any pack defines its tags
PackHotSwap.install()

/**
 * What a component pack imports, by the specifier its build leaves external => the page's copy of that module.
 * - The keys are the import names themselves, as every repo's source writes them (epic `repo-split` P14, Q45):
 *   the kit's `PACK_MODULES` (`spell/element-tools/packModules`) and spell-app's shared-Solid builds read them.
 * - `spell/element`, what the packs' elements are written on:  Spell UI's core module, which carries all of it
 *   (`spell/ui/core` re-exports it, and its `E` holds every name spell-element's `E` does), so a page has one.
 * - `spell/ui/components/ui-root` is for `<spell-viewer>` / `<spell-editor>`'s scripts (`spell-solid-shared.js`,
 *   spell-app's `app/vite.solid.config.ts`), not for packs:  `<spell-viewer>` is a root, a subclass of `UIRoot`.
 * - `@solidjs/h` likewise:  what compiled spell draws with (`spell-runtime.js`, through `spell-solid-shared.js`),
 *   so a program on a docs page draws with the page's one Solid.
 * - `spell/ui/components/ui-code` and `spell/ui/components/ui-markdown` likewise (epic `repo-split` P2):  the families spell's
 *   own `<spell-code>` / `<spell-markdown>` (spell-app's app package, `spell-code.js` / `spell-markdown.js`) EXTEND,
 *   through `spell-ui-shared.js`, so they extend THIS page's `UICode` / `UIMarkdown`:  one Spell UI.  Without them
 *   those scripts stop with an error saying so.  Not packs' externals:  the epics pack imports neither.
 * - `spell/ui/components/ui-zoom/ImageZoom`:  the page's zoom for its screenshots (epic `ui-gaps` P14), the same one the
 *   docs runtime wires up, which `<epic-field>`'s request thumbnails open in.
 */
const packModules = Object.freeze({
  "solid-js": solid,
  "@solidjs/web": solidWeb,
  "@solidjs/h": solidH,
  "spell/element": uiCore,
  "spell/ui/core": uiCore,
  "spell/ui/forms": uiForms,
  "spell/ui/components/ui-root": uiRoot,
  "spell/ui/components/ui-code": uiCode,
  "spell/ui/components/ui-markdown": uiMarkdown,
  "spell/ui/components/ui-zoom/ImageZoom": imageZoom
})

/**
 * Put the theme menu in the site header's `theme` slot, where its light / dark button was (Q30).
 * - Read as the bundle runs, from the end of `<body>`:  the page's markup is all there.
 * - A header DOCKED in a page's own chrome:  none, the page has its own control.
 * - Before `defineSite()`:  the header draws first time without its light / dark button.
 */
function addThemeMenu() {
  const header = document.querySelector("spell-site-header:not([docked])")
  if (!header || header.querySelector(":scope > ui-theme-menu")) return
  const menu = document.createElement("ui-theme-menu")
  menu.slot = "theme"
  menu.setAttribute("size", "small")
  header.append(menu)
}

/**
 * Resolves once the page wears its theme (`ThemePreference.restore()`);  never rejects.
 * - a live reload's new page waits for it before it shows (the docs runtime's `reveal()`, epic `epic-engine` I164):
 *   without it, the reload cross-faded through a frame in Spell UI's plain look (white bands, no Fruity backdrop)
 */
const themed = ThemePreference.restore().catch((error) => console.error("spell-ui:  the page's theme", error))

/**
 * Register `pack`:  one built a family per chunk (`loadFamily`) loads each family the first time one of its elements is
 * made, as Spell UI's own do;  any other is defined whole (`registerPack()`).
 * - Its families go to the root's loader (`RootLoader.add()`), by folder, so `loadOnFirstUse()` finds them.
 * - Its tags are defined early once it's registered (a microtask on:  `registerPack()` adds its catalog after calling
 *   `define()`), so each of its elements already in the page loads its family as it upgrades.
 * - A rebuilt pack swapped in (`PackHotSwap`):  its own `define()`, which loads every family, for the swap.
 */
function registerPackLazily(pack) {
  const { loadFamily, families } = pack
  const isNew = !ComponentPacks.entryOf(Object.keys(pack.catalog)[0] ?? "")
  if (!loadFamily || !families || !isNew) return registerPack(pack)
  RootLoader.add(
    Object.fromEntries(Object.keys(families).map((folder) => [`${folder}/index.ts`, () => loadFamily(folder)]))
  )
  registerPack({ ...pack, define: () => Promise.resolve().then(() => RootLoader.defineEarly(pack.catalog)) })
}

// `ready`:  the UI runtime loaded (its own chunk), which `SpellUI.loading` waits for too:  a script run after it may use
// `UI.i18n` ... at once, as it could when the runtime was inlined
const ready = UI.load().catch((error) => console.error("spell-ui:  the UI runtime didn't load", error))
Object.assign((globalThis.SpellUI ??= {}), { UI, registerPack: registerPackLazily, packModules, themed, ready })
addThemeMenu()
defineSite()
