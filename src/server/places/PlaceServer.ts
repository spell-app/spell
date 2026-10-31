import {
  PlaceError,
  idOfRow,
  type ListQuery,
  type Place,
  type PlaceChange,
  type PlaceErrorCause,
  type PlaceErrorKind,
  type PlaceRow
} from "spell/util/places/places.types"
import { SRV } from "spell/server"

import { PlaceKeys } from "./PlaceKeys"

/** Where it listens, unless it's told otherwise. */
const PLACES_PREFIX = "/api/places"

/** The biggest request:  a big batch of changes. */
const BODY_LIMIT = 10 * 1024 * 1024

/** How many changes' ids it remembers, per place. */
const CHANGES_REMEMBERED = 1000

/** What each thing a place throws is answered with:  `RemotePlace` turns them back. */
const STATUS_OF_KIND: Record<PlaceErrorKind, number> = {
  refused: 422,
  "not found": 404,
  "out of date": 409,
  "no such place": 404,
  "over the ceiling": 413
}

/****************
 * ### `PlaceServer`
 * Any place over HTTP, on the kit's router:  the one small server side a place needs (epic `data` P5, J9, Q11).
 *
 * ```ts
 * new PlaceServer({ places: { recipes: new FolderPlace({ storage }) }, keys }).route(router, guard)
 * ```
 *
 * - Its browser half is `RemotePlace`.  Every request is a `POST` of JSON under `/api/places/<name>/`:
 *   `list`, `getMany`, `apply`, `call`, `changes`;  and `GET /api/places/<name>`, what the place can do.
 * - HOLDS KEYS, and never answers with one.  There's no route for them, and every answer, errors too, goes through
 *   `PlaceKeys.scrubbed()`:  a service that echoes its key sends it no further than here.
 * - STANDS BEHIND `Guard`, reads too:  a read can spend a key, and without it any web page could reach a local server holding some.
 *   - NOTE: Guard's token covers a LOCAL server only.  A hosted one needs its own sign-in, which epic `data`'s The Cloud has to answer:
 *     don't put this on a public address as it stands.
 * - A refusal says why (`whyNot`), so `RemotePlace` can pass it on, per field and per owner.
 * - Answers:  refused 422, not found 404, out of date 409, too much 413;  anything else 500, which counts as no answer, so a change resends.
 * - A change's `changeId` it has seen is made once:  it's answered with what it made.
 * - Each read stops as the asker hangs up.
 * - Node only.  Knows nothing of what a place is.
 ****************/
export class PlaceServer {
  /** Each place, by the name it's served under. */
  private readonly places: Readonly<Record<string, Place>>
  /** The keys it holds. */
  private readonly keys: PlaceKeys
  /** Where it listens. */
  private readonly prefix: string
  /** What each change's id made, by place:  oldest first. */
  private readonly changesMade = new Map<string, Map<string, PlaceRow | undefined>>()

  constructor({ places, keys = new PlaceKeys(), prefix = PLACES_PREFIX }: PlaceServerProps) {
    this.places = places
    this.keys = keys
    this.prefix = prefix
  }

  /** Add its routes to `router`, each behind `guard`:  this run's token, the server's own host and origin. */
  route(router: SRV.Router, guard: SRV.Guard): this {
    const body = SRV.parseBodies({ limit: BODY_LIMIT })
    const checks = [guard.hostCheck, guard.writeCheck, body]
    const answering =
      (answer: Answerer): SRV.Handler =>
      (request, reply) =>
        this.answering(request, reply, answer)
    router.get(
      `${this.prefix}/:place`,
      ...checks,
      answering(({ place }) => ({ capabilities: place.describe() }))
    )
    router.post(
      `${this.prefix}/:place/list`,
      ...checks,
      answering((ask) => this.list(ask))
    )
    router.post(
      `${this.prefix}/:place/getMany`,
      ...checks,
      answering((ask) => this.getMany(ask))
    )
    router.post(
      `${this.prefix}/:place/apply`,
      ...checks,
      answering((ask) => this.apply(ask))
    )
    router.post(
      `${this.prefix}/:place/call`,
      ...checks,
      answering((ask) => this.call(ask))
    )
    router.post(
      `${this.prefix}/:place/changes`,
      ...checks,
      answering((ask) => this.changes(ask))
    )
    return this
  }

  ////////////////
  // ## Each request
  ////////////////

  /** `POST list`:  `{ collection, query }` => a `ListAnswer`, and `versions`, each thing's version by id. */
  private async list({ place, body, context }: PlaceAsk): Promise<object> {
    const { collection, query = {} } = body as { collection?: string; query?: ListQuery }
    const answer = await place.list(this.collectionOrDie(collection), query, context)
    return { ...answer, versions: this.versionsOf(place, collection!, answer.rows) }
  }

  /** `POST getMany`:  `{ collection, ids, select? }` => `{ rows, versions }`. */
  private async getMany({ place, body, context }: PlaceAsk): Promise<object> {
    const { collection, ids, select } = body as { collection?: string; ids?: string[]; select?: string[] }
    if (!Array.isArray(ids)) throw new SRV.HttpError(400, "send JSON { collection, ids }")
    const named = this.collectionOrDie(collection)
    const rows = place.getMany
      ? await place.getMany(named, ids, { ...context, ...(select && { select }) })
      : (await place.list(named, {}, context)).rows.filter((row) =>
          ids.includes(idOfRow(row, place.describe().idOf) ?? "")
        )
    return { rows, versions: this.versionsOf(place, named, rows) }
  }

  /**
   * `POST apply`:  `{ changes }` => an `ApplyAnswer`, and `versions`, by collection then id.
   * - A change whose id it's seen isn't made again.
   */
  private async apply({ place, placeName, body, context }: PlaceAsk): Promise<object> {
    const { changes } = body as { changes?: PlaceChange[] }
    if (!Array.isArray(changes)) throw new SRV.HttpError(400, "send JSON { changes }")
    if (!place.apply) {
      throw new PlaceError(`PlaceServer:  "${placeName}" can't be written`, {
        cause: { kind: "refused", whyNot: "place" }
      })
    }
    const made = this.madeBy(placeName)
    const fresh = changes.filter(({ changeId }) => changeId === undefined || !made.has(changeId))
    const answer = fresh.length ? await place.apply(fresh, context) : { rows: [] }
    this.remember(made, place, fresh, answer.rows)
    const seenAgain = changes.flatMap((change) => (fresh.includes(change) ? [] : (made.get(change.changeId!) ?? [])))
    const rows = [...answer.rows, ...seenAgain]
    return { ...answer, rows, versions: this.versionsAfter(place, changes) }
  }

  /** `POST call`:  `{ name, input }` => `{ result }`. */
  private async call({ place, placeName, body, context }: PlaceAsk): Promise<object> {
    const { name, input } = body as { name?: string; input?: unknown }
    if (!place.call || typeof name !== "string") {
      throw new PlaceError(`PlaceServer:  "${placeName}" has no operation "${name}"`, { cause: { kind: "not found" } })
    }
    return { result: await place.call(name, input, context) }
  }

  /** `POST changes`:  `{ collection, token }` => a `ChangesAnswer`. */
  private changes({ place, placeName, body, context }: PlaceAsk): Promise<object> {
    const { collection, token } = body as { collection?: string; token?: string }
    if (!place.changesSince) {
      throw new PlaceError(`PlaceServer:  "${placeName}" can't say what changed`, { cause: { kind: "not found" } })
    }
    if (typeof token !== "string") throw new SRV.HttpError(400, "send JSON { collection, token }")
    return place.changesSince(this.collectionOrDie(collection), token, context)
  }

  ////////////////
  // ## Answering
  ////////////////

  /**
   * Answer a request with what `answer` makes, its keys scrubbed:  what any failure comes to, too.
   * - NEVER throws.
   * - A real failure is logged here:  nothing but the scrubbed message goes on.
   */
  private async answering(request: SRV.Request, reply: SRV.Reply, answer: Answerer): Promise<void> {
    const stop = new AbortController()
    reply.raw.once("close", () => {
      if (!reply.raw.writableEnded) stop.abort(new DOMException("The asker hung up", "AbortError"))
    })
    let status = 200
    let answered: unknown
    try {
      const placeName = request.params.place ?? ""
      answered = await answer({
        place: this.placeOrDie(placeName),
        placeName,
        body: request.body,
        context: { signal: stop.signal }
      })
    } catch (error) {
      status = this.statusOf(error)
      const { kind, whyNot } = error instanceof PlaceError ? (error.cause ?? {}) : ({} as Partial<PlaceErrorCause>)
      answered = { error: (error as Error).message, ...(kind && { kind }), ...(whyNot && { whyNot }) }
      if (status >= 500 && !stop.signal.aborted) console.error(this.keys.scrubbed(`PlaceServer:  ${String(error)}`))
    }
    if (reply.raw.destroyed) return
    reply.status(status).set("Cache-Control", "no-store").type("application/json")
    reply.send(this.keys.scrubbed(JSON.stringify(answered ?? {})))
  }

  /** What to answer a failure with. */
  private statusOf(error: unknown): number {
    if (error instanceof PlaceError && error.kind) return STATUS_OF_KIND[error.kind]
    return error instanceof SRV.HttpError ? error.status : 500
  }

  /** The place by this name.  - throws `HttpError(404)` */
  private placeOrDie(name: string): Place {
    const place = Object.hasOwn(this.places, name) ? this.places[name] : undefined
    if (!place) throw new SRV.HttpError(404, `no place is served as "${name}"`)
    return place
  }

  /** - throws `HttpError(400)` for a request that names no collection */
  private collectionOrDie(collection: unknown): string {
    if (typeof collection !== "string" || !collection) throw new SRV.HttpError(400, "a collection is required")
    return collection
  }

  /** Each of `rows`' version, by id, as `place` has just shown them. */
  private versionsOf(place: Place, collection: string, rows: readonly PlaceRow[]): Record<string, string> {
    const versions: Record<string, string> = {}
    for (const row of rows) {
      const id = idOfRow(row, place.describe().idOf)
      const version = id === undefined ? undefined : place.versionOf?.(collection, id)
      if (version !== undefined) versions[id!] = version
    }
    return versions
  }

  /** Each changed thing's version now:  by collection, then id. */
  private versionsAfter(place: Place, changes: readonly PlaceChange[]): Record<string, Record<string, string>> {
    const versions: Record<string, Record<string, string>> = {}
    for (const { collection, id } of changes) {
      const version = id === undefined ? undefined : place.versionOf?.(collection, id)
      if (version !== undefined) (versions[collection] ??= {})[id!] = version
    }
    return versions
  }

  /** What each change's id made, for this place. */
  private madeBy(placeName: string): Map<string, PlaceRow | undefined> {
    let made = this.changesMade.get(placeName)
    if (!made) this.changesMade.set(placeName, (made = new Map()))
    return made
  }

  /** Remember these changes as made, and how they came out:  only the last `CHANGES_REMEMBERED`. */
  private remember(
    made: Map<string, PlaceRow | undefined>,
    place: Place,
    changes: readonly PlaceChange[],
    rows: readonly PlaceRow[]
  ): void {
    const { idOf } = place.describe()
    for (const { changeId, id } of changes) {
      if (changeId === undefined) continue
      made.set(
        changeId,
        rows.find((row) => idOfRow(row, idOf) === id)
      )
    }
    for (const oldest of made.keys()) {
      if (made.size <= CHANGES_REMEMBERED) break
      made.delete(oldest)
    }
  }
}

/** Constructor props of a `PlaceServer`. */
export type PlaceServerProps = {
  /** Each place, by the name it's served under. */
  places: Readonly<Record<string, Place>>
  /** The keys it holds:  what's scrubbed from every answer. */
  keys?: PlaceKeys
  /** Where it listens;  default `/api/places`. */
  prefix?: string
}

/** One request, as its route's method sees it. */
type PlaceAsk = {
  /** The place named. */
  place: Place
  /** Its name. */
  placeName: string
  /** The JSON sent. */
  body: unknown
  /** What goes to the place:  a signal that fires when the asker hangs up. */
  context: { signal: AbortSignal }
}

/** Makes one request's answer.  - throws what it can't answer */
type Answerer = (ask: PlaceAsk) => object | Promise<object>
