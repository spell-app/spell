import JSON5 from "json5"

import { snakeCase } from "spell/util"
import { ourNameFor } from "spell/places/FieldNames"
import { SAMPLE_STORE } from "spell/places/places.types"
import { PrefStore } from "spell/util/persist/PrefStore"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import type { PlaceDescriptionOnDisk } from "spell/parser/spell/ingest/ingest.types"
import { PlaceNerd, type ErdField } from "spell/parser/spell/ingest/PlaceNerd"

/****************
 * ### `SitePlaces`
 * The places a site's data comes from, as `spell place ingest` described them (epic `mockup` P11):
 * what the site editor's Data tab draws as a NERD and an ERD.
 * - A project's places:  the descriptions its project file lists under `development.apis`
 *   (`StarWars.api.json5`), and those of each project it imports (the Star Wars site's are the Star Wars example's).
 * - Read over the page server, as every project file is (`SP.SpellUrls`):  JSON5, parsed here.
 * - Each collection's SAMPLE ROWS are the running site's own (epic `mockup` P14, T22):  ONE store, so a row edited
 *   in the Data tab shows when the site runs on its sample, and the other way round.
 *   - That store is the one `useSample()` keeps, in this browser:  `spell-samples:<project>/<place>`, a place's
 *     collections by the program's names (`characters`), each row by the program's field names (`hairColor`).
 *   - The table shows the description's names (`hair_color`):  `tableRowOf()` and `programRowOf()` turn one into the
 *     other, keeping every field the table doesn't show.
 *   - Nothing kept yet:  one row from the ingester's example of each field, kept once it's edited.
 * - Plain TypeScript, no Solid:  `<SiteData>` draws what it reads.
 ****************/
export class SitePlaces {
  /**
   * The places of project `projectId`, its index `contents` given:  its own, then its imports', in order.
   * - A description that won't load or parse is left out, and said in the console:  the rest still show.
   * - NEVER throws.
   */
  static async of(projectId: string, contents: ProjectIndex | undefined): Promise<SitePlace[]> {
    const sources: { projectId: string; file: string }[] = []
    for (const file of contents?.development?.apis ?? []) sources.push({ projectId, file })
    for (const { path } of contents?.imports ?? []) {
      if (!SP.SpellLocation.isAddress(path)) continue
      const imported = await SitePlaces.indexOf(path)
      for (const file of imported?.development?.apis ?? []) sources.push({ projectId: path, file })
    }
    const places = await Promise.all(sources.map((source) => SitePlaces.placeAt(source.projectId, source.file)))
    return places.filter((place) => place !== undefined)
  }

  /** The rows kept for `collection` of `place`, the running site's samples, else one made from its fields' examples. */
  static rowsOf(projectId: string, place: SitePlace, collection: string): SampleRow[] {
    const kept = SitePlaces.keptOf(projectId, place)?.[SitePlaces.programCollectionOf(place, collection)]
    if (kept) return kept.map((row) => SitePlaces.tableRowOf(place, collection, row))
    const fields = PlaceNerd.erdOf(place.description, collection)
    const row: SampleRow = {}
    for (const field of fields) if (field.example !== undefined) row[field.key] = SitePlaces.cellOf(field)
    return Object.keys(row).length ? [row] : []
  }

  /** Keep `rows` for `collection` of `place`, in this browser, as the running site's samples. */
  static keepRows(projectId: string, place: SitePlace, collection: string, rows: readonly SampleRow[]) {
    const kept = { ...SitePlaces.keptOf(projectId, place) }
    kept[SitePlaces.programCollectionOf(place, collection)] = rows.map((row) =>
      SitePlaces.programRowOf(place, collection, row)
    )
    PrefStore.setAt(SitePlaces.keyOf(projectId, place), kept)
  }

  /**
   * Forget the rows kept for `collection` of `place`:  they start again from the examples here,
   * and the running site copies a few from the real place again.
   */
  static forgetRows(projectId: string, place: SitePlace, collection: string) {
    const kept = { ...SitePlaces.keptOf(projectId, place) }
    delete kept[SitePlaces.programCollectionOf(place, collection)]
    PrefStore.setAt(SitePlaces.keyOf(projectId, place), Object.keys(kept).length ? kept : undefined)
  }

  ////////////////
  // ## The running site's samples
  ////////////////

  /** Every collection kept for `place`'s sample in project `projectId`, by the program's names;  `undefined`:  none. */
  private static keptOf(projectId: string, place: SitePlace): Record<string, SampleRow[]> | undefined {
    const kept = PrefStore.getAt(SitePlaces.keyOf(projectId, place))
    return kept && typeof kept === "object" ? (kept as Record<string, SampleRow[]>) : undefined
  }

  /**
   * Where `useSample()` keeps `place`'s sample when project `projectId` runs:  `spell-samples:<project>/<place>`.
   * - The place by the program's name for it:  `star wars` is `star_wars`.
   */
  private static keyOf(projectId: string, place: SitePlace): string {
    return `${SAMPLE_STORE}:${projectId}/${snakeCase(place.name)}`
  }

  /** The program's name for `collection`:  its type, made plural (`people`, a `character`, is `characters`). */
  private static programCollectionOf(place: SitePlace, collection: string): string {
    const type = place.description.collections[collection]?.type ?? collection
    const words = type.split(" ")
    words.push(P.pluralize(words.pop()!))
    return snakeCase(words.join(" "))
  }

  /** `row`, kept by the program's field names, as the table shows it:  by the description's (`hair_color`). */
  private static tableRowOf(place: SitePlace, collection: string, row: SampleRow): SampleRow {
    const shown: SampleRow = { ...row }
    for (const key of SitePlaces.fieldKeysOf(place, collection)) {
      const ours = ourNameFor(key)
      if (!(ours in row)) continue
      shown[key] = row[ours]
      if (ours !== key) delete shown[ours]
    }
    return shown
  }

  /** `row`, as the table has it, by the program's field names:  what `tableRowOf()` undoes. */
  private static programRowOf(place: SitePlace, collection: string, row: SampleRow): SampleRow {
    const keys = new Set(SitePlaces.fieldKeysOf(place, collection))
    return Object.fromEntries(Object.entries(row).map(([key, value]) => [keys.has(key) ? ourNameFor(key) : key, value]))
  }

  /** The description's field names of `collection`. */
  private static fieldKeysOf(place: SitePlace, collection: string): string[] {
    return Object.keys(place.description.collections[collection]?.fields ?? {})
  }

  ////////////////
  // ## Reading
  ////////////////

  /** Project `projectId`'s index, from the server;  `undefined` when it won't load. */
  private static async indexOf(projectId: string): Promise<ProjectIndex | undefined> {
    try {
      const response = await fetch(SP.SpellUrls.indexUrl(projectId))
      return response.ok ? ((await response.json()) as ProjectIndex) : undefined
    } catch (error) {
      console.error(`SitePlaces:  couldn't read ${projectId}'s index`, error)
      return undefined
    }
  }

  /** The description `file` of project `projectId`;  `undefined` when it won't load or parse. */
  private static async placeAt(projectId: string, file: string): Promise<SitePlace | undefined> {
    const path = `${projectId}/${file}`
    try {
      const response = await fetch(SP.SpellUrls.fileUrl(path))
      if (!response.ok) throw new Error(`answered ${response.status}`)
      const description = JSON5.parse(await response.text()) as PlaceDescriptionOnDisk
      return { name: description.about.name, path, description }
    } catch (error) {
      console.error(`SitePlaces:  couldn't read the place description ${path}`, error)
      return undefined
    }
  }

  /** A field's example as a table's cell:  a link's last part (`/planets/1/` => `1`), a list's length, else as is. */
  private static cellOf({ example, kind }: ErdField): unknown {
    if (Array.isArray(example)) return kind === "list of links" ? `${example.length} links` : example.join(", ")
    if (typeof example === "object" && example !== null) return JSON.stringify(example)
    return example
  }
}

/** One place a site's data comes from. */
export type SitePlace = {
  /** What the program calls it:  `star wars`. */
  name: string
  /** Its description's address:  `@spell/examples/StarWars/StarWars.api.json5`. */
  path: string
  /** What `spell place ingest` wrote of it. */
  description: PlaceDescriptionOnDisk
}

/** A sample row:  values by the source's field names. */
export type SampleRow = Record<string, unknown>

/** What a project's index says that this reads. */
export type ProjectIndex = {
  /** Its imports:  a file's path, or another project's address. */
  imports?: readonly { path: string }[]
  /** What's only for designing it:  the place descriptions `spell place ingest` wrote. */
  development?: { apis?: readonly string[] }
}
