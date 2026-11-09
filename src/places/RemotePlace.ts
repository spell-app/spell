import type { ApiError } from "spell/util/fetching"

import { ChunkedPlace } from "./ChunkedPlace"
import type { DeviceCopy } from "./DeviceCopy"
import { EVERY_FIELD, JsonChunks } from "./JsonChunks"
import {
  type ApplyAnswer,
  type ChangesAnswer,
  type ListAnswer,
  type ListQuery,
  type Place,
  type PlaceCapabilities,
  type PlaceChange,
  type PlaceContext,
  PLACE_CREDENTIAL,
  PlaceError,
  idOfRow,
  type PlaceErrorKind,
  type PlaceLines,
  type PlaceRow,
  type PlaceSignIn,
  type SelectingContext,
  type WhyNotWritable,
  type WriteAnswer,
  type WriteQuestion
} from "./places.types"
import { WebChunks } from "./WebChunks"
import { jsonIn, WebPlace } from "./WebPlace"

/** What it assumes a place on a server side does:  it's told what's done on each answer, in `handled`. */
const REMOTE_CAPABILITIES: PlaceCapabilities = {
  kind: "web server",
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

/** Why a write waits, while a place kept in the browser until sign-in has nobody signed in:  it stays pending. */
const NOT_SIGNED_IN = "RemotePlace:  nobody's signed in yet:  it's kept in this browser until someone is"

/** The start of the address a list's copy is kept under, on this device:  then its collection and query. */
const KEPT_LIST = "list:"

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
 * - A program's lines about the place go with every request (`lines`):  never a key, only its name.
 * - A place that says which fields take no write (`ListAnswer.readOnlyFields`) is answered for here (`canWrite()`).
 * - READING DIRECT (`readsAt`, epic `atmosphere` P5, Q6 C):  a space's own folder is read straight from its files,
 *   one plain `GET` of its list (`ChunkedPlace` on `WebChunks`), and only written through the server side.
 *   - So reading works while the server side can't write, or isn't there.
 *   - The read needs a credential for the whole space:  refused, it asks the server side for one (`credential`), which
 *     comes back as a cookie only that address reads, never in the page's own storage;  then reads again, once.
 *   - What it's shown of each thing's version is the list's, as the server side's are:  a change made from it is checked.
 * - KEPT IN THE BROWSER UNTIL SIGN-IN (`can.identifiesBy: "a sign-in"`, the cloud, epic `atmosphere` P8):
 *   with nobody signed in it asks the server side nothing.
 *   - A read is no rows, at once:  what's pending shows on top of it, so a program shows what this browser added.
 *   - A write fails as no answer would, so it stays pending, kept in this browser, and is sent again every few seconds;
 *     once someone signs in, the next try goes up, through the save queue, as any pending change does.
 * - KEPT ON THIS DEVICE (`deviceCopy`, `- keep a copy on this device`;  epic `atmosphere` T51, J158):
 *   each list it read whole is kept, with the version it was read at.
 *   - The next read of that list, on opening again or on a check, asks only what changed since (`changesSince()`), and
 *     puts it on the copy:  a feed of thousands of posts is a few rows a check.
 *   - Only a list the place did nothing to (no filter, sort or page of its own):  so the copy is the whole collection.
 *   - A place that can't say what changed, or a version it no longer knows, is read whole again.
 *   - Its reads are POSTs, which `WebPlace`'s own copy of GET answers never keeps:  so it's kept here, by list.
 ****************/
export class RemotePlace extends WebPlace implements Place {
  /** What it says it can do. */
  private readonly capabilities: PlaceCapabilities
  /** Each thing's version, as last shown, by collection and id. */
  private readonly seenVersions = new Map<string, string>()
  /** The token to send, when it's not the page's. */
  private readonly token: string | undefined
  /** What a program's lines say about the place, sent with every request. */
  private readonly lines: PlaceLines | undefined
  /** The fields each collection takes no write to, as last said. */
  private readonly readOnlyFields = new Map<string, Set<string>>()
  /** What the place behind it last said it can hold of Spell's two times:  a sheet's, by its columns. */
  private timesHeld: PlaceCapabilities["timesHeld"]
  /** Where its files are read direct, when they are:  a space's own folder's (`readsAt`). */
  private readonly reads: ChunkedPlace | undefined
  /** How a person signs in here, if each person is someone. */
  readonly signIn?: PlaceSignIn
  /** Each whole list read, kept on this device with its version:  only when its line says so. */
  private readonly keptLists: DeviceCopy | undefined

  constructor({ url, can, token, lines, signIn, readsAt, deviceCopy }: RemotePlaceProps) {
    super({ url, changeIdHeader: false })
    this.keptLists = deviceCopy
    this.capabilities = { ...REMOTE_CAPABILITIES, ...can }
    this.token = token
    this.lines = lines
    if (signIn) this.signIn = signIn
    this.reads =
      readsAt === undefined
        ? undefined
        : new ChunkedPlace({
            store: new WebChunks({ url: readsAt }),
            format: new JsonChunks({ summaries: EVERY_FIELD })
          })
  }

  /** What it can do:  `can`, since a server's answer can't be waited for here. */
  describe(): PlaceCapabilities {
    return this.timesHeld === undefined ? this.capabilities : { ...this.capabilities, timesHeld: this.timesHeld }
  }

  /** The rows of `collection` that `query` asks for:  the place behind it does what it can, and says. */
  async list(collection: string, query: ListQuery, context: PlaceContext): Promise<ListAnswer> {
    if (await this.waitsForSignIn()) return { rows: [], handled: {} }
    const reads = this.reads
    if (reads) return this.readingDirect(collection, context, () => reads.list(collection, query, context))
    if (this.keptLists) return this.listKept(collection, query, context)
    return this.listWhole(collection, query, context)
  }

  /** `list()`, asked of the server side in full. */
  private async listWhole(
    collection: string,
    query: ListQuery,
    context: PlaceContext
  ): Promise<ListAnswer & WithVersions> {
    const { versions, ...answer } = await this.ask<ListAnswer & WithVersions>("list", { collection, query }, context)
    this.note(collection, versions)
    if (answer.readOnlyFields) this.readOnlyFields.set(collection, new Set(answer.readOnlyFields))
    if (answer.timesHeld !== undefined) this.timesHeld = answer.timesHeld
    return { ...answer, ...(versions && { versions }) }
  }

  /**
   * `list()`, from the list kept on this device:  only what changed since asked of the server side, and put on it
   * (see the class).
   * - SIDE EFFECT:  the list as it is now is kept, for the next read.
   * - throws as `listWhole()`
   */
  private async listKept(collection: string, query: ListQuery, context: PlaceContext): Promise<ListAnswer> {
    const copy = this.keptLists!
    const address = `${KEPT_LIST}${collection}:${JSON.stringify(query)}`
    const was = await copy.read(address).then((kept) => (kept ? (JSON.parse(kept.body) as KeptList) : undefined))
    let answer: KeptList | undefined
    if (was?.version !== undefined) {
      answer = await this.changesSince(collection, was.version, context).then(
        (changes) => withChanges(was, changes, this.capabilities.idOf),
        // it can't say what changed, or no longer knows that version:  read whole, below
        (error: unknown) => {
          if (error instanceof PlaceError) return undefined
          throw error
        }
      )
      if (answer) this.note(collection, answer.versions)
    }
    answer ??= await this.listWhole(collection, query, context)
    const { readOnlyFields: _readOnly, ...kept } = answer
    if (isWholeList(answer)) await copy.keep(address, { body: JSON.stringify(kept), headers: [] })
    return answer
  }

  /** The rows of `collection` with these ids. */
  async getMany(collection: string, ids: readonly string[], context: SelectingContext): Promise<PlaceRow[]> {
    if (await this.waitsForSignIn()) return []
    const reads = this.reads
    if (reads) return this.readingDirect(collection, context, () => reads.getMany(collection, ids, context))
    const body = { collection, ids, ...(context.select && { select: context.select }) }
    const { rows, versions } = await this.ask<{ rows: PlaceRow[] } & WithVersions>("getMany", body, context)
    this.note(collection, versions)
    return rows
  }

  /**
   * Make these changes.
   * - throws `PlaceError`:  refused, not found or out of date;  anything else for no answer
   * - throws a plain `Error` while it waits for a sign-in (`waitsForSignIn()`):  so the changes stay pending
   */
  async apply(changes: readonly PlaceChange[], context: PlaceContext): Promise<ApplyAnswer> {
    if (await this.waitsForSignIn()) throw new Error(NOT_SIGNED_IN)
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

  /** What changed in `collection` since `token`:  nothing, while it waits for a sign-in. */
  async changesSince(collection: string, token: string, context: PlaceContext): Promise<ChangesAnswer> {
    if (await this.waitsForSignIn()) return { rows: [], removed: [], token }
    return this.ask<ChangesAnswer>("changes", { collection, token }, context)
  }

  /** The version of this thing as it was last shown. */
  versionOf(collection: string, id: string): string | undefined {
    return this.seenVersions.get(`${collection}\n${id}`)
  }

  /** A field the place last said is read only:  a hint, as anything here is;  it's asked again with each read. */
  canWrite({ collection, field }: WriteQuestion): WriteAnswer {
    if (field !== undefined && this.readOnlyFields.get(collection)?.has(field))
      return { canWrite: false, whyNot: "field" }
    return { canWrite: true }
  }

  /**
   * Does it keep everything in this browser for now:  its server takes nobody until someone signs in
   * (`identifiesBy: "a sign-in"`), and nobody has yet?  Waits for the sign-in to know who's signed in already.
   */
  private async waitsForSignIn(): Promise<boolean> {
    if (this.capabilities.identifiesBy !== "a sign-in" || !this.signIn) return false
    await this.signIn.ready
    return this.signIn.status !== "signed in"
  }

  /** A server side says "out of date" with a 409, and "too much" with a 413. */
  protected errorKindFor(status: number): PlaceErrorKind {
    if (status === OUT_OF_DATE_STATUS) return "out of date"
    if (status === OVER_CEILING_STATUS) return "over the ceiling"
    return super.errorKindFor(status)
  }

  /** What the server side said went wrong:  `PlaceServer` answers `{ error }`, already scrubbed of keys. */
  protected async messageOf(error: ApiError): Promise<string> {
    const said = await error.response
      ?.clone()
      .json()
      .catch(() => undefined)
    return (said as { error?: string } | undefined)?.error ?? error.message
  }

  /** Why it was refused:  `PlaceServer` passes on what the place behind it said, per field and per owner. */
  protected async whyNotOf(error: ApiError): Promise<WhyNotWritable> {
    const said = await error.response
      ?.clone()
      .json()
      .catch(() => undefined)
    return (said as { whyNot?: WhyNotWritable } | undefined)?.whyNot ?? "place"
  }

  /** The role a refused write would take:  `PlaceServer` passes on what the place behind it said (epic `atmosphere` P23). */
  protected async needsOf(error: ApiError): Promise<string | undefined> {
    const said = await error.response
      ?.clone()
      .json()
      .catch(() => undefined)
    return (said as { needs?: string } | undefined)?.needs
  }

  /** A stale token isn't an answer about the request:  see the class. */
  protected isAnAnswer(status: number | undefined): boolean {
    return status !== GUARD_STATUS && super.isAnAnswer(status)
  }

  /**
   * `read()`'s answer, from the space's files:  asked again once, with a credential from the server side, when refused.
   * - Each thing's version as the list says it is noted, for a change made from it.
   * - throws `PlaceError` `"refused"` when the server side won't give one:  who's asking isn't a member
   */
  private async readingDirect<T extends ListAnswer | PlaceRow[]>(
    collection: string,
    context: PlaceContext,
    read: () => Promise<T>
  ): Promise<T> {
    let answer: T
    try {
      answer = await read()
    } catch (error) {
      if (!(error instanceof PlaceError) || error.kind !== "refused") throw error
      await this.ask(PLACE_CREDENTIAL, {}, context)
      answer = await read()
    }
    const rows = Array.isArray(answer) ? answer : answer.rows
    for (const row of rows) {
      const id = idOfRow(row, this.capabilities.idOf)
      const version = id === undefined ? undefined : this.reads!.versionOf(collection, id)
      if (version !== undefined) this.seenVersions.set(`${collection}\n${id}`, version)
    }
    return answer
  }

  /** Ask the server side.  - throws as `WebPlace.answerTo()` */
  private async ask<T>(what: string, data: object, context: PlaceContext): Promise<T> {
    const token = this.token ?? pageToken()
    const response = await this.answerTo(
      {
        url: `${this.url}/${what}`,
        urlData: {},
        method: "POST",
        data: { ...data, ...(this.lines && { lines: this.lines }) },
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
  /** What a program's lines say about the place:  a place that takes them (`Place.withLines()`) follows them, and any other ignores them. */
  lines?: PlaceLines
  /** How a person signs in to the server side:  a project data folder's `SpellSignIn`.  Left out:  nobody does. */
  signIn?: PlaceSignIn
  /**
   * A copy of each whole list it reads, kept on this device (`- keep a copy on this device`), its next read asking
   * only what changed (epic `atmosphere` T51).  Left out:  every read is whole.
   */
  deviceCopy?: DeviceCopy
  /**
   * Where its files are read direct, apart from the server side, which only writes then (epic `atmosphere` P5):
   * a space's own folder, `spaceReadAddressFor()`.  Left out:  read through the server side too.
   */
  readsAt?: string
}

/** A list kept on this device:  its answer, the version it was read at, and each thing's version. */
type KeptList = ListAnswer & WithVersions

/** A list the place did nothing to:  every row of the collection, so what changed can be put on it. */
function isWholeList({ nextPage, version, handled }: ListAnswer): boolean {
  return nextPage === undefined && version !== undefined && !Object.values(handled).some(Boolean)
}

/**
 * `was`, with `changes` on it:  each row changed put in its place (a new one at the end), each one removed left out,
 * and the version the changes were read at.
 * - A changed row's version isn't said with it:  it's dropped, so a change made from it isn't checked against an old one.
 */
function withChanges(
  was: KeptList,
  { rows, removed, token }: ChangesAnswer,
  idOf: PlaceCapabilities["idOf"]
): KeptList {
  const gone = new Set(removed)
  const changed = new Map(rows.map((row) => [idOfRow(row, idOf), row] as const))
  const versions = { ...was.versions }
  const kept: PlaceRow[] = []
  for (const row of was.rows) {
    const id = idOfRow(row, idOf)
    if (id !== undefined && gone.has(id)) continue
    const now = id === undefined ? undefined : changed.get(id)
    if (now && id !== undefined) {
      changed.delete(id)
      delete versions[id]
    }
    kept.push(now ?? row)
  }
  for (const [id, row] of changed) {
    if (id !== undefined) delete versions[id]
    kept.push(row)
  }
  for (const id of gone) delete versions[id]
  return { ...was, rows: kept, version: token, versions }
}

/** The write token of the server that served this page. */
function pageToken(): string | undefined {
  return (globalThis as { SPELL_SERVER?: { token?: string } }).SPELL_SERVER?.token
}
