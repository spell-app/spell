import { PlaceError } from "./places.types"

/** A token this close to its end is replaced:  it may run out on the way. */
const EARLY_MS = 60_000

/** How long a token lasts when nothing says:  five minutes, so one with no end is made again soon. */
const UNSAID_SECONDS = 300

/** The fields a token service's answer may hold its token in, the usual first. */
const TOKEN_FIELDS = ["token", "access_token", "accessToken", "jwt"] as const

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

  constructor({ keyNamed, keyFrom, mint, hold, now = Date.now }: PlaceTokenProps) {
    this.keyNamed = keyNamed
    this.keyFrom = keyFrom
    this.mint = mint
    this.hold = hold
    this.now = now
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
    const { token, seconds, endsAt } = await this.mint(key)
    this.hold?.(`${this.keyNamed}'s token`, token)
    const ends = endsAt ?? (seconds !== undefined ? this.now() + seconds * 1000 : jwtEndOf(token))
    this.token = token
    this.goodUntil = (ends ?? this.now() + UNSAID_SECONDS * 1000) - EARLY_MS
    return token
  }
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
      headers: { authorization: `Basic ${base64(key)}`, accept: "application/json" }
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
  const [, claims] = token.split(".")
  if (!claims) return undefined
  try {
    const { exp } = JSON.parse(fromBase64Url(claims)) as { exp?: number }
    return typeof exp === "number" ? exp * 1000 : undefined
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
