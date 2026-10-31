import { LoadOnce } from "spell/util/LoadOnce"

import { MemoryPlace } from "./MemoryPlace"
import type { Places } from "./Places"
import { BrowserCopy } from "./SaveQueue"
import {
  idOfRow,
  type ApplyAnswer,
  type ChangesAnswer,
  type ListAnswer,
  type ListQuery,
  type Place,
  type PlaceCapabilities,
  type PlaceChange,
  type PlaceContext,
  type PlaceRow,
  type SelectingContext
} from "./places.types"

/** How many records it copies from the real place, or makes. */
const SAMPLE_RECORDS = 5

/** How long it waits for the real place's records, ms:  a slow place is one reason to want a sample. */
const REAL_PLACE_WAIT_MS = 3000

/** The store a sample's records are kept in on this device. */
const SAMPLE_STORE = "spell-samples"

/** All a sample keeps of the place it stands in for:  no way to write it. */
export type PlaceToCopy = Pick<Place, "describe" | "list">

/** Where a sample's records came from. */
export const SampleSources = ["kept", "the real place", "the type", "nothing"] as const
/**
 * Where a sample's records came from:
 * - `"kept"`:  from an earlier visit, on this device
 * - `"the real place"`:  copied from it
 * - `"the type"`:  made up from what the type declares
 * - `"nothing"`:  it starts empty
 */
export type SampleSource = (typeof SampleSources)[number]

/****************
 * ### `SamplePlace`
 * Editable records that stand in for a real place while designing, with the line that declares the real one untouched.
 * - Always writable, whatever the real place allows.
 * - Reads the real place once per collection, for its first records, and NEVER writes it:  its type holds no way to.
 * - First records:  what's kept from an earlier visit, else a few copied from the real place when it answers in time,
 *   else what `rowsFromType` makes, else none.
 * - Copied records may be private, so they stay on this device, in the browser's storage:
 *   nothing here writes a file, so nothing reaches git (epic `data` J2).
 * - Says the real place's `kind` and `idOf`, so a thing keeps its identity across the swap.
 *   A real place whose rows have no ids:  each record gets one, so a sample of it can still be changed.
 * - Taken by file, `spell/util/places/SamplePlace`, in NO barrel, and nothing a program loads imports it:
 *   so a built app leaves it out, and a sample can't ship.
 ****************/
export class SamplePlace extends MemoryPlace {
  /** The place it stands in for. */
  private readonly real: PlaceToCopy
  /** Makes records for a collection the real place has none of. */
  private readonly rowsFromType: ((collection: string) => readonly PlaceRow[] | undefined) | undefined
  /** Keeps its records on this device. */
  private readonly copy: BrowserCopy
  /** Where each collection's records came from. */
  private readonly sources = new Map<string, SampleSource>()
  /** Each collection's first records, once they've been found. */
  private readonly firstRecords = new LoadOnce<string, void>({ failures: "forgotten" })
  /** The field holding a row's id. */
  private readonly idField: string

  /** How long it waits for the real place's records, ms. */
  private readonly realPlaceWait: number

  constructor({ real, rowsFromType, keepAs, storage, realPlaceWait = REAL_PLACE_WAIT_MS }: SamplePlaceProps) {
    const copy = new BrowserCopy({ ...(keepAs !== undefined && { key: keepAs }), ...(storage && { storage }) })
    const kept = copy.kept<Record<string, PlaceRow[]>>()
    const { kind, idOf = "id" } = real.describe()
    const capabilities: Partial<PlaceCapabilities> = {
      ...(kind !== undefined && { kind }),
      idOf,
      isSample: true,
      write: ["insert", "update", "delete"],
      versionCheck: false,
      live: "none"
    }
    super({ capabilities, ...(kept && { collections: kept }) })
    this.real = real
    this.rowsFromType = rowsFromType
    this.copy = copy
    this.idField = idOf
    this.realPlaceWait = realPlaceWait
    for (const collection of Object.keys(kept ?? {})) this.sources.set(collection, "kept")
  }

  /** Where `collection`'s records came from:  `undefined` before it's been read. */
  sourceOf(collection: string): SampleSource | undefined {
    return this.sources.get(collection)
  }

  ////////////////
  // ## As a place
  ////////////////

  /** The rows `query` asks for, its first records found first. */
  async list(collection: string, query: ListQuery, context: PlaceContext = {}): Promise<ListAnswer> {
    await this.firstRecordsOf(collection, query)
    return super.list(collection, query, context)
  }

  /** The rows with these ids, its first records found first. */
  async getMany(collection: string, ids: readonly string[], context: SelectingContext = {}): Promise<PlaceRow[]> {
    await this.firstRecordsOf(collection, {})
    return super.getMany(collection, ids, context)
  }

  /** What changed since `token`, its first records found first. */
  async changesSince(collection: string, token: string, context: PlaceContext = {}): Promise<ChangesAnswer> {
    await this.firstRecordsOf(collection, {})
    return super.changesSince(collection, token, context)
  }

  /**
   * Make these changes, here and nowhere else, and keep the lot on this device.
   * - A change to a collection it hasn't read:  its first records are found first, so they aren't lost.
   */
  async apply(changes: readonly PlaceChange[], context: PlaceContext = {}): Promise<ApplyAnswer> {
    for (const { collection } of changes) await this.firstRecordsOf(collection, {})
    const answer = await super.apply(changes, context)
    this.copy.keep(this.everyCollection)
    return answer
  }

  ////////////////
  // ## Its first records
  ////////////////

  /** Find `collection`'s first records, once. */
  private firstRecordsOf(collection: string, { select }: ListQuery): Promise<void> {
    if (this.holdsCollection(collection)) return Promise.resolve()
    return this.firstRecords.get(collection, async () => {
      const copied = await this.copiedFromReal(collection, select)
      const made = copied?.length ? undefined : this.rowsFromType?.(collection)
      const rows = copied?.length ? copied : (made ?? [])
      this.startCollection(collection, this.withIds(rows, collection))
      const source = copied?.length ? "the real place" : made?.length ? "the type" : "nothing"
      this.sources.set(collection, source)
    })
  }

  /**
   * A few of the real place's records, as copies:  `undefined` when it can't be reached in time.
   * - `select`:  what the read asked for:  a place may leave out what isn't named, such as the bodies of a folder of files.
   * - NEVER throws:  a place that can't answer is one reason to want a sample.
   */
  private async copiedFromReal(collection: string, select: ListQuery["select"]): Promise<PlaceRow[] | undefined> {
    const signal = AbortSignal.timeout(this.realPlaceWait)
    const query: ListQuery = { page: { size: SAMPLE_RECORDS }, ...(select && { select }) }
    try {
      const { rows } = await LoadOnce.abortable(this.real.list(collection, query, { signal }), signal)
      return structuredClone(rows.slice(0, SAMPLE_RECORDS))
    } catch (error) {
      console.info(`SamplePlace:  couldn't copy "${collection}" from the real place;  making it up instead`, error)
      return undefined
    }
  }

  /** `rows`, each with an id:  its own, or one made here. */
  private withIds(rows: readonly PlaceRow[], collection: string): PlaceRow[] {
    return rows.map((row, index) =>
      idOfRow(row, this.idField) === undefined ? { ...row, [this.idField]: `${collection}-${index + 1}` } : row
    )
  }
}

/** Constructor props of a `SamplePlace`. */
export type SamplePlaceProps = {
  /** The place it stands in for. */
  real: PlaceToCopy
  /** Makes records for a collection when the real place gives none:  what `rowsMadeFrom()` is for. */
  rowsFromType?: (collection: string) => readonly PlaceRow[] | undefined
  /** What to keep its records under on this device.  Left out:  they end with the page. */
  keepAs?: string
  /** Finds where they're kept:  `BrowserCopyProps.storage`. */
  storage?: Places["storage"]
  /** How long to wait for the real place's records, ms:  3 seconds, unless it's told otherwise. */
  realPlaceWait?: number
}

/** What `useSample()` is told. */
export type UseSampleProps = {
  /** Makes records from a type, by its name, when the real place gives none:  `rowsMadeFrom()`, for the core's classes. */
  rowsFromType?: (type: string) => readonly PlaceRow[] | undefined
}

/** The sample made for each name, for the life of its `Places`:  so going back and forth keeps what was shaped. */
const SAMPLES = new WeakMap<Places, Map<string, SamplePlace>>()

/**
 * A sample behind `placeName`, in place of the real place, until `useRealPlace()`:  everything showing now shows it.
 * - The declaration doesn't change:  it's still that name, and `Places.originOf()` says `isSample`.
 * - The same sample each time, for this `Places`;  across visits only with `PlacesProps.keepPendingAs`.
 * - Already using it:  it's handed back.
 * - Resolves to it, once everything showing has its rows.
 * - throws `PlaceError` if nothing goes by that name
 */
export async function useSample(
  places: Places,
  placeName: string,
  { rowsFromType }: UseSampleProps = {}
): Promise<SamplePlace> {
  const behind = places.placeForOrDie(placeName)
  if (behind instanceof SamplePlace) return behind
  let samples = SAMPLES.get(places)
  if (!samples) SAMPLES.set(places, (samples = new Map()))
  let sample = samples.get(placeName)
  if (!sample) {
    const keepAs = places.keyOnDevice(SAMPLE_STORE, placeName)
    const { storage } = places
    sample = new SamplePlace({
      real: behind,
      rowsFromType: (collection) => {
        const type = places.typeReadFrom(placeName, collection)
        return type === undefined ? undefined : rowsFromType?.(type)
      },
      ...(keepAs !== undefined && { keepAs }),
      ...(storage && { storage })
    })
    samples.set(placeName, sample)
  }
  await places.useInstead(placeName, sample)
  return sample
}

/**
 * The real place behind `placeName` again:  everything showing now shows it, what the sample holds stays with the sample,
 * and what was waiting for the real place goes.
 * - Not using a sample:  nothing happens.
 */
export function useRealPlace(places: Places, placeName: string): Promise<void> {
  return places.backToDeclared(placeName)
}
