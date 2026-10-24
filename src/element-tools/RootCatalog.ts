import { SkeletonText } from "spell/element/SkeletonText.ts"
import type { SkeletonSpec } from "spell/element/vocabulary.types"

import { VocabularyFiles } from "./VocabularyFiles.ts"

/****************
 * ### `RootCatalog`
 * What `<ui-root>` needs of each tag BEFORE that tag's family loads, read from the vocabulary FILES:
 * - its folder:  which family to import
 * - its skeleton (`ComponentVocabulary.skeleton`, skeleton text parsed by `SkeletonText` into a `SkeletonSpec`)
 * - its attribute names, aliases too, and whether it's a form control (`formControl`):
 *   the root defines the tag up front with them (`DOMElement.defineEarly()`, epic `solid-17` P7)
 * - Every `<Name>.en.ts` of every family folder (`VocabularyFiles`), every export with a `tag` and `attributes`:
 *   the way `ComponentDefinitions` reads them, without Vite's `import.meta.glob`.  A vocabulary without a skeleton
 *   writes no `skeleton` key.
 * - Two writers:  Spell UI's `yarn gen:root` (its `scripts/gen-root.ts`), its `UIRoot.catalog.ts`;  and
 *   `ComponentPack` (`spell-pack build`, `spell pack build`), a component pack's `<pack>.catalog.ts`.
 * - Static:  nothing to keep between calls.  Node only:  `import()`s each vocabulary, which is pure data.
 ****************/
export class RootCatalog {
  /**
   * Tag => its entry, for every family folder in `roots` (absolute folders).
   * - A folder name must be unique across `roots`:  `RootLoader` finds a family by name alone.
   * - Throws a `TypeError` naming the text when a skeleton isn't skeleton text.
   * - NOTE: `import()` caches:  a process that reads again after a vocabulary changes gets the old one.  Both writers
   *   are one-shot commands.  (A `?t=` cache-buster works under `tsx`, but Vitest's runner won't transform it.)
   */
  static async read(roots: string[]): Promise<Record<string, RootCatalogEntry>> {
    const entries: Record<string, RootCatalogEntry> = {}
    for (const root of roots) {
      for (const { folder, vocabulary } of await VocabularyFiles.read(root)) {
        const attributes = vocabulary.attributes.flatMap(({ name, aliases = [] }) => [name, ...aliases])
        entries[vocabulary.tag] = {
          folder,
          ...(vocabulary.skeleton === undefined ? {} : { skeleton: SkeletonText.parse(vocabulary.skeleton) }),
          attributes,
          ...(vocabulary.formControl ? { formControl: true as const } : {})
        }
      }
    }
    return entries
  }

  /** `entries` as the catalog object's lines, `  "tag": {...}`, sorted by tag:  join them with `,\n` inside `{ }`. */
  static lines(entries: Record<string, RootCatalogEntry>): string[] {
    return Object.keys(entries)
      .sort()
      .map((tag) => `  ${JSON.stringify(tag)}: ${JSON.stringify(entries[tag])}`)
  }
}

/**
 * What `<ui-root>` knows of a tag before its family loads:  `RootCatalogEntry`'s shape (Spell UI's `UIRoot.types.ts`).
 * - Its own, not imported:  the kit imports nothing of Spell UI, and `UIRoot.types.ts` imports `spell-ui/core` (types),
 *   which would drag the element files (JSX) into every caller's type check.
 */
export type RootCatalogEntry = {
  readonly folder: string
  readonly skeleton?: SkeletonSpec
  readonly attributes?: readonly string[]
  readonly formControl?: true
}
