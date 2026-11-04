import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"

import { SESSION_DAYS } from "./signIn.types"

/** How long a credential is good for, in days:  as long as a device stays signed in. */
export const READ_CREDENTIAL_DAYS = SESSION_DAYS

/** The cookie a credential to read a space rides in:  one per space, each only its own read address gets. */
export const READ_CREDENTIAL_COOKIE = "spell-space-read"

/****************
 * ### `ReadCredentials`
 * Credentials to read a whole space straight from its files, apart from Spell's server (epic `atmosphere` P5, Q6 C).
 *
 * ```ts
 * const credentials = new ReadCredentials({ file })
 * const credential = credentials.issue({ space: "@family/cookbook", person: "bo@spell" })
 * credentials.check(credential)          // { space: "@family/cookbook", person: "bo@spell", until }
 * ```
 *
 * - A credential says which space, who, and until when, SIGNED by this server's key:  so whatever serves the space's
 *   files can tell one is real without asking Spell's server, which may be down.
 * - It's for the WHOLE space:  a space's reads are all or nothing, as an AT Protocol Space's are.
 *   Something private is a space of its own.
 * - Taken back when the person leaves:  whatever serves the files also asks if they're still a reader
 *   (`DirectReads`' `mayRead`), from the member list on disk, which reads while nothing writes.
 * - The key is kept in `file`, readable by this machine's person only, so a restart keeps every credential good;
 *   with none, it's made for this run.
 * - No HTTP:  `PlaceServer` hands one out (its `credentials`), `DirectReads` checks it.  Knows no people.
 ****************/
export class ReadCredentials {
  /** The key every credential is signed with. */
  private readonly key: Buffer
  /** Now, in milliseconds:  a test's own clock. */
  private readonly now: () => number

  constructor({ file, now = Date.now }: ReadCredentialsProps = {}) {
    this.key = file ? keyIn(file) : randomBytes(32)
    this.now = now
  }

  /** A credential for `person` to read `space`, good for `READ_CREDENTIAL_DAYS`. */
  issue({ space, person }: { space: string; person: string }): string {
    const said: ReadCredential = { space, person, until: this.now() + READ_CREDENTIAL_DAYS * 24 * 60 * 60 * 1000 }
    const text = Buffer.from(JSON.stringify(said)).toString("base64url")
    return `${text}.${this.signatureOf(text)}`
  }

  /** What `credential` says, if it's one of this server's and still good:  else `undefined`.  - NEVER throws */
  check(credential: string | undefined): ReadCredential | undefined {
    const [text, signature, ...rest] = (credential ?? "").split(".")
    if (!text || !signature || rest.length) return undefined
    const expected = Buffer.from(this.signatureOf(text))
    const given = Buffer.from(signature)
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return undefined
    try {
      const said = JSON.parse(Buffer.from(text, "base64url").toString("utf8")) as ReadCredential
      const isWhole = typeof said.space === "string" && typeof said.person === "string"
      return isWhole && typeof said.until === "number" && said.until > this.now() ? said : undefined
    } catch {
      return undefined
    }
  }

  /** `text`'s signature, by this server's key. */
  private signatureOf(text: string): string {
    return createHmac("sha256", this.key).update(text).digest("base64url")
  }
}

/** What a credential says. */
export type ReadCredential = {
  /** The space it reads, by its address:  `@family/cookbook`. */
  space: string
  /** Who it was given to:  `bo@spell`. */
  person: string
  /** When it stops being good, in milliseconds. */
  until: number
}

/** Constructor props of `ReadCredentials`. */
export type ReadCredentialsProps = {
  /** Where its key is kept:  made there the first time.  Left out:  a key for this run, so a restart ends them all. */
  file?: string
  /** Now, in milliseconds;  default `Date.now`. */
  now?: () => number
}

/** The key in `file`, made there first if it isn't, readable by this machine's person only. */
function keyIn(file: string): Buffer {
  if (existsSync(file)) return Buffer.from(readFileSync(file, "utf8").trim(), "hex")
  const key = randomBytes(32)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${key.toString("hex")}\n`, { mode: 0o600 })
  return key
}
