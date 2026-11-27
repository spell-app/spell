import * as solidH from "@solidjs/h"
import * as solidWeb from "@solidjs/web"
import * as solid from "solid-js"
import * as uiCore from "spell/ui/core"
import { ComponentPacks, registerPack, type ComponentPack } from "spell/ui/components/ui-components"
import { PackModules } from "spell/ui/components/ui-components/PackModules"

/****************
 * ### `PagePacks`
 * Lets a page that has only our element bundles (`<spell-viewer>`, no docs bundle) load a component pack:
 * `<ui-components source="/_epic/pack/epics.pack.js">` in a Spell page, so a Spell guide draws `<epic-*>` elements
 * (epic `editor` P44:  Epic UI's guide);  and a program's own, a project's component pack (`load()`), on the editor's
 * page, the run page and any page with `<spell-viewer>`.
 * - A pack is a classic script calling `SpellUI.registerPack()` as it runs, then taking the modules it shares with the
 *   page from `SpellUI.packModules` ("Component packs" in Spell UI's `AGENTS.md`).
 *   A docs page has both from its own bundle;  a page with only `<spell-viewer>` had neither.
 * - So `spell-solid.js` calls `share()` as it loads (`vite.solid.config.ts`):  it puts `registerPack` on
 *   `globalThis.SpellUI`, unless the page has one;  and `loadPack`, `load()`, which a runner in a bundle that takes
 *   Spell UI from the shared files (`<spell-viewer>`'s) calls there.  The editor and the run page call it too.
 * - `packModules` waits for the first pack:  until then it isn't there.
 *   - Why:  our other bundles take Solid and Spell UI from a page's `packModules` when they have them all
 *     (`spell-solid-shared.js`), and they run first;  before a pack, the page has none.
 *   - Then the pack's `define()` waits for all of Spell UI (`spell-ui.js`), as the site's bundle does
 *     (`SitePacks.ts`):  its elements draw Spell UI's in their shadow roots, which the root never sees.
 * - Which modules:  Spell UI's ONE list, `PackModules`, each from the ones `spell-solid.js` and `spell-ui.js` already
 *   hold:  one Solid, one Spell UI.
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
    // how a program's runner loads its packs, from any bundle of ours:  `<spell-viewer>`'s can't import this file
    page.loadPack ??= PagePacks.load
    if (page.registerPack) return
    page.registerPack = (pack) =>
      registerPack({ ...pack, define: () => PagePacks.shareModules(page, loadSpellUI).then(() => pack.define()) })
  }

  /**
   * Load the component pack a program draws with, `module` (`@spell/pack/<project>/__pack/<name>.pack.js`), whose
   * script is at `scriptUrl`:  through Spell UI's `ComponentPacks.load()`, once per page;  resolves once its tags are
   * defined.  The runner's `loadPack` (`runCompiled()`), in every place a program runs.
   * - From Spell's own dev server (the editor's `yarn start:dev`):  the pack's SOURCE, its families compiled by the dev
   *   server, so a saved element shows through its hot replacement in well under a second (`DEV_PACKS`, the app's
   *   `vite.config.ts`, `projectPacksInDev()`);  its built script when that fails.
   *   - `?packs=built` in the page's address:  its built script all the same, as a built editor loads it (to see the
   *     page server's rebuild of a saved element from a dev editor)
   * - Rejects when neither loads.
   */
  static load(module: string, scriptUrl: string): Promise<unknown> {
    if (!import.meta.env.DEV || new URLSearchParams(location.search).get("packs") === "built") {
      return ComponentPacks.load(scriptUrl)
    }
    return ComponentPacks.load(PagePacks.devUrl(module), { module: true }).catch((error: unknown) => {
      console.warn(`PagePacks:  ${module} didn't load from the dev server;  its built script instead`, error)
      return ComponentPacks.load(scriptUrl)
    })
  }

  /**
   * Where Spell's dev server serves pack `module`'s source entry (`<name>.pack.ts`, beside its built script):
   * `@spell/pack/acme/widgets/__pack/widgets.pack.js` => `/@spell-pack/acme/widgets/__pack/widgets.pack.ts`.
   */
  static devUrl(module: string): string {
    return DEV_PACKS + module.slice(PACK_MODULE.length).replace(/\.pack\.js$/, ".pack.ts")
  }

  /** Fill `page.packModules` once, with every module a pack may import (`PackModules`, Spell UI's one list). */
  private static async shareModules(page: PageSpellUI, loadSpellUI: () => Promise<Record<string, unknown>>) {
    if (page.packModules) return
    const ui = await loadSpellUI()
    const modules: Record<string, unknown> = {}
    await PackModules.share(modules, {
      "solid-js": () => solid,
      "@solidjs/web": () => solidWeb,
      "@solidjs/h": () => solidH,
      "spell/ui/core": () => uiCore,
      "spell/ui/forms": () => import("spell/ui/forms"),
      // the barrel holds each of these, whole
      "spell/ui/components/ui-zoom/ImageZoom": () => ui,
      "spell/ui": () => ui
    })
    page.packModules ??= modules
  }
}

/**
 * Where Spell's dev server serves a project's pack from its source (the app's `vite.config.ts`,
 * `projectPacksInDev()`):  `/@spell-pack/<project>/__pack/<name>.pack.ts`.
 */
export const DEV_PACKS = "/@spell-pack/"

/** Start of a pack's module, as compiled Spell loads it:  `SP.SPELL_PACK_MODULE`, a copy (no parser here). */
const PACK_MODULE = "@spell/pack/"

/** What a page's `globalThis.SpellUI` holds that this file reads or sets. */
type PageSpellUI = {
  /** how a pack's script registers itself */
  registerPack?: (pack: ComponentPack) => void
  /** the modules a pack shares with the page, by the specifier it imports them by */
  packModules?: Record<string, unknown>
  /** `PagePacks.load()`:  how a program's runner loads a pack, in a bundle that can't import this file */
  loadPack?: (module: string, scriptUrl: string) => Promise<unknown>
}
