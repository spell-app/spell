import * as solidH from "@solidjs/h"
import * as solidWeb from "@solidjs/web"
import * as solid from "solid-js"
import * as uiCore from "spell/ui/core"
import { registerPack, type ComponentPack } from "spell/ui/components/ui-components"

/****************
 * ### `PagePacks`
 * Lets a page that has only our element bundles (`<spell-viewer>`, no docs bundle) load a component pack:
 * `<ui-components source="/_epic/pack/epics.pack.js">` in a Spell page, so a Spell guide draws `<epic-*>` elements
 * (epic `editor` P44:  Epic UI's guide).
 * - A pack is a classic script calling `SpellUI.registerPack()` as it runs, then taking the modules it shares with the
 *   page from `SpellUI.packModules` ("Component packs" in Spell UI's `AGENTS.md`).
 *   A docs page has both from its own bundle;  a page with only `<spell-viewer>` had neither.
 * - So `spell-solid.js` calls `share()` as it loads (`vite.solid.config.ts`):  it puts `registerPack` on
 *   `globalThis.SpellUI`, unless the page has one.
 * - `packModules` waits for the first pack:  until then it isn't there.
 *   - Why:  our other bundles take Solid and Spell UI from a page's `packModules` when it has them all
 *     (`spell-solid-shared.js`), and they run first;  before a pack, the page has none.
 *   - Then the pack's `define()` waits for all of Spell UI (`spell-ui.js`), as the site's bundle does
 *     (`SitePacks.ts`):  its elements draw Spell UI's in their shadow roots, which the root never sees.
 * - The modules are the ones `spell-solid.js` and `spell-ui.js` already hold:  one Solid, one Spell UI.
 * - STATIC and instance-free on purpose:  one per page.
 ****************/
export class PagePacks {
  /**
   * Put `registerPack` on `globalThis.SpellUI`, unless the page has one (a docs page's bundle).
   * - `loadSpellUI`:  imports `spell-ui.js`, Spell UI's whole barrel.
   * - SIDE EFFECT:  page-wide.  NEVER throws.
   */
  static share(loadSpellUI: () => Promise<Record<string, unknown>>): void {
    const page = ((globalThis as { SpellUI?: PageSpellUI }).SpellUI ??= {})
    if (page.registerPack) return
    page.registerPack = (pack) =>
      registerPack({ ...pack, define: () => PagePacks.shareModules(page, loadSpellUI).then(() => pack.define()) })
  }

  /** Fill `page.packModules` once, with every module a pack may import (`PACK_MODULES`, and what packs extend). */
  private static async shareModules(page: PageSpellUI, loadSpellUI: () => Promise<Record<string, unknown>>) {
    if (page.packModules) return
    const [ui, forms] = await Promise.all([loadSpellUI(), import("spell/ui/forms")])
    page.packModules ??= {
      "solid-js": solid,
      "@solidjs/web": solidWeb,
      "@solidjs/h": solidH,
      "spell/element": uiCore,
      "spell/ui/core": uiCore,
      "spell/ui/forms": forms,
      // the barrel holds each of these families' exports, whole
      "spell/ui/components/ui-zoom/ImageZoom": ui,
      "spell/ui/components/ui-code": ui,
      "spell/ui/components/ui-markdown": ui,
      "spell/ui/components/ui-root": ui
    }
  }
}

/** What a page's `globalThis.SpellUI` holds that this file reads or sets. */
type PageSpellUI = {
  /** how a pack's script registers itself */
  registerPack?: (pack: ComponentPack) => void
  /** the modules a pack shares with the page, by the specifier it imports them by */
  packModules?: Record<string, unknown>
}
