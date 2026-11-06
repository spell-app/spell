import { DEFAULT_CORNER } from "./AtProtoPlace"
import type { AtProtoSpace } from "./AtProtoSpace"
import {
  OWNER_FIELD,
  PlaceError,
  writeAnswerFor,
  type ApplyAnswer,
  type ListAnswer,
  type ListQuery,
  type Place,
  type PlaceCapabilities,
  type PlaceChange,
  type PlaceRow,
  type WriteAnswer,
  type WriteQuestion
} from "./places.types"

/** The field holding a row's id:  its record's key. */
const ID_FIELD = "id"

/** What it can do:  every write, read whole, nothing done for the engine. */
const SPACE_CAPABILITIES: PlaceCapabilities = {
  kind: "atmosphere space",
  idOf: ID_FIELD,
  filter: "none",
  sort: "none",
  select: "none",
  page: "none",
  write: ["insert", "update", "delete"],
  whoWrites: "only the owner",
  atomic: false,
  live: "none",
  abort: "soft"
}

/****************
 * ### `AtProtoSpacePlace`
 * An AT Protocol Space as a place, on one `AtProtoSpace` (epic `atmosphere` P11, the Spaces trial):
 * what the recipe box saves to there.
 * - A collection is its records under the corner (`recipes` is `app.spell.data.recipe`, unless `collections` says).
 * - A read is every writer's records, put together:  the writer set, then each one's host, with the credential.
 *   - A row is its record, its `id` (the record's key) and its `owner` (whose repo it's in).
 *   - Each writer's rows come in turn, the space's authority first:  NOT one shared row per id.
 *     Two writers with the same key are two rows (T2, T7):  merging them is Spell's to build.
 * - A write is the signed-in account's OWN record, as the protocol has it:  anyone else's is refused `"owner"`.
 *   - Signed in as the org's account, as Spell writes (Q6), every row is the org's.
 * - Not atomic, no versions, no live:  each change is one `putRecord`, and the last write wins.
 * - Taken by file, in no barrel:  a trial, kept out of the product (Q2).
 ****************/
export class AtProtoSpacePlace implements Place {
  /** The space. */
  readonly space: AtProtoSpace
  /** Who's signed in:  whose records it writes. */
  private readonly me: () => string | undefined
  /** Each collection's full name, by its name here. */
  private readonly collections: Record<string, string>
  /** Whose each row read is, by `<collection>\n<id>`:  so a change to someone else's is refused here. */
  private readonly owners = new Map<string, string>()

  constructor({ space, me, collections = {} }: AtProtoSpacePlaceProps) {
    this.space = space
    this.me = me
    this.collections = collections
  }

  /** What it can do. */
  describe(): PlaceCapabilities {
    return SPACE_CAPABILITIES
  }

  /** Every writer's rows of `collection`, the authority's first.  - throws `SpaceRefusal` */
  async list(collection: string, _query: ListQuery): Promise<ListAnswer> {
    const nsid = this.nsidOf(collection)
    const writers = (await this.space.writers()).map(({ did }) => did)
    const authors = [this.space.authority, ...writers.filter((did) => did !== this.space.authority)]
    const rows: PlaceRow[] = []
    for (const author of authors) {
      for (const { rkey, value } of await this.space.records(author, nsid)) {
        rows.push({ ...value, [ID_FIELD]: rkey, [OWNER_FIELD]: author })
        if (!this.owners.has(`${collection}\n${rkey}`)) this.owners.set(`${collection}\n${rkey}`, author)
      }
    }
    return { rows, handled: {} }
  }

  /** Would it take this write?  Only the signed-in account's own rows, and new ones. */
  canWrite({ collection, row, identity = this.me() }: WriteQuestion): WriteAnswer {
    if (!identity) return { canWrite: false, whyNot: "owner" }
    const id = row?.[ID_FIELD]
    const owner =
      row?.[OWNER_FIELD] ?? (id === undefined ? undefined : this.owners.get(`${collection}\n${id as string}`))
    if (owner !== undefined && owner !== identity) return { canWrite: false, whyNot: "owner" }
    return { canWrite: true }
  }

  /**
   * Each change, one at a time, as the signed-in account's own record.
   * - throws `PlaceError` `"refused"`, `"owner"`, for anyone else's;  `SpaceRefusal` for the host's no
   */
  async apply(changes: readonly PlaceChange[]): Promise<ApplyAnswer> {
    const rows: PlaceRow[] = []
    for (const { kind, collection, id, fields = {} } of changes) {
      const answer = writeAnswerFor(this, { collection, kind, row: { ...fields, [ID_FIELD]: id } })
      if (!answer.canWrite || id === undefined) {
        throw new PlaceError(`"${collection}" ${id ?? "(no id)"} isn't yours to change`, {
          cause: { kind: "refused", whyNot: answer.whyNot ?? "place" }
        })
      }
      const nsid = this.nsidOf(collection)
      if (kind === "delete") {
        await this.space.remove(nsid, id)
        this.owners.delete(`${collection}\n${id}`)
        continue
      }
      const { [ID_FIELD]: _id, [OWNER_FIELD]: _owner, ...record } = fields
      await this.space.put(nsid, id, { $type: nsid, ...record })
      this.owners.set(`${collection}\n${id}`, this.me()!)
      rows.push({ ...record, [ID_FIELD]: id, [OWNER_FIELD]: this.me() })
    }
    return { rows }
  }

  /** A collection's full name:  what `collections` says, or its name under the corner, singular. */
  private nsidOf(collection: string): string {
    return this.collections[collection] ?? `${DEFAULT_CORNER}.${collection.replace(/s$/, "")}`
  }
}

/** `AtProtoSpacePlace`'s settings. */
export type AtProtoSpacePlaceProps = {
  /** The space. */
  space: AtProtoSpace
  /** Who's signed in, asked each time:  whose records it writes. */
  me: () => string | undefined
  /** Each collection's full name, by its name here.  Left out:  its name under the corner. */
  collections?: Record<string, string>
}
