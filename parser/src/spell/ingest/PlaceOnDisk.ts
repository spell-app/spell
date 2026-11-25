import type {
  CollectionDescription,
  PlaceDescription,
  PlaceDescriptionOnDisk,
  PlaceState,
  ReadOfType
} from "./ingest.types"

/****************
 * ### A place's description on disk
 * How `<Name>.api.json5` is written and read:  what every collection agrees on, said once (`allCollections`).
 * - `descriptionOnDisk()` writes it so;  `descriptionFromDisk()` reads it back whole, each collection with it all.
 * - ONE reading for everything that reads a description (epic `data` P52, J261):
 *   the ingest, `PlaceNerd` (the site data panel), the place's reference page.
 * - PURE:  types only, no node, no parser, so the editor's bundle takes it without the ingest.
 ****************/

/** A collection's settings that are often the same in every one, written once in `allCollections` when they are. */
const SHARED_SETTINGS = ["idField", "idIsAnAddress", "paging", "rowsAt", "nextAt", "listsGive"] as const

/**
 * `description` as it's written:  what every collection agrees on, once, in `allCollections`;  each collection only what differs.
 * - Only for two collections or more:  one has nothing to share.
 */
export function descriptionOnDisk(description: PlaceDescription): PlaceDescriptionOnDisk {
  const { collections, ...rest } = description
  const each = Object.values(collections)
  const allCollections: Partial<CollectionDescription> = {}
  if (each.length > 1) {
    for (const setting of SHARED_SETTINGS) {
      const values = new Set(each.map((collection) => JSON.stringify(collection[setting])))
      const [only] = values
      if (values.size === 1 && only !== undefined) Object.assign(allCollections, { [setting]: JSON.parse(only) })
    }
  }
  const shared = Object.keys(allCollections)
  const own = Object.fromEntries(
    Object.entries(collections).map(([name, collection]) => [
      name,
      Object.fromEntries(Object.entries(collection).filter(([key]) => !shared.includes(key)))
    ])
  )
  // what it is and what it holds first, as a person reads it;  the rest after
  const { about, canDo, ...after } = rest
  return {
    about,
    canDo,
    ...(shared.length && { allCollections }),
    collections: own,
    ...after
  } as PlaceDescriptionOnDisk
}

/** A description as it's read:  each collection with what `allCollections` says, its own settings winning. */
export function descriptionFromDisk({
  allCollections,
  collections,
  ...rest
}: PlaceDescriptionOnDisk): PlaceDescription {
  const each = Object.entries(collections).map(([name, collection]) => [
    name,
    withState(withMaxSize({ ...allCollections, ...collection }))
  ])
  // the lines it wrote, each bare:  an older version bulleted them, `- its "url" is text` (epic `language` P46)
  const spell = rest.spell?.map((line) => line.replace(/^(\t*)- /, "$1"))
  return { ...rest, ...(spell ? { spell } : {}), collections: Object.fromEntries(each) } as PlaceDescription
}

/** A read through the Spell, as a collection's state:  verified with the rows it found, or failed with why. */
export function stateOfRead({ rows, problem, readByTheLook }: ReadOfType, at: string): PlaceState {
  return {
    is: problem ? "failed" : "verified",
    at,
    rows,
    ...(problem !== undefined && { reason: problem }),
    ...(readByTheLook && { readByTheLook })
  }
}

/**
 * A collection as it's read, its older `readThrough` as its `state` (epic `data` P49):  a description written before
 * says what a read through the Spell found there.
 */
function withState(
  collection: Partial<CollectionDescription> & { readThrough?: ReadOfType }
): Partial<CollectionDescription> {
  const { readThrough, ...rest } = collection
  if (!readThrough || rest.state) return rest
  return { ...rest, state: stateOfRead(readThrough, "") }
}

/**
 * A collection as it's read, its older `mostBytes` as its `maxSize`:  a description written before the rename still
 * gives its list the room it was given.
 */
function withMaxSize(
  collection: Partial<CollectionDescription> & { mostBytes?: number }
): Partial<CollectionDescription> & { readThrough?: ReadOfType } {
  const { mostBytes, ...rest } = collection
  if (mostBytes === undefined || rest.maxSize !== undefined) return rest
  return { ...rest, maxSize: mostBytes }
}
