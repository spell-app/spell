import JSON5 from "json5"

import { BrowserCopy } from "spell/places/SaveQueue"
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
 * - Each collection's SAMPLE ROWS here are the site editor's own, kept in this browser (`BrowserCopy`):
 *   - they start from the ingester's example of each field, one row
 *   - edited in the Data tab's table, they're kept under the project, the place and the collection
 *   - NOT the running site's samples (`useSample()`, which a running program keeps under its own key):  T22
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

  /** The rows kept for `collection` of `place`, else one made from its fields' examples. */
  static rowsOf(projectId: string, place: SitePlace, collection: string): SampleRow[] {
    const kept = SitePlaces.copyOf(projectId, place, collection).kept<SampleRow[]>()
    if (kept) return kept
    const fields = PlaceNerd.erdOf(place.description, collection)
    const row: SampleRow = {}
    for (const field of fields) if (field.example !== undefined) row[field.key] = SitePlaces.cellOf(field)
    return Object.keys(row).length ? [row] : []
  }

  /** Keep `rows` for `collection` of `place`, in this browser. */
  static keepRows(projectId: string, place: SitePlace, collection: string, rows: readonly SampleRow[]) {
    SitePlaces.copyOf(projectId, place, collection).keep(rows)
  }

  /** Forget the rows kept for `collection` of `place`:  they start again from the examples. */
  static forgetRows(projectId: string, place: SitePlace, collection: string) {
    SitePlaces.copyOf(projectId, place, collection).drop()
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

  /** Where `collection`'s rows of `place` are kept, in this browser. */
  private static copyOf(projectId: string, place: SitePlace, collection: string): BrowserCopy {
    return new BrowserCopy({ key: `${SAMPLE_ROWS_KEY}:${projectId}:${place.path}:${collection}` })
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

/** The key the Data tab's sample rows are kept under, before the project, place and collection. */
const SAMPLE_ROWS_KEY = "spell-site-samples"
