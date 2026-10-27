/**
 * The types and constants the `ui-components` family's files share:
 * - its component (`UIComponents`) and its vocabulary
 * - `ComponentPacks` (the page's registry of component packs)
 * - `<ui-root>`, which reads `source`
 *
 * - Pure data:  `import type` only (a pack's catalog has the shape of `<ui-root>`'s own), so node can load it.
 */

import type { RootCatalogEntry } from "spell-ui/components/ui-root/UIRoot.types"

import type { componentsVocabulary } from "./UIComponents.en"

/** `componentsVocabulary`'s type. */
export type ComponentsVocabulary = typeof componentsVocabulary

/** The attribute naming a pack's script:  `<ui-components source>`, which `<ui-root>` reads. */
export const SOURCE = "source"

/**
 * A COMPONENT PACK:  another package's custom elements (any tag prefix), loaded on demand by `<ui-root>`.
 * - A pack is a classic script calling `SpellUI.registerPack(pack)` as it runs (`ComponentPacks.register()`);
 *   an ES module may call `registerPack()` from `spell-ui` itself.
 * - It shares the page's Solid and Spell UI (`SpellUI.packModules`), never bundling its own copy.
 */
export type ComponentPack = {
  /** Its name, unique on the page:  `epics` for `epics.pack.js` (how a load finds its pack without `currentScript`). */
  readonly name: string
  /** The prefix of every tag it defines, ending in `-`:  `epic-`.  Never `ui-` (Spell UI's own). */
  readonly prefix: string
  /** Every tag it defines => what `<ui-root>` needs before it's ready (a skeleton);  each tag starts with `prefix`. */
  readonly catalog: Readonly<Record<string, RootCatalogEntry>>
  /**
   * Define every tag of the pack;  called once, by `registerPack()`.
   * - It may return a promise, when it loads its families first (`import()`):
   *   the pack counts as loaded once that settles, so a `<ui-root>` waits for its tags.
   */
  define(): void | Promise<unknown>
  /**
   * Each family folder => a hash of the sources its script holds (`spell pack build`, epic `epic-engine` I116):
   * when the pack is rebuilt, `ComponentPacks.reload()` swaps in only the families whose hash changed.
   * - None (a pack built before):  every family is swapped.
   */
  readonly families?: Readonly<Record<string, string>>
}

/**
 * How `ComponentPacks.reload()` swaps a rebuilt pack into the live elements:  the page's hot replacement
 * (Spell UI's `PackHotSwap`, over the kit's `HotDefinitions`).
 */
export type PackSwap = {
  /** While its `define()` runs again:  whether a tag KEEPS its live class (`true`:  its family didn't change);  `undefined` after. */
  keep(keeps: ((tag: string) => boolean) | undefined): void
  /** Re-render the swapped elements;  `false` when a change needs a page reload (the platform can't take it in place). */
  finish(): boolean
}

/** What `ComponentPacks.reload()` did:  swapped in place, needs a page reload, or no such pack on the page. */
export type PackSwapResult = "swapped" | "reload" | "none"
