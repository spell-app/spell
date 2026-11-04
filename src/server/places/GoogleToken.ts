import { createSign } from "node:crypto"

import { Api } from "spell/util/Api"
import { ApiError } from "spell/util/fetching"
import { PlaceError } from "spell/util/places/places.types"

import type { PlaceKeys } from "./PlaceKeys"

/** What a token lets it do:  read and write spreadsheets, and nothing else. */
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets"

/** How long a signed request for a token lasts, in seconds:  Google's most. */
const ASSERTION_SECONDS = 3600

/** A token this close to its end is replaced:  it may run out on the way. */
const EARLY_MS = 60_000

/** What Google calls this way of asking for a token. */
const JWT_GRANT = "urn:ietf:params:oauth:grant-type:jwt-bearer"

/** The parts of a service account's key file it uses. */
type ServiceAccount = {
  /** The account's address:  what a sheet is shared with. */
  client_email: string
  /** Signs the requests for a token. */
  private_key: string
  /** Where to ask. */
  token_uri: string
}

/****************
 * ### `GoogleToken`
 * The short-lived token Google wants on each request, from a service account's key held in `PlaceKeys` (epic `data` P7).
 * - Google's OAuth 2.0 for server to server applications:  a request signed with the account's key, for a token good for an hour.
 *   - SEE:  https://developers.google.com/identity/protocols/oauth2/service-account
 * - Kept until a minute before it runs out.
 * - The key named holds the WHOLE key file, as JSON, as Google gives it.
 * - The token, and the private key inside the file, are secrets too:  each goes into `PlaceKeys`, so they're scrubbed from
 *   every answer like the key itself.
 * - Node only, for signing.  No dependency.
 ****************/
export class GoogleToken {
  /** The name of the key. */
  private readonly keyNamed: string
  /** Where it's held. */
  private readonly keys: PlaceKeys
  /** Sends the request for a token. */
  private readonly api = new Api()
  /** The token, once there is one. */
  private token: string | undefined
  /** When to stop using it. */
  private goodUntil = 0
  /** The request for one under way:  everyone waits for this one. */
  private asking: Promise<string> | undefined

  constructor({ keyNamed, keys }: GoogleTokenProps) {
    this.keyNamed = keyNamed
    this.keys = keys
  }

  /** The address a sheet has to be shared with:  `undefined` while the key isn't there, or can't be read. */
  get accountEmail(): string | undefined {
    try {
      return this.account().client_email
    } catch {
      return undefined
    }
  }

  /**
   * A token good for now.
   * - throws `PlaceError` `"refused"` for a key that isn't set, can't be read, or that Google turns down;  anything else for no answer
   */
  current = async (): Promise<string> => {
    if (this.token && Date.now() < this.goodUntil) return this.token
    return (this.asking ??= this.ask().finally(() => (this.asking = undefined)))
  }

  /** Ask Google for a new one. */
  private async ask(): Promise<string> {
    const account = this.account()
    const body = new URLSearchParams({ grant_type: JWT_GRANT, assertion: this.signedRequest(account) })
    try {
      const { access_token: token, expires_in: seconds } = await this.api.request<GoogleTokenAnswer>({
        url: account.token_uri,
        urlData: {},
        method: "POST",
        data: body,
        responseType: "json"
      })
      this.keys.hold(`${this.keyNamed}'s token`, token)
      this.token = token
      this.goodUntil = Date.now() + seconds * 1000 - EARLY_MS
      return token
    } catch (error) {
      if (error instanceof ApiError && error.status !== undefined && error.status < 500) {
        throw this.refusal(`Google turned down the key named "${this.keyNamed}" (${error.status})`)
      }
      throw error
    }
  }

  /** The request for a token, as a signed JWT. */
  private signedRequest({
    client_email: issuer,
    private_key: privateKey,
    token_uri: audience
  }: ServiceAccount): string {
    const now = Math.floor(Date.now() / 1000)
    const claims = { iss: issuer, scope: SHEETS_SCOPE, aud: audience, iat: now, exp: now + ASSERTION_SECONDS }
    const signing = [{ alg: "RS256", typ: "JWT" }, claims].map(base64Url).join(".")
    const signature = createSign("RSA-SHA256").update(signing).sign(privateKey, "base64url")
    return `${signing}.${signature}`
  }

  /** The key file.  - throws `PlaceError` `"refused"` if it isn't set, or isn't one */
  private account(): ServiceAccount {
    const key = this.keys.keyNamed(this.keyNamed)
    if (key === undefined) {
      throw this.refusal(`no key named "${this.keyNamed}" is set;  set it to the service account's key file, as JSON`)
    }
    let account: Partial<ServiceAccount> | undefined
    try {
      account = JSON.parse(key) as Partial<ServiceAccount>
    } catch {
      // the message says nothing of what it read:  that's the key
    }
    if (!account?.client_email || !account.private_key || !account.token_uri) {
      throw this.refusal(`the key named "${this.keyNamed}" isn't a service account's key file, as JSON`)
    }
    this.keys.hold(`${this.keyNamed}'s private key`, account.private_key)
    return account as ServiceAccount
  }

  /** A `PlaceError` `"refused"`, saying `why`. */
  private refusal(why: string): PlaceError {
    return new PlaceError(`GoogleToken:  ${why}`, { cause: { kind: "refused", whyNot: "place" } })
  }
}

/** Constructor props of a `GoogleToken`. */
export type GoogleTokenProps = {
  /** The name of the key:  the service account's key file, as JSON. */
  keyNamed: string
  /** Where it's held. */
  keys: PlaceKeys
}

/** Google's answer to a request for a token. */
type GoogleTokenAnswer = {
  /** The token. */
  access_token: string
  /** How many seconds it lasts. */
  expires_in: number
}

/** `value` as JSON, in a JWT's kind of base 64. */
function base64Url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url")
}
