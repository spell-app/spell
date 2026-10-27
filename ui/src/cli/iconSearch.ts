/**
 * The icons `spell-ui` ships, by the names `UI.icons` knows them by -- for `spell icon`.
 * - Read from each built-in pack's `pack.js` (`spell/ui/icons`, `BuiltInPacks`), named as the runtime names them:
 *   `IconName.claim()`.  An icon no name reaches is left out.
 * - Search keywords from ui's `data/search.json` (its `terms`), keyed by Font Awesome file name, e.g. `bell` -> `alarm`.
 * - Found by `IconName.search()`, the one search `<ui-icon-picker>` and the docs' icon browser use too.
 */
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { BuiltInIconPacks, BuiltInPacks, IconName, type IconPackIndex, type IconSearchFile } from "spell/ui/icons"

/** ui's search keywords:  `src/icons/data/search.json`, beside `icon-packs/`. */
const SEARCH_FILE = resolve(dirname(fileURLToPath(BuiltInPacks.url("fa7-free"))), "..", "..", "data", "search.json")

/**
 * One icon.
 * - `name`:  what to write, e.g. `bell` -- `pack:name` reaches it in that pack only
 * - `pack`:  its pack's id, e.g. `fa7-free`
 * - `aliases`:  other names it goes by in that pack
 * - `keywords`:  words to find it by, e.g. `alarm`
 * - `svg`:  its SVG file
 */
export type IconInfo = {
  name: string
  pack: string
  aliases: string[]
  keywords: string[]
  svg: string
}

/** Every icon of `packs` -- default, all the built-in ones -- in pack order, then index order. */
export async function loadIcons(packs: readonly string[] = BuiltInIconPacks): Promise<IconInfo[]> {
  const { terms: keywordsByFile } = JSON.parse(readFileSync(SEARCH_FILE, "utf8")) as IconSearchFile
  const icons: IconInfo[] = []
  for (const pack of packs) {
    if (!BuiltInPacks.has(pack)) throw new Error(`No icon pack '${pack}' -- packs:  ${BuiltInIconPacks.join(", ")}`)
    const indexUrl = BuiltInPacks.url(pack)
    const index = (await import(indexUrl)).default as IconPackIndex
    const folder = dirname(fileURLToPath(indexUrl))
    // every name -> its key, then each key's names, in index order
    const names = new Map<string, string[]>()
    for (const [name, key] of IconName.claim(Object.entries(index.icons).map(([key, it]) => [key, it.alias]))) {
      names.set(key, [...(names.get(key) ?? []), name])
    }
    for (const key of Object.keys(index.icons)) {
      const claimed = names.get(key)
      if (!claimed) continue
      const name = IconName.labelOf(key, claimed)
      icons.push({
        name,
        pack,
        aliases: claimed.filter((it) => it !== name),
        keywords: [...(keywordsByFile[IconName.fileOf(key)] ?? [])],
        svg: resolve(folder, `${key}.svg`)
      })
    }
  }
  return icons
}

/**
 * The icons `query` finds, best first:  Spell UI's ONE icon search (`IconName.search()`), as `<ui-icon-picker>` and the
 * docs' icon browser search.
 * - Within a rank, by name.
 * - Empty `query`:  all of them, as loaded.
 */
export function searchIcons(icons: IconInfo[], query: string): IconInfo[] {
  if (!IconName.normalize(query)) return icons
  const byName = [...icons].sort((a, b) => a.name.localeCompare(b.name))
  return [
    ...IconName.search(byName, query, { names: (icon) => [icon.name, ...icon.aliases], terms: (icon) => icon.keywords })
  ]
}
