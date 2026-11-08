import {
  PlaceError,
  type ChangesAnswer,
  type ListAnswer,
  type ListQuery,
  type Place,
  type PlaceCapabilities,
  type PlaceContext,
  type PlaceRow
} from "spell/places/places.types"
import { FEED_POSTS, FEED_SPACE, INBOX_SPACE } from "spell/app/spaces/models/spaceNames"

/** What it can do:  read only, every post at once;  the page ranks and sorts them, as its program says. */
const CAPABILITIES: PlaceCapabilities = {
  kind: "person's feed",
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

/** Joins a space's address and a post's own id into the feed's id:  `events_team@rs/news~p-12`. */
const ID_JOIN = "~"

/** The field each feed row names its space in:  `events_team@rs/news`. */
export const FEED_SPACE_FIELD = "space"

/****************
 * ### `PersonFeed`
 * One person's FEED in an org (epic `atmosphere` P33):  `bo@rs/__feed`, what's new across every space of the org he
 * may read, put together each time he asks.
 *
 * ```spell
 * my feed is a data folder at "@rs/__feed":
 * 	- keep a copy on this device
 * ```
 *
 * - `@rs/__feed` is whoever's asking's own (`SpaceFolders`, the kit's `PERSON_FEED_ADDRESS`):  one program, each
 *   person's feed.
 * - Each space's `posts` (`FEED_POSTS`), read through its own place AS HIM:  so its read check, its takedowns and
 *   its public settings hold here too, and a space he can't read is left out.
 *   - Each row is the post as its space has it, its id the space's address and its own (`events_team@rs/news~p-12`),
 *     and its `space` field saying where it's from.
 *   - Left out:  every inbox (messages are the inbox's), and a quiet event's spaces (`OrgEvents.isQuietAt()`).
 * - Ranking and sorting are the PAGE's:  its program says what counts, and Bo changes it by changing his copy of the
 *   program.  This place sorts nothing.
 * - Only what CHANGED, the second time:  its version is each space's own, so `changesSince()` asks each space what
 *   changed since then (`FolderPlace.changesSince()`), and a space gone from his feed has its posts removed.
 * - Read only:  a post is written in its own space.
 * - Node only;  knows nothing of pages:  its page is the built-in program `@spell/examples/OrgFeed`.
 * - Left out:  a feed for millions, worked out on a server ahead of time;  this one is for communities of hundreds.
 ****************/
export class PersonFeed implements Place {
  /** Its org's id:  `rs`. */
  readonly org: string
  /** Whose it is, by address:  `bo@rs`. */
  readonly person: string
  /** Every space's own folder under the org's that holds posts, by address (`MemberLists.spacesOf()`). */
  private readonly spacesOf: PersonFeedProps["spacesOf"]
  /** The place of the space at `address`. */
  private readonly placeAt: PersonFeedProps["placeAt"]
  /** Is the space at `address` a quiet event's? */
  private readonly isQuietAt: PersonFeedProps["isQuietAt"]

  constructor({ person, spacesOf, placeAt, isQuietAt }: PersonFeedProps) {
    this.person = person
    this.org = person.slice(person.indexOf("@") + 1)
    this.spacesOf = spacesOf
    this.placeAt = placeAt
    this.isQuietAt = isQuietAt
  }

  /** The feed `address` is, `bo@rs/__feed` => `bo@rs`:  `undefined` for any other address. */
  static personAt(address: string): string | undefined {
    const [account = "", folder, ...more] = address.split("/")
    return folder === FEED_SPACE && !more.length && /^[^@]+@[^@]+$/.test(account) ? account : undefined
  }

  /** What it can do:  see the class. */
  describe(): PlaceCapabilities {
    return CAPABILITIES
  }

  ////////////////
  // ## Reading
  ////////////////

  /**
   * Every post in every space of the org he may read, in no order:  see the class.
   * - throws `PlaceError` `"not found"` for any collection but `posts`
   */
  async list(collection: string, _query: ListQuery, context: PlaceContext = {}): Promise<ListAnswer> {
    postsOrDie(collection)
    const versions: Record<string, string> = {}
    const rows: PlaceRow[] = []
    for (const { address, place } of await this.sources()) {
      const answer = await readOrNone(() => place.list(FEED_POSTS, {}, this.asHim(context)))
      if (!answer) continue
      versions[address] = answer.version ?? ""
      rows.push(...answer.rows.map((row) => feedRowOf(address, row)))
    }
    return { rows, handled: {}, version: JSON.stringify(versions) }
  }

  /**
   * What changed since `token` (a list's `version`, or an earlier answer's `token`):  each space asked what changed in
   * it since its own version;  a space new to his feed whole, and one gone from it removed.
   * - throws `PlaceError` `"not found"` for any collection but `posts`
   */
  async changesSince(collection: string, token: string, context: PlaceContext = {}): Promise<ChangesAnswer> {
    postsOrDie(collection)
    const before = versionsIn(token)
    const now: Record<string, string> = {}
    const rows: PlaceRow[] = []
    const removed: string[] = []
    for (const { address, place } of await this.sources()) {
      const since = before[address]
      const changes =
        since === undefined
          ? await readOrNone(async () => {
              const answer = await place.list(FEED_POSTS, {}, this.asHim(context))
              return { rows: answer.rows, removed: [], token: answer.version ?? "" }
            })
          : await readOrNone(() => place.changesSince!(FEED_POSTS, since, this.asHim(context)))
      if (!changes) continue
      now[address] = changes.token
      rows.push(...changes.rows.map((row) => feedRowOf(address, row)))
      removed.push(...changes.removed.map((id) => feedIdOf(address, id)))
    }
    for (const address of Object.keys(before)) if (!(address in now)) removed.push(...(await this.idsIn(address)))
    return { rows, removed, token: JSON.stringify(now) }
  }

  /** Every space's place he might read posts in:  every one of the org's but the inboxes and quiet events'. */
  private async sources(): Promise<{ address: string; place: Place }[]> {
    const found: { address: string; place: Place }[] = []
    for (const address of await this.spacesOf(this.org)) {
      if (address.split("/").includes(INBOX_SPACE) || (await this.isQuietAt(address))) continue
      const place = await this.placeAt(address)
      if (place?.changesSince) found.push({ address, place })
    }
    return found
  }

  /** The feed's ids of every post in the space at `address`, read as Spell:  for a space gone from his feed. */
  private async idsIn(address: string): Promise<string[]> {
    const place = await this.placeAt(address)
    const answer = place && (await readOrNone(() => place.list(FEED_POSTS, {}, {})))
    return (answer?.rows ?? []).map((row) => feedIdOf(address, `${row.id}`))
  }

  /** `context`, asked as him:  whoever the route says is asking, it's his feed. */
  private asHim(context: PlaceContext): PlaceContext {
    return { ...context, identity: this.person }
  }
}

/** Constructor props of `PersonFeed`. */
export type PersonFeedProps = {
  /** Whose it is, by address:  `bo@rs`. */
  person: string
  /** Every space's own folder under org `org`'s that holds posts, by address:  `MemberLists.spacesOf()`. */
  spacesOf: (org: string) => Promise<string[]>
  /** The place of the space at `address`:  `undefined` for none. */
  placeAt: (address: string) => Promise<Place | undefined>
  /** Is the space at `address` a quiet event's (`OrgEvents.isQuietAt()`)? */
  isQuietAt: (address: string) => Promise<boolean>
}

////////////////
// ## Helpers
////////////////

/** Throw unless `collection` is `posts`, the one a feed holds. */
function postsOrDie(collection: string): void {
  if (collection === FEED_POSTS) return
  throw new PlaceError(`A feed holds posts, not ${collection}`, { cause: { kind: "not found" } })
}

/** `row` from the space at `address`, as the feed shows it:  its id the feed's, its `space` where it's from. */
function feedRowOf(address: string, row: PlaceRow): PlaceRow {
  return { ...row, id: feedIdOf(address, `${row.id}`), [FEED_SPACE_FIELD]: address }
}

/** The feed's id of the post `id` in the space at `address`. */
function feedIdOf(address: string, id: string): string {
  return `${address}${ID_JOIN}${id}`
}

/** The spaces' versions a feed's token holds:  `{}` for a token that isn't one. */
function versionsIn(token: string): Record<string, string> {
  try {
    const versions: unknown = JSON.parse(token)
    return versions && typeof versions === "object" ? (versions as Record<string, string>) : {}
  } catch {
    return {}
  }
}

/**
 * What `read` answers, or `undefined` where the space says no:  one he isn't a member of, or one taken down.
 * - Anything else throws:  a feed that silently left a space out for a broken disk would mislead him.
 */
async function readOrNone<T>(read: () => Promise<T>): Promise<T | undefined> {
  try {
    return await read()
  } catch (error) {
    if (error instanceof PlaceError && (error.cause?.kind === "refused" || error.cause?.kind === "not found")) {
      return undefined
    }
    throw error
  }
}
