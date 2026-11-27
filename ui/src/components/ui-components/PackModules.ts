/****************
 * ### `PackModules`
 * The ONE list of the modules a page shares with its component packs (`SpellUI.packModules`), and how a page fills
 * them:  every key a pack may import (the kit's `PACK_MODULES`, what its build leaves external), and the few more the
 * app's own element bundles take from the page (`spell-solid-shared.js`), each with the module of the page that
 * holds it:  in place of a copy per page.
 * - A page hands `share()` a loader for each of those holders, from its own imports:  the site's bundle
 *   (`SitePacks.ts`) and spell-app's pages (`PagePacks.ts`), so both offer the same keys, from the same list.
 *   - A holder is the page's own copy of a module:  `spell/ui` is Spell UI's whole barrel, which holds each family's
 *     exports;  a page whose barrel holds the zoom too hands the same loader for both.
 * - The keys MUST name every `PACK_MODULES` entry:  its test says so.
 * - Plain data and one function, no Solid:  importing it loads nothing.
 ****************/
export class PackModules {
  /**
   * Each key a page's `packModules` offers => the page's module that holds it.
   * - `spell/element`:  Spell UI's core module, which carries all of the element layer (`spell/ui/core` re-exports
   *   it):  one per page.
   * - `@solidjs/h`, `ui-root`:  for the app's element bundles (`<spell-viewer>` is a root), not for packs.
   * - The families a pack's elements may EXTEND (`ui-graph`, `ui-tree`), and the ones the app's `<spell-code>` /
   *   `<spell-markdown>` extend (`ui-code`, `ui-markdown`):  from Spell UI's barrel, which holds them whole.
   */
  static readonly HOLDERS = {
    "solid-js": "solid-js",
    "@solidjs/web": "@solidjs/web",
    "@solidjs/h": "@solidjs/h",
    "spell/element": "spell/ui/core",
    "spell/ui/core": "spell/ui/core",
    "spell/ui/forms": "spell/ui/forms",
    "spell/ui/components/ui-zoom/ImageZoom": "spell/ui/components/ui-zoom/ImageZoom",
    "spell/ui/components/ui-code": "spell/ui",
    "spell/ui/components/ui-markdown": "spell/ui",
    "spell/ui/components/ui-root": "spell/ui",
    "spell/ui/components/ui-graph": "spell/ui",
    "spell/ui/components/ui-tree": "spell/ui"
  } as const

  /**
   * Fill `into`, a page's `packModules`, with every key of `HOLDERS` it doesn't have yet, each from its holder's
   * loader in `loaders`.
   * - A key already there stays:  a page that put some in as it loaded (the site's eager ones) keeps them.
   * - Each holder loaded once, however many keys it holds.
   * - Rejects with what a loader rejects with.
   */
  static async share(into: Record<string, unknown>, loaders: PackModuleLoaders): Promise<void> {
    const missing = Object.entries(PackModules.HOLDERS).filter(([key]) => !(key in into))
    const holders = [...new Set(missing.map(([, holder]) => holder))]
    const loaded = new Map(await Promise.all(holders.map(async (holder) => [holder, await loaders[holder]()] as const)))
    for (const [key, holder] of missing) into[key] ??= loaded.get(holder)
  }
}

/** A module of the page that holds one or more of `PackModules.HOLDERS`' keys:  `spell/ui`, `solid-js` ... */
export type PackModuleHolder = (typeof PackModules.HOLDERS)[keyof typeof PackModules.HOLDERS]

/** How a page loads each holder:  its own copy of that module. */
export type PackModuleLoaders = Record<PackModuleHolder, () => unknown>
