import { PlaceError } from "./places.types"
import { newId } from "./refs"

/** A token this close to its end is replaced:  it may run out on the way. */
const EARLY_MS = 60_000

/** How long a token lasts when nothing says:  five minutes, so one with no end is made again soon. */
const UNSAID_SECONDS = 300

/** The fields a token service's answer may hold its token in, the usual first. */
const TOKEN_FIELDS = ["token", "access_token", "accessToken", "jwt"] as const

/** The most before its end a token that renews itself is renewed:  an hour, or a quarter of its life if that's less. */
const RENEW_WITHIN_MS = 60 * 60_000

/** How long after a failed renewal it's tried again. */
const RETRY_MS = 5 * 60_000

/** A token with less than this left, which hasn't renewed, is `expiring`. */
export const EXPIRING_WITHIN_MS = 15 * 60_000

/** A brace in a token service's address:  filled with the key's id, `/api-keys/{key id}/token`. */
const BRACE = /\{[^{}]*\}/g

/**
 * What a token service answered:  the token, and how long it lasts.
 * - Neither `seconds` nor `endsAt`:  its own end, if it's a JWT, else `UNSAID_SECONDS`.
 */
export type MintedToken = {
  /** The token. */
  token: string
  /** How many seconds it lasts. */
  seconds?: number
  /** When it runs out, in msec since 1970. */
  endsAt?: number
}

/** Makes a token from a key:  see `PlaceToken`.  - throws `PlaceError` `"refused"` for a key it turns down */
export type TokenMint = (key: string) => Promise<MintedToken>

/**
 * How a token is now, for whoever should hear:  never the token.
 * - `ok`:  it works, with time left, or a new one is made from the key whenever it's needed
 * - `expiring`:  under `EXPIRING_WITHIN_MS` left, and not renewed
 * - `expired`:  its time is up, and nothing can renew it:  a fresh one has to be kept
 * - `renew-failed`:  making or renewing it was tried, and failed (`why`);  it still works until it runs out
 * - `missing`:  no secret by its name is set
 */
export type TokenState = {
  /** How it is. */
  state: "ok" | "expiring" | "expired" | "renew-failed" | "missing"
  /** Whole minutes it has left, when it says. */
  minutesLeft?: number
  /** Why the last try to make or renew it failed. */
  why?: string
}

/****************
 * ### `PlaceToken`
 * A short-lived token made from a key, kept, and made again before it runs out (epic `data` P49, J255):
 * what a place sends when its line says `it is authenticated with a token from "...", made with the secret "ACME_API_KEY"`.
 *
 * ```ts
 * const token = new PlaceToken({ keyNamed: "ACME_API_KEY", keyFrom, mint: tokenServiceMint("https://auth.acme.test/api-keys/{key id}/token") })
 * new RestPlace({ url, keyNamed: "ACME_API_KEY", keyFrom: token.current })
 * ```
 *
 * - How a token is made is handed in, `mint`:  a token service's (`tokenServiceMint()`), or Google's for a service
 *   account (`GoogleToken`, in `spell/server/places`).
 * - Asks once at a time:  everyone waiting gets the same one.  Kept until a minute before it runs out.
 * - The key comes from `keyFrom`, which only a server side has:  a page never holds one.
 * - `hold`:  each secret it meets (the token) is handed there too, so it's scrubbed from every answer as the key is.
 * - `renews`:  the secret IS the token, renewed through `mint` (`tokenRefreshMint()`, a server's refresh route) before
 *   it runs out:  within an hour of its end, or a quarter of its life.  `save` keeps each new one where the secret came
 *   from, so it lasts past a restart.
 *   - A renewal that fails is said once (`say`), tried again in 5 minutes, and the token used until it runs out.
 *   - Ended, it can't be renewed:  refused, `expired`, until a fresh one is kept under its name (`keyFrom` says a new one).
 * - `state()`:  how it is now, for the page server's token report.
 ****************/
export class PlaceToken {
  /** The name of the key it's made from. */
  private readonly keyNamed: string
  /** Finds the key by its name. */
  private readonly keyFrom: (name: string) => string | undefined
  /** Makes a token. */
  private readonly mint: TokenMint
  /** Hears each secret it meets. */
  private readonly hold: ((label: string, secret: string) => void) | undefined
  /** What time it is:  a test's clock. */
  private readonly now: () => number
  /** The token, once there is one. */
  private token: string | undefined
  /** When to stop using it. */
  private goodUntil = 0
  /** The request for one under way:  everyone waits for this one. */
  private asking: Promise<string> | undefined
  /** The secret is the token, renewed through `mint`. */
  private readonly renews: boolean
  /** Keeps a renewed token where the secret came from. */
  private readonly save: ((token: string) => void) | undefined
  /** Says a renewal, or a failed one, in a line:  never the token. */
  private readonly say: ((line: string) => void) | undefined
  /** The secret as `keyFrom` last gave it:  a different one is a fresh token someone kept. */
  private given: string | undefined
  /** Why the last try to make or renew it failed, until one works. */
  private failed: string | undefined
  /** When a renewal that failed is tried again. */
  private retryAt = 0

  constructor({ keyNamed, keyFrom, mint, hold, renews = false, save, say, now = Date.now }: PlaceTokenProps) {
    this.keyNamed = keyNamed
    this.keyFrom = keyFrom
    this.mint = mint
    this.hold = hold
    this.renews = renews
    this.save = save
    this.say = say
    this.now = now
  }

  /**
   * How it is now (`TokenState`):  never the token.
   * - Made from a key:  `ok` while it can be made, `renew-failed` when the last try failed, `missing` with no key.
   * - Renewing itself:  by its own end too, `expiring` and `expired`.
   */
  state(): TokenState {
    const source = this.keyFrom(this.keyNamed)
    if (source === undefined) return { state: "missing" }
    const token = this.renews && source !== this.given ? source : this.token
    const ends = token === undefined ? undefined : jwtEndOf(token)
    const left = ends === undefined ? undefined : ends - this.now()
    const minutes = left === undefined ? {} : { minutesLeft: Math.max(0, Math.floor(left / 60_000)) }
    const failed = this.renews && source !== this.given ? undefined : this.failed
    if (!this.renews) return failed ? { state: "renew-failed", ...minutes, why: failed } : { state: "ok", ...minutes }
    if (left !== undefined && left <= 0) return { state: "expired", ...minutes, ...(failed && { why: failed }) }
    if (failed) return { state: "renew-failed", ...minutes, why: failed }
    if (left !== undefined && left < EXPIRING_WITHIN_MS) return { state: "expiring", ...minutes }
    return { state: "ok", ...minutes }
  }

  /**
   * A token good for now:  what a place's `keyFrom` is handed.
   * - throws `PlaceError` `"refused"` for a key that isn't set, or that's turned down;  anything else for no answer
   */
  current = async (): Promise<string> => {
    if (this.token && this.now() < this.goodUntil) return this.token
    return (this.asking ??= this.made().finally(() => (this.asking = undefined)))
  }

  /** Make a new one. */
  private async made(): Promise<string> {
    const key = this.keyFrom(this.keyNamed)
    if (key === undefined) {
      throw new PlaceError(`PlaceToken:  no key named "${this.keyNamed}" is set, so no token can be made from it`, {
        cause: { kind: "refused", whyNot: "place" }
      })
    }
    if (this.renews) return this.renewed(key)
    try {
      const { token, seconds, endsAt } = await this.mint(key)
      this.hold?.(`${this.keyNamed}'s token`, token)
      const ends = endsAt ?? (seconds !== undefined ? this.now() + seconds * 1000 : jwtEndOf(token))
      this.token = token
      this.goodUntil = (ends ?? this.now() + UNSAID_SECONDS * 1000) - EARLY_MS
      this.failed = undefined
      return token
    } catch (error) {
      this.failed = messageOf(error)
      throw error
    }
  }

  /**
   * The token that renews itself:  `given`, the secret now, or the one it renewed to;  renewed when it's due.
   * - throws `PlaceError` `"refused"` when it's run out:  a fresh one has to be kept
   */
  private async renewed(given: string): Promise<string> {
    if (given !== this.given) {
      // a fresh one, kept by someone, or the first:  start from it
      this.given = given
      this.token = given
      this.failed = undefined
      this.retryAt = 0
      this.hold?.(this.keyNamed, given)
    }
    const token = this.token!
    const now = this.now()
    const ends = jwtEndOf(token)
    if (ends !== undefined && ends <= now) {
      throw new PlaceError(
        `PlaceToken:  ${this.keyNamed} has run out, so it can't be renewed:  keep a fresh one under that name`,
        { cause: { kind: "refused", whyNot: "signed out" } }
      )
    }
    if (ends === undefined) {
      // nothing says when it ends:  sent as it is
      this.goodUntil = now + UNSAID_SECONDS * 1000
      return token
    }
    const renewAt = ends - renewWithin(token, ends)
    if (now < renewAt || now < this.retryAt) {
      this.goodUntil = Math.min(ends, Math.max(renewAt, this.retryAt))
      return token
    }
    try {
      const fresh = await this.mint(token)
      const freshEnds =
        fresh.endsAt ?? (fresh.seconds !== undefined ? now + fresh.seconds * 1000 : jwtEndOf(fresh.token))
      if (freshEnds !== undefined && freshEnds <= ends) throw new Error("the renewal gave it no more time")
      this.hold?.(`${this.keyNamed}'s renewed token`, fresh.token)
      this.token = fresh.token
      this.failed = undefined
      this.retryAt = 0
      this.save?.(fresh.token)
      // kept where `keyFrom` reads it:  so what it says next is this one, not a fresh one someone kept
      const kept = this.keyFrom(this.keyNamed)
      this.given = kept === fresh.token ? fresh.token : given
      const lasts = (freshEnds ?? now + UNSAID_SECONDS * 1000) - now
      this.say?.(`renewed ${this.keyNamed}:  it has ${Math.floor(lasts / 60_000)} minutes left`)
      this.goodUntil =
        freshEnds === undefined ? now + UNSAID_SECONDS * 1000 : freshEnds - renewWithin(fresh.token, freshEnds)
      return fresh.token
    } catch (error) {
      const why = messageOf(error)
      if (this.failed === undefined) this.say?.(`couldn't renew ${this.keyNamed} (${why}):  it works until it runs out`)
      this.failed = why
      this.retryAt = now + RETRY_MS
      this.goodUntil = Math.min(ends, this.retryAt)
      return token
    }
  }
}

/** How long before its end a token that renews itself is renewed:  an hour, or a quarter of its life if that's less. */
function renewWithin(token: string, ends: number): number {
  const issued = jwtClaimOf(token, "iat")
  const life = typeof issued === "number" ? ends - issued * 1000 : undefined
  return life !== undefined && life > 0 ? Math.min(RENEW_WITHIN_MS, life / 4) : RENEW_WITHIN_MS
}

/** What an error says. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Constructor props of a `PlaceToken`. */
export type PlaceTokenProps = {
  /** The name of the key it's made from:  never the key. */
  keyNamed: string
  /** Finds the key by its name:  a server side's. */
  keyFrom: (name: string) => string | undefined
  /** Makes a token from the key. */
  mint: TokenMint
  /** Hears each secret it meets, to scrub it. */
  hold?: (label: string, secret: string) => void
  /** The secret is the token, renewed through `mint` before it runs out (`tokenRefreshMint()`). */
  renews?: boolean
  /** Keeps a renewed token where the secret came from:  `Secrets.keep()`. */
  save?: (token: string) => void
  /** Says a renewal, or a failed one, in a line. */
  say?: (line: string) => void
  /** What time it is, in msec:  a test's clock. */
  now?: () => number
}

/**
 * A token service's way to make a token (epic `data` P49, Q50):  `POST` to `address`, signed in with the key.
 * - The key holds `<key id>:<secret>`:  sent as Basic sign-in, and each brace in `address` is the key id,
 *   `https://auth.acme.test/api-keys/{key id}/token`.
 * - Its answer, as JSON:  the token in `token`, `access_token`, `accessToken` or `jwt`;  how long it lasts in
 *   `expires_in` / `expiresIn` (seconds) or `expires_at` / `expiresAt` (a date, or seconds since 1970).
 * - An answer that's text is the token itself.
 * - Each request has a fresh `X-Request-Id`:  some services refuse one without (a 400), and it's harmless to the rest.
 * - `fetch`:  what sends it, the platform's unless a caller's (a look's, which minds its manners).
 * - throws `PlaceError` `"refused"` for a key with no id, or a 4xx;  anything else for no answer
 */
export function tokenServiceMint(address: string, fetch: typeof globalThis.fetch = globalThis.fetch): TokenMint {
  return async (key) => {
    const cut = key.indexOf(":")
    if (cut <= 0) {
      throw new PlaceError(
        "tokenServiceMint():  a key for a token service is its id and secret, as <key id>:<secret>",
        {
          cause: { kind: "refused", whyNot: "place" }
        }
      )
    }
    const keyId = key.slice(0, cut)
    const url = address.replace(BRACE, encodeURIComponent(keyId))
    const answer = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Basic ${base64(key)}`,
        accept: "application/json",
        "x-request-id": newId("spell")
      }
    })
    if (answer.status >= 400 && answer.status < 500) {
      throw new PlaceError(`tokenServiceMint():  ${new URL(url).host} turned down the key (${answer.status})`, {
        cause: { kind: "refused", whyNot: "place" }
      })
    }
    if (!answer.ok) throw new Error(`tokenServiceMint():  ${new URL(url).host} answered ${answer.status}`)
    return mintedFrom(await answer.text())
  }
}

/**
 * A server's way to renew a token that still works (`its token is renewed at "..."`):  `GET` to `address`, the token
 * as `Authorization: Bearer`, the answer holding the new one, as a token service's does (`token`, `access_token` ...).
 * - Each request has a fresh `X-Request-Id`, as `tokenServiceMint()`'s.
 * - throws `PlaceError` `"refused"` for a 4xx:  the token isn't good any more;  anything else for no answer
 */
export function tokenRefreshMint(address: string, fetch: typeof globalThis.fetch = globalThis.fetch): TokenMint {
  return async (token) => {
    const answer = await fetch(address, {
      headers: { authorization: `Bearer ${token}`, accept: "application/json", "x-request-id": newId("spell") }
    })
    if (answer.status >= 400 && answer.status < 500) {
      throw new PlaceError(`tokenRefreshMint():  ${new URL(address).host} turned down the token (${answer.status})`, {
        cause: { kind: "refused", whyNot: "signed out" }
      })
    }
    if (!answer.ok) throw new Error(`tokenRefreshMint():  ${new URL(address).host} answered ${answer.status}`)
    return mintedFrom(await answer.text())
  }
}

/** When a JWT runs out, in msec since 1970:  `undefined` for a token that isn't one, or says no end. */
export function tokenEndOf(token: string): number | undefined {
  return jwtEndOf(token)
}

/** A token service's answer as a token.  - throws `TypeError` for one with no token in it */
function mintedFrom(text: string): MintedToken {
  let body: Record<string, unknown> | undefined
  try {
    body = JSON.parse(text) as Record<string, unknown>
  } catch {
    // not JSON:  the token itself
  }
  if (!body || typeof body !== "object") {
    const token = text.trim()
    if (!token) throw new TypeError("tokenServiceMint():  its answer was empty")
    return { token }
  }
  const field = TOKEN_FIELDS.find((name) => typeof body[name] === "string")
  if (!field) throw new TypeError(`tokenServiceMint():  its answer holds no ${TOKEN_FIELDS.join(", ")}`)
  const seconds = Number(body.expires_in ?? body.expiresIn)
  const at = body.expires_at ?? body.expiresAt
  const endsAt = typeof at === "number" ? at * 1000 : typeof at === "string" ? Date.parse(at) : undefined
  return {
    token: body[field] as string,
    ...(seconds > 0 && { seconds }),
    ...(endsAt !== undefined && !Number.isNaN(endsAt) && { endsAt })
  }
}

/** When a JWT runs out, in msec:  `undefined` for a token that isn't one, or says no end. */
function jwtEndOf(token: string): number | undefined {
  const exp = jwtClaimOf(token, "exp")
  return typeof exp === "number" ? exp * 1000 : undefined
}

/** One claim of a JWT, read without checking it:  `undefined` for a token that isn't one. */
function jwtClaimOf(token: string, claim: string): unknown {
  const [, claims] = token.split(".")
  if (!claims) return undefined
  try {
    return (JSON.parse(fromBase64Url(claims)) as Record<string, unknown>)[claim]
  } catch {
    return undefined
  }
}

/** `text` in base 64:  in a page and in node alike. */
function base64(text: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(text)))
}

/** Base 64 for addresses, as text. */
function fromBase64Url(value: string): string {
  const plain = value.replace(/-/g, "+").replace(/_/g, "/")
  const bytes = Uint8Array.from(atob(plain.padEnd(Math.ceil(plain.length / 4) * 4, "=")), (each) => each.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}
