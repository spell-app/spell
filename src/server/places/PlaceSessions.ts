import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

/** Sets where sessions are kept, e.g. a test's temporary folder. */
export const PLACE_SESSIONS_FOLDER_SETTING = "SPELL_PLACE_SESSIONS_DIR"

/** A place's name, as a session's file is named by it:  one plain word, so it can't reach another folder. */
const PLACE_NAME = /^[A-Za-z0-9][\w-]*$/

/** Only this person, on this machine. */
const PRIVATE_FILE = 0o600

/** Only this person, on this machine. */
const PRIVATE_FOLDER = 0o700

/** Shorter than this, a value isn't a secret worth taking out of what's read:  `1`, `en`, `true` would mangle text. */
const SHORTEST_SECRET = 8

/** How long a browser's saved value must be to count as a secret:  a token, not a preference. */
const SHORTEST_STORED_SECRET = 16

/** The paths that say a browser or a reader was sent to sign in. */
const SIGN_IN_PATH = /(?:^|\/)(?:log-?in|sign-?in|sso|oauth2?|auth(?:orize)?|saml)(?:\/|$)/i

/****************
 * ### `PlaceSessions`
 * The sessions kept after someone signs in to a place in a browser Spell opened (epic `mockup` P12):  by the place's name.
 *
 * ```ts
 * const sessions = new PlaceSessions()
 * sessions.keep("console", { address, state: await context.storageState() })
 * sessions.named("console")?.cookieFor("https://console.example.com/api/racks")
 * ```
 *
 * - One file a place, `~/.spell/place-sessions/<place>.json`:  beside the other sign-ins, and NEVER in a repo.
 *   - Only its owner can read it (the file's mode 600, the folder's 700).
 * - A session is as good as the person's password while it lasts:
 *   what uses one takes its values out of whatever it writes (`PlaceSession.scrubbed()`).
 * - Node only;  its position:  node's own modules alone, so the commands that use it load nothing else of the server.
 ****************/
export class PlaceSessions {
  /** The folder the sessions are in. */
  readonly folder: string

  constructor({ folder }: PlaceSessionsProps = {}) {
    this.folder = folder ?? process.env[PLACE_SESSIONS_FOLDER_SETTING] ?? join(homedir(), ".spell", "place-sessions")
  }

  /** The file of `place`'s session.  - throws `TypeError` for a name that isn't one plain word */
  fileOf(place: string): string {
    if (!PLACE_NAME.test(place)) {
      throw new TypeError(`PlaceSessions:  "${place}" won't do as a place's name:  letters, digits, - and _`)
    }
    return join(this.folder, `${place}.json`)
  }

  /**
   * SIDE EFFECT:  `place`'s session is kept, replacing what was, its file private from its first byte:  the path.
   * - Written beside and moved in, so nothing reads half of one.
   */
  keep(place: string, { address, state, signedInAt = new Date().toISOString() }: PlaceSessionKept): string {
    const file = this.fileOf(place)
    mkdirSync(this.folder, { recursive: true, mode: PRIVATE_FOLDER })
    chmodSync(this.folder, PRIVATE_FOLDER)
    const writing = `${file}.${process.pid}.writing`
    writeFileSync(writing, JSON.stringify({ address, signedInAt, state }, null, 2), { mode: PRIVATE_FILE })
    renameSync(writing, file)
    return file
  }

  /** `place`'s session;  `undefined` if it never signed in.  - throws `TypeError` for a name that isn't one plain word */
  named(place: string): PlaceSession | undefined {
    const file = this.fileOf(place)
    if (!existsSync(file)) return undefined
    const { address, signedInAt, state } = JSON.parse(readFileSync(file, "utf8")) as Required<PlaceSessionKept>
    return new PlaceSession(place, address, signedInAt, state)
  }
}

/****************
 * ### `PlaceSession`
 * One place's kept session:  the cookies a request may carry, and what must never be written down.
 * - Never prints:  turned to JSON or a string, it's only the place's name and address.
 * - Plain values in and out.
 ****************/
export class PlaceSession {
  /** Its browser state, private so nothing prints it by accident. */
  private readonly state: BrowserSessionState

  constructor(
    /** The place's name. */
    readonly place: string,
    /** Where it signs in. */
    readonly address: string,
    /** When it signed in, in ISO. */
    readonly signedInAt: string,
    state: BrowserSessionState
  ) {
    this.state = state
  }

  /** What a browser starts from, for Playwright's `storageState`. */
  get browserState(): BrowserSessionState {
    return this.state
  }

  /**
   * The `Cookie` header for a request to `url`, as a browser would send it;  `undefined` when none go there.
   * - Only cookies of that host and path:  a session is never sent anywhere else.
   * - None that have expired, and a `secure` one only over https (or to this machine, as a browser does).
   */
  cookieFor(url: string): string | undefined {
    const at = URL.canParse(url) ? new URL(url) : undefined
    if (!at || !/^https?:$/.test(at.protocol)) return undefined
    const now = Date.now() / 1000
    const cookies = this.state.cookies
      .filter((cookie) => !isExpired(cookie, now) && isSentTo(cookie, at))
      .map(({ name, value }) => `${name}=${value}`)
    return cookies.length ? cookies.join("; ") : undefined
  }

  /** Was a request to `from` sent to `to` to sign in:  another host, or a sign-in path?  What says a session has ended. */
  sentToSignIn(from: string, to: string): boolean {
    const [asked, landed] = [new URL(from), new URL(to)]
    return asked.host !== landed.host || SIGN_IN_PATH.test(landed.pathname)
  }

  /** Has every cookie with an end passed it, leaving none that last?  A server can still end one sooner. */
  get hasEnded(): boolean {
    const now = Date.now() / 1000
    return this.state.cookies.every((cookie) => isExpired(cookie, now))
  }

  /** How many cookies it holds. */
  get cookieCount(): number {
    return this.state.cookies.length
  }

  /** Every value that must never be written down:  its cookies', and the long ones a page kept in its storage. */
  get secrets(): string[] {
    const cookies = this.state.cookies.map(({ value }) => value).filter((value) => value.length >= SHORTEST_SECRET)
    const stored = this.state.origins
      .flatMap(({ localStorage }) => localStorage.map(({ value }) => value))
      .filter((value) => value.length >= SHORTEST_STORED_SECRET)
    return [...new Set([...cookies, ...stored])]
  }

  /** `text`, with every secret taken out:  as written in JSON too, where it may not look like itself. */
  scrubbed(text: string): string {
    let clean = text
    for (const secret of this.secrets) {
      const inJson = JSON.stringify(secret).slice(1, -1)
      clean = clean.replaceAll(secret, "[its session]").replaceAll(inJson, "[its session]")
    }
    return clean
  }

  /** Only its name and address. */
  toJSON(): { place: string; address: string; signedInAt: string } {
    return { place: this.place, address: this.address, signedInAt: this.signedInAt }
  }

  /** Only its name. */
  toString(): string {
    return `PlaceSession(${this.place})`
  }

  /** Only its name, for `console.log()`. */
  [Symbol.for("nodejs.util.inspect.custom")](): string {
    return this.toString()
  }
}

/** Has `cookie` an end, and is it past?  `-1` means it lasts as long as the browser. */
function isExpired({ expires }: BrowserCookie, now: number): boolean {
  return expires > 0 && expires < now
}

/** Would a browser send `cookie` to address `at`? */
function isSentTo({ domain, path, secure }: BrowserCookie, at: URL): boolean {
  if (secure && at.protocol !== "https:" && !/^(?:localhost|127\.0\.0\.1|\[::1\])$/.test(at.hostname)) return false
  const host = domain.replace(/^\./, "")
  if (at.hostname !== host && !(domain.startsWith(".") && at.hostname.endsWith(`.${host}`))) return false
  return at.pathname === path || at.pathname.startsWith(path.endsWith("/") ? path : `${path}/`)
}

/** Constructor props of `PlaceSessions`. */
export type PlaceSessionsProps = {
  /** The folder they're in;  default the `SPELL_PLACE_SESSIONS_DIR` setting, else `~/.spell/place-sessions`. */
  folder?: string
}

/** What's kept of a session. */
export type PlaceSessionKept = {
  /** Where it signs in. */
  address: string
  /** Its browser state, Playwright's. */
  state: BrowserSessionState
  /** When it signed in, in ISO;  default now. */
  signedInAt?: string
}

/** One cookie, as Playwright's `storageState()` says it. */
export type BrowserCookie = {
  /** Its name. */
  name: string
  /** Its value:  secret. */
  value: string
  /** Its host;  a leading dot takes in the hosts under it. */
  domain: string
  /** The path it's sent under. */
  path: string
  /** When it ends, in seconds since 1970;  `-1`:  with the browser. */
  expires: number
  /** Hidden from a page's scripts. */
  httpOnly: boolean
  /** Only over https. */
  secure: boolean
  /** Which other sites' requests may carry it. */
  sameSite: "Strict" | "Lax" | "None"
}

/** A browser's whole sign-in, as Playwright's `storageState()` says it. */
export type BrowserSessionState = {
  /** Its cookies. */
  cookies: BrowserCookie[]
  /** What each origin kept in its local storage. */
  origins: { origin: string; localStorage: { name: string; value: string }[] }[]
}
