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
 * - The theme:  the one the viewer picked, remembered per place (`ThemePreference`, as the editor's;  epic `debut` P17,
 *   J87, J94), applied as soon as the bundle runs.
 *   - an epic page (an `<epic-page>` in it):  Fruity until the viewer picks another, kept under its own key
 *     (`EPIC_PAGES`), the editor's glass look (Owen, 2026-10-24)
 *   - every other page (the guides):  Spell UI's pages' own, Spell by default, under their key
 *   - light / dark:  ONE choice for every Spell site (`ColorScheme`)
 *   - a theme remembered under an old name comes back as its new one (`studio` as `merlot`)
 *   - Spell's sheet adds the brand's roles (`--spell-surface-warm`, `--spell-type-lede` ...), which `spell-doc.css` and
 *     the other docs sheets read for eyebrows, ledes, asides and panels;  in another theme they're missing, and every
 *     sheet that reads one has a fallback
 *   - each sheet is inlined like every other `import()`, so it registers a few microtasks after the bundle runs, not
 *     a network round trip later;  none ships font files
 * - The theme menu (`<ui-theme-menu>`) goes in the site header's `theme` slot, in place of its light / dark button
 *   (Q30):  the header names no menu, it only gives the page's own a place (`addThemeMenu()`).
 */

import "spell-ui:icons"
import "spell-ui:emoji"
import { UI, ThemePreference } from "spell-ui"
import * as solidH from "@solidjs/h"
import * as solidWeb from "@solidjs/web"
import * as solid from "solid-js"
import * as uiCore from "spell-ui/core"
import * as uiForms from "spell-ui/forms"
import * as uiRoot from "spell-ui/components/ui-root"
import * as uiCode from "spell-ui/components/ui-code"
import * as uiMarkdown from "spell-ui/components/ui-markdown"
import { PackHotSwap } from "spell-ui/hot"
import "spell-ui:lazy"
import "./spell-ui-sources.js"
import "./spell-doc-runtime.js"
import { defineSite } from "spell/server/site"

// a rebuilt pack (a merge) swaps into the live page instead of reloading it (epic `epic-engine` I116):
// installed now, before any pack defines its tags
PackHotSwap.install()

export { UI }
export { registerPack } from "spell-ui"

/**
 * What a component pack imports, by the specifier its build leaves external => the page's copy of that module.
 * - The keys are the import names themselves, as every repo's source writes them (epic `repo-split` P14, Q45):
 *   the kit's `PACK_MODULES` (`spell/element-tools/packModules`) and spell-app's shared-Solid builds read them.
 * - `spell/element`, what the packs' elements are written on:  Spell UI's core module, which carries all of it
 *   (`spell-ui/core` re-exports it, and its `E` holds every name spell-element's `E` does), so a page has one.
 * - `spell-ui/components/ui-root` is for `<spell-viewer>` / `<spell-editor>`'s scripts (`spell-solid-shared.js`,
 *   spell-app's `app/vite.solid.config.ts`), not for packs:  `<spell-viewer>` is a root, a subclass of `UIRoot`.
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
 * An epic page's own theme settings:  Fruity until the viewer picks another, remembered apart from the guides'.
 * - Every other page takes `ThemePreference`'s own:  Spell, under Spell UI's pages' key.
 */
const EPIC_PAGES = Object.freeze({ defaultTheme: "fruity", themeKey: "spell-epic:theme" })

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

// an epic page:  read before the first read of the pair (`restore()`, the menu)
if (document.querySelector("epic-page")) ThemePreference.site(EPIC_PAGES)
void ThemePreference.restore().catch((error) => console.error("spell-ui:  the page's theme", error))
addThemeMenu()
defineSite()
