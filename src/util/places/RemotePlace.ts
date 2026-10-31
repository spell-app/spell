import {
  type ApplyAnswer,
  type ChangesAnswer,
  type ListAnswer,
  type ListQuery,
  type Place,
  type PlaceCapabilities,
  type PlaceChange,
  type PlaceContext,
  type PlaceErrorKind,
  type PlaceRow,
  type SelectingContext
} from "./places.types"
import { jsonIn, WebPlace } from "./WebPlace"

/** What it assumes a place on a server side does:  it's told what's done on each answer, in `handled`. */
const REMOTE_CAPABILITIES: PlaceCapabilities = {
  idOf: "id",
  filter: "none",
  sort: "none",
  select: "none",
  page: "none",
  write: ["insert", "update", "delete"],
  atomic: false,
  versionCheck: true,
  live: "poll",
  abort: "hard"
}

/** What a server side's answers say about the things in them. */
type WithVersions = {
  /** Each thing's version, by id. */
  versions?: Record<string, string>
}

/** The header `Guard` checks. */
const TOKEN_HEADER = "x-server-token"

/** What a server side's guard answers with a stale token:  the server restarted, so it's no answer about the change. */
const GUARD_STATUS = 403

/** `PlaceServer`'s answer when doing a query in full would load too much. */
const OVER_CEILING_STATUS = 413

/** `PlaceServer`'s answer when someone got there first. */
const OUT_OF_DATE_STATUS = 409

/****************
 * ### `RemotePlace`
 * In a browser, any place that's on a server side:  it speaks to a `PlaceServer` (`spell/server/places`) (epic `data` P5, J9).
 *
 * ```ts
 * new RemotePlace({ url: "/api/places/recipes" })
 * ```
 *
 * - One way to reach a folder, or a service whose key must never ship in a page.
 * - NOT `ServerPlace`, in `spell/util/persist`, which holds only preferences, and never throws because a failed read just
 *   means the default.  This one holds a program's data, so it throws, as every `Place` does, and resends on no answer.
 * - What the place does, it says on each answer (`handled`), so `can` needs saying only for `idOf`, and for what the
 *   compiler should know.  `describe()` can't ask:  it answers at once.
 * - A change's id goes with it in the request:  the server makes it once.
 * - Sends this page's write token (`window.SPELL_SERVER.token`) with every request, reads too, since a read can spend a key.
 *   - A token gone stale (the server restarted) is no answer, so a change waits for the reload, and isn't dropped.
 * - Never holds a key, so it takes no `keyNamed`.
 ****************/
export class RemotePlace extends WebPlace implements Place {
  /** What it says it can do. */
  private readonly capabilities: PlaceCapabilities
  /** Each thing's version, as last shown, by collection and id. */
  private readonly seenVersions = new Map<string, string>()
  /** The token to send, when it's not the page's. */
  private readonly token: string | undefined

  constructor({ url, can, token }: RemotePlaceProps) {
    super({ url, changeIdHeader: false })
    this.capabilities = { ...REMOTE_CAPABILITIES, ...can }
    this.token = token
  }

  /** What it can do:  `can`, since a server's answer can't be waited for here. */
  describe(): PlaceCapabilities {
    return this.capabilities
  }

  /** The rows of `collection` that `query` asks for:  the place behind it does what it can, and says. */
  async list(collection: string, query: ListQuery, context: PlaceContext): Promise<ListAnswer> {
    const { versions, ...answer } = await this.ask<ListAnswer & WithVersions>("list", { collection, query }, context)
    this.note(collection, versions)
    return answer
  }

  /** The rows of `collection` with these ids. */
  async getMany(collection: string, ids: readonly string[], context: SelectingContext): Promise<PlaceRow[]> {
    const body = { collection, ids, ...(context.select && { select: context.select }) }
    const { rows, versions } = await this.ask<{ rows: PlaceRow[] } & WithVersions>("getMany", body, context)
    this.note(collection, versions)
    return rows
  }

  /**
   * Make these changes.
   * - throws `PlaceError`:  refused, not found or out of date;  anything else for no answer
   */
  async apply(changes: readonly PlaceChange[], context: PlaceContext): Promise<ApplyAnswer> {
    const { versions, ...answer } = await this.ask<
      ApplyAnswer & { versions?: Record<string, WithVersions["versions"]> }
    >("apply", { changes }, context)
    for (const [collection, ofIt] of Object.entries(versions ?? {})) this.note(collection, ofIt)
    return answer
  }

  /** Run the operation the place calls `name`. */
  async call(name: string, input: unknown, context: SelectingContext): Promise<unknown> {
    const { result } = await this.ask<{ result: unknown }>("call", { name, input }, context)
    return result
  }

  /** What changed in `collection` since `token`. */
  changesSince(collection: string, token: string, context: PlaceContext): Promise<ChangesAnswer> {
    return this.ask<ChangesAnswer>("changes", { collection, token }, context)
  }

  /** The version of this thing as it was last shown. */
  versionOf(collection: string, id: string): string | undefined {
    return this.seenVersions.get(`${collection}\n${id}`)
  }

  /** A server side says "out of date" with a 409, and "too much" with a 413. */
  protected errorKindFor(status: number): PlaceErrorKind {
    if (status === OUT_OF_DATE_STATUS) return "out of date"
    if (status === OVER_CEILING_STATUS) return "over the ceiling"
    return super.errorKindFor(status)
  }

  /** A stale token isn't an answer about the request:  see the class. */
  protected isAnAnswer(status: number | undefined): boolean {
    return status !== GUARD_STATUS && super.isAnAnswer(status)
  }

  /** Ask the server side.  - throws as `WebPlace.answerTo()` */
  private async ask<T>(what: string, data: object, context: PlaceContext): Promise<T> {
    const token = this.token ?? pageToken()
    const response = await this.answerTo(
      {
        url: `${this.url}/${what}`,
        urlData: {},
        method: "POST",
        data,
        ...(token !== undefined && { headers: { [TOKEN_HEADER]: token } })
      },
      context
    )
    return (await jsonIn(response)) as T
  }

  /** Remember what a server side said of these things. */
  private note(collection: string, versions: WithVersions["versions"]): void {
    for (const [id, version] of Object.entries(versions ?? {})) this.seenVersions.set(`${collection}\n${id}`, version)
  }
}

/** Constructor props of a `RemotePlace`. */
export type RemotePlaceProps = {
  /** Where the place is served:  `PlaceServer`'s prefix, then its name:  `/api/places/recipes`. */
  url: string
  /** What the place behind it does, over a plain one:  `idOf`, above all, when it isn't `id`. */
  can?: Partial<PlaceCapabilities>
  /** The token to send, when it isn't this page's own server's. */
  token?: string
}

/** The write token of the server that served this page. */
function pageToken(): string | undefined {
  return (globalThis as { SPELL_SERVER?: { token?: string } }).SPELL_SERVER?.token
}
