import {
  PlaceError,
  THREAD_PARAM,
  THREADS_COLLECTION,
  type ListAnswer,
  type ListQuery,
  type Place,
  type PlaceCapabilities,
  type PlaceContext,
  type PlaceRow
} from "spell/places/places.types"
import { THREAD_MESSAGES, THREADS_SPACE } from "spell/app/spaces/models/spaceNames"
import type { NamedSpace } from "spell/app/spaces/server/node/people/OrgRoles"

/** What it can do:  read only, every thread at once;  the page lists them as its program says. */
const CAPABILITIES: PlaceCapabilities = {
  kind: "person's threads",
  idOf: "id",
  makesIds: false,
  filter: "none",
  sort: "none",
  select: "none",
  page: "none",
  write: [],
  whoWrites: "its members",
  atomic: false,
  live: "poll",
  abort: "soft",
  identifiesBy: "this machine"
}

/** Joins a thread's room and an ad-hoc thread's own id into its row's id:  `@rs/messages~picnic-planning`. */
const ID_JOIN = "~"

/****************
 * ### `PersonThreads`
 * One person's THREADS in an org (epic `atmosphere` P37, T53):  `bo@rs/__threads`, every chat thread of the org he may
 * read, put together each time he asks, for the built-in Chat's list down its side.
 *
 * ```spell
 * my threads is a data folder at "@rs/__threads"
 * ```
 *
 * - `@rs/__threads` is whoever's asking's own (`SpaceFolders`, the kit's `PERSON_THREADS_ADDRESS`):  one program,
 *   each person's list.
 * - Which threads:  the open one of every paired space's shared side (`OrgRoles.pairedSpacesOf()`), everyone in the
 *   org reading it;  the organizers' one of each private side he manages;  and the org's ad-hoc ones, its `threads`,
 *   read as him.
 *   - An org with no Admin space (Spell's own, the family cookbook's):  its own open thread, `@spell/messages`.
 * - Each row:  `name` (whose:  "Events Team"), `side` ("shared", "private", "ad hoc"), `thread` (the room it's in,
 *   `events_team@rs/messages`) and `link`, the page's address showing it (`?thread=events_team@rs/messages`).
 *   - An ad-hoc thread's messages are in the org's own room, naming it in their `thread`:  its row's `thread` is that
 *     room, its `topic` its own id.
 * - Read only, and sorted by nothing:  the page sorts.
 * - Node only;  knows nothing of pages:  its page is the built-in program `@spell/examples/OrgChat`.
 ****************/
export class PersonThreads implements Place {
  /** Its org's id:  `rs`. */
  readonly org: string
  /** Whose it is, as the org's file names them:  `bo@rs`, or a Spell account, `owen@spell`. */
  readonly person: string
  /** Every paired space of the org, with its name. */
  private readonly spacesOf: PersonThreadsProps["spacesOf"]
  /** Is the person at `who` in org `org`? */
  private readonly isInOrg: PersonThreadsProps["isInOrg"]
  /** Who manages the space `space` today. */
  private readonly managersOf: PersonThreadsProps["managersOf"]
  /** The place of the space at `address`. */
  private readonly placeAt: PersonThreadsProps["placeAt"]
  /** What people call org `org`:  its own thread's name, where it has no Admin space. */
  private readonly orgNameOf: PersonThreadsProps["orgNameOf"]

  constructor({ person, org, spacesOf, isInOrg, managersOf, placeAt, orgNameOf }: PersonThreadsProps) {
    this.orgNameOf = orgNameOf
    this.person = person
    this.org = org
    this.spacesOf = spacesOf
    this.isInOrg = isInOrg
    this.managersOf = managersOf
    this.placeAt = placeAt
  }

  /** The list `address` is, `bo@rs/__threads` => `bo@rs`:  `undefined` for any other address. */
  static personAt(address: string): string | undefined {
    const [account = "", folder, ...more] = address.split("/")
    return folder === THREADS_SPACE && !more.length && /^[^@]+@[^@]+$/.test(account) ? account : undefined
  }

  /** What it can do:  see the class. */
  describe(): PlaceCapabilities {
    return CAPABILITIES
  }

  /**
   * Every thread of the org he may read, in no order:  see the class.
   * - None for someone outside the org.
   * - throws `PlaceError` `"not found"` for any collection but `threads`
   */
  async list(collection: string, _query: ListQuery, context: PlaceContext = {}): Promise<ListAnswer> {
    if (collection !== THREADS_COLLECTION) {
      throw new PlaceError(`A thread list holds threads, not ${collection}`, { cause: { kind: "not found" } })
    }
    if (!(await this.isInOrg(this.org, this.person))) return { rows: [], handled: {} }
    const rows: PlaceRow[] = []
    const spaces = await this.spacesOf(this.org)
    // an org with no Admin space has no paired spaces:  its own open thread alone
    if (!spaces.length)
      rows.push(threadRowOf(await this.orgNameOf(this.org), "shared", `@${this.org}/${THREAD_MESSAGES}`))
    for (const space of spaces) {
      if (space.side === "private" && !(await this.managersOf(space)).includes(this.person)) continue
      rows.push(threadRowOf(space.name, space.side, `${space.address}/${THREAD_MESSAGES}`))
    }
    rows.push(...(await this.adHocThreads(context)))
    return { rows, handled: {} }
  }

  /** The org's ad-hoc threads, its shared space's `threads` read as him:  none where he can't read them. */
  private async adHocThreads(context: PlaceContext): Promise<PlaceRow[]> {
    const room = `@${this.org}/${THREAD_MESSAGES}`
    try {
      const place = await this.placeAt(`@${this.org}`)
      const answer = await place?.list(THREADS_COLLECTION, {}, { ...context, identity: this.person })
      return (answer?.rows ?? []).map((row) => ({
        ...threadRowOf(`${row.name ?? row.id}`, "ad hoc", room),
        id: `${room}${ID_JOIN}${row.id}`,
        topic: `${row.id}`
      }))
    } catch (error) {
      if (error instanceof PlaceError) return []
      throw error
    }
  }
}

/** Constructor props of `PersonThreads`. */
export type PersonThreadsProps = {
  /** Whose it is, as the org's file names them:  `bo@rs`, or a Spell account, `owen@spell`. */
  person: string
  /** Its org's id:  `rs`.  Not the person's own:  a Spell account's is `spell`. */
  org: string
  /** Every paired space of org `org`, with its name:  `OrgRoles.pairedSpacesOf()`. */
  spacesOf: (org: string) => Promise<NamedSpace[]>
  /** Is `who` in org `org`:  `OrgRoles.isInOrg()`. */
  isInOrg: (org: string, who: string) => Promise<boolean>
  /** Who manages `space` today, by address:  `OrgRoles.managersOfSpace()`. */
  managersOf: (space: NamedSpace) => Promise<string[]>
  /** The place of the space at `address`:  `undefined` for none. */
  placeAt: (address: string) => Promise<Place | undefined>
  /** What people call org `org`, as its file says it:  `OrgRoles.orgName()`. */
  orgNameOf: (org: string) => Promise<string>
}

////////////////
// ## Helpers
////////////////

/** A thread's row:  its id its room, and the page's address showing it. */
function threadRowOf(name: string, side: string, thread: string): PlaceRow {
  return { id: thread, name, side, thread, topic: "", link: `?${THREAD_PARAM}=${encodeURIComponent(thread)}` }
}
