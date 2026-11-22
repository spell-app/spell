import {
  AUTHENTICATED_PLACES_PREFIX,
  PAGE_SERVER_ANSWER_HEADER,
  PlaceError,
  STALE_TOKEN_ANSWER,
  type PlaceErrorCause
} from "spell/places/places.types"
import { putKeyOn, type KeyGoes } from "spell/places/keyGoes"
import { PlaceToken, tokenServiceMint } from "spell/places/PlaceToken"
import { CHANGE_ID_HEADER, TOKEN_HEADER } from "spell/places/WebPlace"
import { SRV } from "spell/server"

import { PlaceKeys } from "./PlaceKeys"
import { PlaceServer } from "./PlaceServer"

/** The biggest request it passes on:  a big batch of changes. */
const BODY_LIMIT = 10 * 1024 * 1024

/** The headers of a page's request that go on to the place:  what it reads and writes with, never its cookies. */
const PASSED_ON = ["accept", "content-type", "if-match", "if-none-match", CHANGE_ID_HEADER.toLowerCase()]

/** The headers of the place's answer that come back:  what a page's `WebPlace` reads, paging and limits among them. */
const PASSED_BACK = /^(content-type|etag|last-modified|link|retry-after|x-ratelimit-.*|ratelimit.*|x-total-count)$/i

/** An answer whose body is text, which has the place's address and its secret taken out of it. */
const TEXT_TYPE = /json|text|xml|javascript|graphql/i

/** A GraphQL request that writes. */
const GRAPHQL_MUTATION = /^\s*mutation\b/

/** One server per router:  the kit's route module makes it, the app's adds its projects (`for()`). */
const ONE_PER_ROUTER = new WeakMap<SRV.Router, AuthenticatedPlaces>()

/****************
 * ### `AuthenticatedPlaces`
 * The page server reading a project's authenticated places for its pages, adding the secret:
 *
 * ```text
 * page → page server (adds the secret) → the place's own server
 * ```
 *
 * - A place a program says `it is authenticated with the secret "JOBS_TOKEN"` under is read here, at
 *   `/api/places/projects/<project>/<place>/...` (`AUTHENTICATED_PLACES_PREFIX`):  the rest of the path, its question and
 *   its body go on to the place's own address, and its answer comes back.
 *   - The page keeps its own `WebPlace`, its paths, paging and fields as its lines say:  only where it sends goes here.
 * - THE SECRET comes from the environment the page server started with, by its name, and is never in anything sent
 *   back:  every answer has it taken out (`PlaceKeys.scrubbed()`), and the place's own address with it, made this one.
 *   - A token made from it (`it is authenticated with a token from "..."`):  made here, kept, made again before it
 *     runs out (`PlaceToken`), and taken out of answers too.
 *   - Not set:  refused, saying which secret and which place need it, and the page says those words.
 * - REFUSED by its source (`AuthenticatedPlace.refusal`):  every read and write, in the source's words, nothing passed
 *   on;  said as the page server starts too.  The app's:  a deployment its project file doesn't list (from-console J104).
 * - READ ONLY when its lines or its deployment say so:  only reads go on;  a write is refused.
 *   A graphql server's reads are `POST`s, so a mutation is the write.
 * - Which places there are comes from SOURCES (`addSource()`):  the app's route module hands in every project's,
 *   from what each project compiled to;  this knows nothing of projects.
 * - Behind `Guard`, reads too, as `PlaceServer` is:  a read spends the secret.
 * - Says each secret that isn't set as the page server starts (`sayMissing()`), never a value;  and each refusal.
 * - Airtable's base, served by its own `PlaceServer` (`serveAirtableBase()`, [placeRoutes.ts](placeRoutes.ts)), is one
 *   of its sources too, for that.
 * - A pass-through that keeps nothing, as `DirectReads`' read through to a host is.  Node only.
 ****************/
export class AuthenticatedPlaces {
  /** Where its places are:  each source's, in the order added. */
  private readonly sources: AuthenticatedPlaceSource[] = []
  /** Where secrets are found, by name:  the environment, else the secrets kept (`SRV.Secrets`). */
  private readonly from: Readonly<Record<string, string | undefined>>
  /** Sends what it passes on. */
  private readonly fetch: typeof globalThis.fetch
  /** The secrets each place holds, by its address here:  what's scrubbed from its answers. */
  private readonly keysByPlace = new Map<string, PlaceKeys>()
  /** The token each place's secret makes, by its address here, for a place whose line says so. */
  private readonly tokensByPlace = new Map<string, PlaceToken>()

  constructor({ from = new SRV.Secrets().withEnvironment(), fetch = globalThis.fetch }: AuthenticatedPlacesProps = {}) {
    this.from = from
    this.fetch = fetch
  }

  /**
   * The ONE for this page server, its routes added on its first call:  the kit's route module, then the app's, share it.
   * - `props`:  only the first call's count.
   */
  static for(
    { router, guard }: { router: SRV.Router; guard: SRV.Guard },
    props?: AuthenticatedPlacesProps
  ): AuthenticatedPlaces {
    let places = ONE_PER_ROUTER.get(router)
    if (!places) ONE_PER_ROUTER.set(router, (places = new AuthenticatedPlaces(props).route(router, guard)))
    return places
  }

  /** Add its routes to `router`, each behind `guard`:  this run's token, the server's own host and origin. */
  route(router: SRV.Router, guard: SRV.Guard): this {
    router.all(
      `${AUTHENTICATED_PLACES_PREFIX}/:path*`,
      guard.hostCheck,
      this.staleTokenCheck(guard),
      guard.writeCheck,
      this.passOn
    )
    return this
  }

  /**
   * A page's request with an old run's write token, nobody signed in:  the page server restarted since it was served.
   * - Answered 403, marked `STALE_TOKEN_ANSWER`, so the page takes it as no answer and asks again, as `RemotePlace`
   *   does, until the page server's reload brings the new token (from-console I29);  every other check is `guard`'s.
   */
  private staleTokenCheck =
    (guard: SRV.Guard): SRV.Handler =>
    (request, reply, next) => {
      const token = request.get(TOKEN_HEADER)
      if (request.person !== undefined || token === undefined || token === guard.token) return next()
      reply.status(403).noStore().set(PAGE_SERVER_ANSWER_HEADER, STALE_TOKEN_ANSWER)
      reply.type("application/json")
      reply.send(
        JSON.stringify({ error: "this page's write token is from before the page server restarted:  reload the page" })
      )
    }

  /** SIDE EFFECT:  `source`'s places are read here too, and their secrets checked by `missing()`. */
  addSource(source: AuthenticatedPlaceSource): this {
    this.sources.push(source)
    return this
  }

  ////////////////
  // ## The secrets that aren't set
  ////////////////

  /**
   * Each secret a place needs that isn't set, with the place:  every source's, each secret once per place.
   * - NEVER throws:  a source that fails is logged, and left out.
   */
  async missing(): Promise<MissingSecret[]> {
    const lists = await Promise.all(
      this.sources.map((source) =>
        Promise.resolve(source.every()).catch((error: unknown) => {
          console.error("AuthenticatedPlaces.missing():  a source couldn't list its places", error)
          return []
        })
      )
    )
    return lists.flat().flatMap((place) => {
      // a refused place is said by its refusal:  its secret's name may not be the one it'd read with
      if (place.refusal !== undefined) return []
      const keys = new PlaceKeys({ names: [place.keyNamed], from: this.from })
      return keys.missing().map((name) => ({ name, place }))
    })
  }

  /**
   * Each refusal a source gave its places, once each:  a project's places share one.
   * - NEVER throws:  a source that fails is left out (`missing()` logs it).
   */
  async refusals(): Promise<string[]> {
    const lists = await Promise.all(this.sources.map((source) => Promise.resolve(source.every()).catch(() => [])))
    return [...new Set(lists.flat().flatMap(({ refusal }) => (refusal === undefined ? [] : [refusal])))]
  }

  /**
   * SIDE EFFECT:  says each secret that isn't set, one line each, never a value:
   * `JOBS_TOKEN is not set:  the jobs place in @acme/jobs needs it.`
   * - Then each refusal (`refusals()`), in its source's words.
   * - NEVER throws.
   */
  async sayMissing(say: (line: string) => void = console.warn): Promise<void> {
    for (const { name, place } of await this.missing()) say(notSetLine(name, place))
    for (const refusal of await this.refusals()) say(refusal)
  }

  ////////////////
  // ## Passing a request on
  ////////////////

  /**
   * A page's request, passed on to the place its path names, with the secret added;  its answer passed back, scrubbed.
   * - Refused, with the page server's own words (`PAGE_SERVER_ANSWER_HEADER`):  a place its source refused, a secret
   *   that isn't set, a write to a place that's read only.
   * - throws `HttpError`:  404 for a path that names no place, 502 when the place doesn't answer
   */
  private passOn = async (request: SRV.Request, reply: SRV.Reply): Promise<void> => {
    const path = request.params.path ?? ""
    const found = await this.placeIn(path)
    if (!found) throw new SRV.HttpError(404, `no authenticated place is read at ${AUTHENTICATED_PLACES_PREFIX}/${path}`)
    const { place, served, rest } = found
    const keys = this.keysFor(served, place)
    try {
      const body =
        request.method === "GET" || request.method === "HEAD" ? undefined : await SRV.readBody(request.raw, BODY_LIMIT)
      if (place.refusal !== undefined) {
        throw new PlaceError(place.refusal, { cause: { kind: "refused", whyNot: "place" } })
      }
      if (place.readOnly && !isRead(request.method, place, body)) {
        throw new PlaceError(`${place.name} is read only:  its lines say so, so it takes no changes`, {
          cause: { kind: "refused", whyNot: "place" }
        })
      }
      const secret = await this.secretFor(served, place, keys)
      const headers = new Headers()
      for (const name of PASSED_ON) {
        const value = request.get(name)
        if (value) headers.set(name, value)
      }
      const query = request.originalUrl.includes("?") ? request.originalUrl.slice(request.originalUrl.indexOf("?")) : ""
      const url = putKeyOn(`${place.at.replace(/\/+$/, "")}${rest}${query}`, headers, secret, place.keyGoes)
      const answer = await this.fetch(url, {
        method: request.method,
        headers,
        ...(body && body.length && { body: new Uint8Array(body) })
      }).catch((error: unknown) => {
        throw new SRV.HttpError(502, keys.scrubbed(`${place.name} didn't answer:  ${(error as Error).message}`))
      })
      reply.status(answer.status).noStore()
      answer.headers.forEach((value, name) => {
        if (PASSED_BACK.test(name)) reply.set(name, keys.scrubbed(value.replaceAll(place.at, servedAddress(served))))
      })
      const isText = TEXT_TYPE.test(answer.headers.get("content-type") ?? "")
      if (!isText) reply.send(Buffer.from(await answer.arrayBuffer()))
      else reply.send(keys.scrubbed((await answer.text()).replaceAll(place.at, servedAddress(served))))
    } catch (error) {
      if (!(error instanceof PlaceError)) throw error
      const { kind, whyNot } = error.cause ?? ({} as Partial<PlaceErrorCause>)
      reply.status(PlaceServer.statusOf(error)).noStore().set(PAGE_SERVER_ANSWER_HEADER, "refused")
      reply.type("application/json")
      reply.send(
        keys.scrubbed(JSON.stringify({ error: error.message, ...(kind && { kind }), ...(whyNot && { whyNot }) }))
      )
    }
  }

  /** The place `path` names, the first source's that knows it:  `undefined` for none. */
  private async placeIn(path: string): Promise<FoundPlace | undefined> {
    for (const source of this.sources) {
      const found = await source.placeIn?.(path)
      if (found) return found
    }
    return undefined
  }

  /** The keys `place` holds, made once:  what its answers are scrubbed of. */
  private keysFor(served: string, place: AuthenticatedPlace): PlaceKeys {
    const known = this.keysByPlace.get(served)
    if (known) return known
    const keys = new PlaceKeys({ names: [place.keyNamed], from: this.from })
    this.keysByPlace.set(served, keys)
    return keys
  }

  /**
   * What goes on `place`'s requests:  its secret, or the token made from it.
   * - throws `PlaceError` `"refused"` when the secret isn't set, saying which and for what
   */
  private async secretFor(served: string, place: AuthenticatedPlace, keys: PlaceKeys): Promise<string> {
    const { keyNamed, tokenFrom } = place
    if (keys.keyNamed(keyNamed) === undefined) {
      throw new PlaceError(notSetLine(keyNamed, place), { cause: { kind: "refused", whyNot: "place" } })
    }
    if (tokenFrom === undefined) return keys.keyNamed(keyNamed)!
    let token = this.tokensByPlace.get(served)
    if (!token) {
      const mint = tokenServiceMint(tokenFrom, this.fetch)
      token = new PlaceToken({
        keyNamed,
        keyFrom: keys.keyNamed,
        mint,
        hold: (name, secret) => keys.hold(name, secret)
      })
      this.tokensByPlace.set(served, token)
    }
    return token.current()
  }
}

/** Constructor props of `AuthenticatedPlaces`. */
export type AuthenticatedPlacesProps = {
  /** Where secrets are found, by name;  default the environment, else the secrets kept (`SRV.Secrets`). */
  from?: Readonly<Record<string, string | undefined>>
  /** What sends requests on;  default the platform's. */
  fetch?: typeof globalThis.fetch
}

/** An authenticated place, as the page server needs it:  where it is, and the NAME of its secret. */
export type AuthenticatedPlace = {
  /** The project it's in, by address:  `@acme/jobs`. */
  project: string
  /** Its name, as compiled code names it:  `jobs`. */
  name: string
  /** Its kind's word:  `web server`, `graphql server`. */
  kind?: string
  /** Its own address, everything's under it:  its deployment's, when one is picked. */
  at: string
  /** The NAME of its secret:  `JOBS_TOKEN`. */
  keyNamed: string
  /** Where its secret goes on a request:  left out, `Authorization: Bearer`. */
  keyGoes?: KeyGoes
  /** Where a token is made from its secret, which is then what's sent. */
  tokenFrom?: string
  /** It takes no writes. */
  readOnly?: boolean
  /**
   * Why it's not read at all, in words for people:  every request refused with them, and said at startup.
   * - e.g. the app's, for a deployment its project file doesn't list (`SP.UnlistedDeploymentError`'s words).
   */
  refusal?: string
}

/** A place a request's path names, as a source finds it. */
export type FoundPlace = {
  /** The place. */
  place: AuthenticatedPlace
  /** Its address here, after the prefix:  `@acme/jobs/jobs`. */
  served: string
  /** What's left of the path, for its own address:  `/jobs/12`, or `""`. */
  rest: string
}

/** Where some of the authenticated places are:  the app's projects, or Airtable's base. */
export type AuthenticatedPlaceSource = {
  /**
   * The place a request's path names (`@acme/jobs/jobs/jobs/12`):  `undefined` for none of its.
   * - Left out:  a source only checked for secrets, its places read elsewhere (Airtable's `PlaceServer`).
   */
  placeIn?(path: string): FoundPlace | undefined | Promise<FoundPlace | undefined>
  /** Every place it knows now, for the secrets that aren't set. */
  every(): readonly AuthenticatedPlace[] | Promise<readonly AuthenticatedPlace[]>
}

/** A secret a place needs that isn't set. */
export type MissingSecret = {
  /** The secret's name. */
  name: string
  /** The place that needs it. */
  place: AuthenticatedPlace
}

/** What's said of a secret that isn't set, at startup and to the page:  never a value. */
function notSetLine(name: string, { name: place, project }: AuthenticatedPlace): string {
  return `${name} is not set:  the ${place} place in ${project} needs it.  Set it where Spell's page server starts, then start it again`
}

/** Where a page reads a place:  `/api/places/projects/@acme/jobs/jobs`. */
function servedAddress(served: string): string {
  return `${AUTHENTICATED_PLACES_PREFIX}/${served}`
}

/** Is this request a read?  A graphql server's reads are `POST`s:  only a mutation writes. */
function isRead(method: string, { kind }: AuthenticatedPlace, body: Uint8Array | undefined): boolean {
  if (method === "GET" || method === "HEAD") return true
  if (kind !== "graphql server" || method !== "POST" || !body) return false
  try {
    const { query } = JSON.parse(new TextDecoder().decode(body)) as { query?: unknown }
    return typeof query === "string" && !GRAPHQL_MUTATION.test(query)
  } catch {
    return false
  }
}
