import {
  AUTHENTICATED_PLACES_PREFIX,
  PAGE_SERVER_ANSWER_HEADER,
  PlaceError,
  STALE_TOKEN_ANSWER,
  type PlaceErrorCause
} from "spell/places/places.types"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { putKeyOn, type KeyGoes } from "spell/places/keyGoes"
import { PlaceToken, tokenEndOf, tokenRefreshMint, tokenServiceMint, type TokenState } from "spell/places/PlaceToken"
import {
  answerFromSaved,
  isOffline,
  SAVED_ANSWER_HEADER,
  savedAnswerPath,
  type SavedAsks
} from "spell/places/SavedAnswers"
import { compilePattern } from "spell/util/addressPattern"
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

/** A live answer a read takes a saved answer over:  refused for its token, or the server's own trouble. */
const SAVED_INSTEAD = /^(401|403|5\d\d)$/

/** How often the tokens that renew themselves are looked at, so one renews while nobody reads. */
const RENEW_CHECK_MS = 5 * 60_000

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
 *   - A token that renews itself (`its token is renewed at "..."`):  renewed at its refresh route before it runs out,
 *     kept where secrets are kept (`SRV.Secrets`), and looked at every 5 minutes so it renews while nobody reads
 *     (`keepRenewing()`).  Of the environment's and the one kept, the one that lasts longer is sent.
 *   - How each place's token is:  `tokens()`, at `/api/places/tokens` (`TOKENS_ROUTE`), never a token:
 *     `ok`, `expiring`, `expired`, `renew-failed` or `missing`, its minutes left, and the line that fixes it.
 * - SAVED ANSWERS (its deployment's `fixtures`, `SavedAnswers`):  a read its server won't answer (no answer, a 5xx, a
 *   401 or 403, a secret not set or run out) is answered from the saved one, when there is one, marked
 *   `SAVED_ANSWER_HEADER`;  `offline`, read from them alone, and a write refused.
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
  /** Where a renewed token is kept, and read back. */
  private readonly kept: Pick<SRV.Secrets, "kept" | "keep">
  /** Says a renewal, or a failed one. */
  private readonly say: (line: string) => void

  constructor({
    from = new SRV.Secrets().withEnvironment(),
    fetch = globalThis.fetch,
    kept = new SRV.Secrets(),
    say = (line) => console.log(`places:  ${line}`)
  }: AuthenticatedPlacesProps = {}) {
    this.from = from
    this.fetch = fetch
    this.kept = kept
    this.say = say
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
    // only this machine's own host:  it says no secret, so a hook in a terminal may ask with no write token
    router.get(TOKENS_ROUTE, guard.hostCheck, async (_request, reply) => {
      reply.noStore().json(await this.tokens())
    })
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
  // ## Tokens
  ////////////////

  /**
   * How each place's token is (`PlaceTokenReport`), never a token:  each place with a secret, of every source.
   * - A token made from a key, or one that renews itself:  as its keeper says (`PlaceToken.state()`).
   * - Any other secret that's a JWT:  by its own end;  one that isn't:  `ok`, or `missing`.
   * - NEVER throws:  a source that fails is left out (`missing()` logs it).
   */
  async tokens(): Promise<PlaceTokenReport[]> {
    const lists = await Promise.all(this.sources.map((source) => Promise.resolve(source.every()).catch(() => [])))
    return lists.flat().flatMap((place) => {
      if (place.refusal !== undefined) return []
      const state = this.tokenFor(servedOf(place), place)?.state() ?? stateOfSecret(this.from[place.keyNamed])
      const report: PlaceTokenReport = { project: place.project, place: place.name, secret: place.keyNamed, ...state }
      if (state.state !== "ok") report.fix = fixFor(place, state)
      return [report]
    })
  }

  /**
   * SIDE EFFECT:  every token that renews itself is looked at now, and every 5 minutes, so it renews before it runs
   * out while nobody reads;  each that goes bad is said once (`say`).  Returns what stops it.
   * - NEVER throws.
   */
  keepRenewing(everyMs = RENEW_CHECK_MS): () => void {
    const look = async () => {
      const lists = await Promise.all(this.sources.map((source) => Promise.resolve(source.every()).catch(() => [])))
      for (const place of lists.flat()) {
        if (place.renewsAt === undefined || place.refusal !== undefined) continue
        await this.tokenFor(servedOf(place), place)
          ?.current()
          .catch(() => undefined)
      }
    }
    void look()
    const timer = setInterval(() => void look(), everyMs)
    timer.unref?.()
    return () => clearInterval(timer)
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
    const query = request.originalUrl.includes("?") ? request.originalUrl.slice(request.originalUrl.indexOf("?")) : ""
    const isGet = request.method === "GET" || request.method === "HEAD"
    // its saved answer, for a read its server won't answer:  `undefined` for none
    const saved = () =>
      isGet && place.fixtures !== undefined ? savedAnswer(place.fixtures, `${rest}${query}`, place.asks) : undefined
    const answerSaved = (text: string) => {
      reply.status(200).noStore().set(SAVED_ANSWER_HEADER, "saved")
      reply.type("application/json")
      reply.send(text.replaceAll(place.at, servedAddress(served)))
    }
    try {
      const body = isGet ? undefined : await SRV.readBody(request.raw, BODY_LIMIT)
      if (place.refusal !== undefined) {
        throw new PlaceError(place.refusal, { cause: { kind: "refused", whyNot: "place" } })
      }
      if (isOffline(rest, place.offline)) {
        if (!isGet) {
          throw new PlaceError(`${place.name} is offline:  it reads its saved answers, and takes no changes`, {
            cause: { kind: "refused", whyNot: "place" }
          })
        }
        const text = await saved()
        if (text === undefined)
          throw new SRV.HttpError(404, `${place.name} is offline, and has no saved answer for ${rest}`)
        return answerSaved(text)
      }
      if (place.readOnly && !isRead(request.method, place, body, rest)) {
        throw new PlaceError(`${place.name} is read only:  its lines say so, so it takes no changes`, {
          cause: { kind: "refused", whyNot: "place" }
        })
      }
      let secret: string
      try {
        secret = await this.secretFor(served, place, keys)
      } catch (error) {
        // no secret to send, or it's run out:  a saved answer, if there is one
        const text = await saved()
        if (text === undefined) throw error
        return answerSaved(text)
      }
      const headers = new Headers()
      for (const name of PASSED_ON) {
        const value = request.get(name)
        if (value) headers.set(name, value)
      }
      const url = putKeyOn(`${place.at.replace(/\/+$/, "")}${rest}${query}`, headers, secret, place.keyGoes)
      const answer = await this.fetch(url, {
        method: request.method,
        headers,
        ...(body && body.length && { body: new Uint8Array(body) })
      }).catch(async (error: unknown) => {
        const text = await saved()
        if (text !== undefined) return text
        throw new SRV.HttpError(502, keys.scrubbed(`${place.name} didn't answer:  ${(error as Error).message}`))
      })
      if (typeof answer === "string") return answerSaved(answer)
      if (SAVED_INSTEAD.test(`${answer.status}`)) {
        const text = await saved()
        if (text !== undefined) return answerSaved(text)
      }
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
   * What goes on `place`'s requests:  its secret, or the token made from it, or the token it renewed to.
   * - throws `PlaceError` `"refused"` when the secret isn't set, saying which and for what;  or it's run out
   */
  private async secretFor(served: string, place: AuthenticatedPlace, keys: PlaceKeys): Promise<string> {
    const { keyNamed } = place
    const token = this.tokenFor(served, place, keys)
    if (keys.keyNamed(keyNamed) === undefined && (!token || this.newestOf(keyNamed) === undefined)) {
      throw new PlaceError(notSetLine(keyNamed, place), { cause: { kind: "refused", whyNot: "place" } })
    }
    return token ? token.current() : keys.keyNamed(keyNamed)!
  }

  /**
   * The keeper of `place`'s token, made once:  for a token made from its secret, or one that renews itself;
   * `undefined` for a plain secret.
   */
  private tokenFor(
    served: string,
    place: AuthenticatedPlace,
    keys = this.keysFor(served, place)
  ): PlaceToken | undefined {
    const { keyNamed, tokenFrom, renewsAt } = place
    if (tokenFrom === undefined && renewsAt === undefined) return undefined
    let token = this.tokensByPlace.get(served)
    if (token) return token
    const hold = (name: string, secret: string) => keys.hold(name, secret)
    token =
      renewsAt !== undefined
        ? new PlaceToken({
            keyNamed,
            keyFrom: (name) => this.newestOf(name),
            mint: tokenRefreshMint(addressUnder(place.at, renewsAt), this.fetch),
            renews: true,
            hold,
            save: (fresh) => {
              try {
                this.kept.keep(keyNamed, fresh)
              } catch (error) {
                this.say(`couldn't keep the renewed ${keyNamed}:  ${(error as Error).message}`)
              }
            },
            say: (line) => this.say(`${line} (the ${place.name} place in ${place.project})`)
          })
        : new PlaceToken({ keyNamed, keyFrom: keys.keyNamed, mint: tokenServiceMint(tokenFrom!, this.fetch), hold })
    this.tokensByPlace.set(served, token)
    return token
  }

  /**
   * A token that renews itself, by its name:  of the environment's and the one kept, the one that lasts longer, so a
   * renewal kept outlives the environment's older one;  the environment's when neither says.
   */
  private newestOf(name: string): string | undefined {
    const kept = this.kept.kept(name)
    const given = this.from[name]
    if (kept === undefined || given === undefined || kept === given) return given ?? kept
    return (tokenEndOf(kept) ?? 0) > (tokenEndOf(given) ?? 0) ? kept : given
  }
}

/** Constructor props of `AuthenticatedPlaces`. */
export type AuthenticatedPlacesProps = {
  /** Where secrets are found, by name;  default the environment, else the secrets kept (`SRV.Secrets`). */
  from?: Readonly<Record<string, string | undefined>>
  /** What sends requests on;  default the platform's. */
  fetch?: typeof globalThis.fetch
  /** Where a renewed token is kept, and read back;  default the secrets kept (`SRV.Secrets`). */
  kept?: Pick<SRV.Secrets, "kept" | "keep">
  /** Says a renewal, or a failed one;  default the console. */
  say?: (line: string) => void
}

/** Where the page server says how each place's token is:  `tokens()`. */
export const TOKENS_ROUTE = "/api/places/tokens"

/** How one place's token is, as the page server says it:  never the token. */
export type PlaceTokenReport = TokenState & {
  /** Its project:  `@acme/jobs`. */
  project: string
  /** The place:  `jobs`. */
  place: string
  /** The NAME of its secret. */
  secret: string
  /** The one line that fixes it, when it isn't `ok`. */
  fix?: string
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
  /** Where its secret, a token, is renewed before it runs out:  under `at`, or whole. */
  renewsAt?: string
  /** The folder of its saved answers, whole:  read when its server won't answer (`SavedAnswers`). */
  fixtures?: string
  /** It reads only from its saved answers:  every path, or these and what's under them. */
  offline?: boolean | readonly string[]
  /** It takes no writes. */
  readOnly?: boolean
  /**
   * Why it's not read at all, in words for people:  every request refused with them, and said at startup.
   * - e.g. the app's, for a deployment its project file doesn't list (`SP.UnlistedDeploymentError`'s words).
   */
  refusal?: string
  /** Its write and action routes, under `at`:  a read only one refuses each, a `GET` too.  See `SP.ServedPlace.writes`. */
  writes?: readonly string[]
  /** What its lines call its search and sort questions:  how its saved answers answer them.  See `SP.ServedPlace.asks`. */
  asks?: SavedAsks
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

/** Does `path` (its question aside) answer to `route`, a route's address with braces:  `/jobs/{id}/load`? */
function matchesRoute(route: string, path: string): boolean {
  const pattern = route.replace(/\{([^{}/]+)\}/g, (_brace, name: string) => `:${name.replace(/\W/g, "_")}`)
  return compilePattern(pattern)(path.replace(/[?#].*$/, "")) !== undefined
}

/** How a plain secret is, by its own end if it's a JWT. */
function stateOfSecret(secret: string | undefined): TokenState {
  if (secret === undefined) return { state: "missing" }
  const ends = tokenEndOf(secret)
  if (ends === undefined) return { state: "ok" }
  const left = ends - Date.now()
  const minutesLeft = Math.max(0, Math.floor(left / 60_000))
  return left <= 0 ? { state: "expired", minutesLeft } : { state: "ok", minutesLeft }
}

/** The one line that fixes a place's token, in words for people:  never a value. */
function fixFor({ keyNamed, tokenFrom }: AuthenticatedPlace, { state }: TokenState): string {
  if (tokenFrom !== undefined && state === "renew-failed")
    return `Check ${keyNamed}, the key its token is made from:  its token service turned it down, or didn't answer`
  if (state === "renew-failed") return `It works until it runs out;  then keep a fresh ${keyNamed}`
  return `Keep a fresh ${keyNamed} in ~/.spell/secrets/${keyNamed} (or the page server's environment):  the page server reads it at once`
}

/** Where a place's own address is read here, by the name its source finds it by:  `@acme/jobs/jobs`. */
function servedOf({ project, name }: AuthenticatedPlace): string {
  return `${project}/${name}`
}

/** `address` under a place's own, `at`, unless it's whole. */
function addressUnder(at: string, address: string): string {
  return /^[a-z][\w+.-]*:/i.test(address) ? address : `${at.replace(/\/+$/, "")}/${address.replace(/^\/+/, "")}`
}

/** The saved answer for `pathAndQuery` in `folder`, as it answers its question:  `undefined` for none. */
async function savedAnswer(folder: string, pathAndQuery: string, asks?: SavedAsks): Promise<string | undefined> {
  const file = savedAnswerPath(pathAndQuery)
  if (!file) return undefined
  const text = await readFile(join(folder, file), "utf8").catch(() => undefined)
  if (text === undefined) return undefined
  return answerFromSaved(text, new URL(pathAndQuery, "http://saved.answer").searchParams, asks)
}

/** Where a page reads a place:  `/api/places/projects/@acme/jobs/jobs`. */
function servedAddress(served: string): string {
  return `${AUTHENTICATED_PLACES_PREFIX}/${served}`
}

/**
 * Is this request a read?  A graphql server's reads are `POST`s:  only a mutation writes.
 * - A `GET` to a route its lines list as a write or an action isn't (a load):  `rest`, the path under the place.
 */
function isRead(
  method: string,
  { kind, writes = [] }: AuthenticatedPlace,
  body: Uint8Array | undefined,
  rest: string
): boolean {
  if (method === "GET" || method === "HEAD") return !writes.some((write) => matchesRoute(write, rest))
  if (kind !== "graphql server" || method !== "POST" || !body) return false
  try {
    const { query } = JSON.parse(new TextDecoder().decode(body)) as { query?: unknown }
    return typeof query === "string" && !GRAPHQL_MUTATION.test(query)
  } catch {
    return false
  }
}
