// FIRST:  defines `__PACKAGE_VERSION__`, which vite would, before anything reads it
import "spell/parser/spell/node/packageVersion.node"

import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs"
import { join } from "path"
import { fileURLToPath } from "url"

import { SRV } from "spell/server"
import { MailCatcher, ReadCredentials, SignInCheck, SignIns } from "spell/server/signIn"
import environment from "spell/app/spaces/server/node/environment"
import type { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"
import { peopleStore } from "spell/app/spaces/server/node/people/peopleRoutes"
import { SpellAccounts } from "spell/app/spaces/server/node/people/SpellAccounts"
import { SpaceBackups } from "spell/app/spaces/server/node/places/SpaceBackups"
import { TERMS_PATH } from "spell/app/spaces/server/node/places/SpaceExport"
import { SpaceFolders } from "spell/app/spaces/server/node/places/SpaceFolders"
import { projectBuild, spaceFiles } from "./api"
import { APP_DIR } from "./EditorServer"

/** Where the cloud serves a program:  `/apps/@spell/examples/FamilyCookbook`. */
export const CLOUD_APPS_PREFIX = "/apps"

/** The port it listens on, unless told otherwise:  the page server's is 4747, the preview's 4848. */
export const CLOUD_PORT = 4949

/** The program groups it serves, and only these:  the built-in ones, which anyone may read anyway. */
const SERVED_GROUPS = /^\/@spell\/(?:examples|guides)\//

/** Its record while it runs, in `environment.cloudDir`:  its port and write token, for `spell app cloud`. */
const RECORD_FILE = "cloud.json"

/** The page every program is served on (`/apps/<project>`). */
const APP_PAGE = fileURLToPath(new URL("cloudApp.html", import.meta.url))

/** Spell's terms page (epic `atmosphere` P7). */
const TERMS_FILE = fileURLToPath(new URL("../places/terms.html", import.meta.url))

/** `yarn build:element`'s output:  `<spell-viewer>` and the runtime programs run on. */
const ELEMENT_DIR = join(APP_DIR, "dist-element")

/****************
 * ### `SpellCloud`
 * Spell's server for people reaching it from OUTSIDE this machine (epic `atmosphere` P8, Q8 B):
 * the cloud a program's `family cookbook is saved in the cloud` keeps its things in.
 * - Invite only, on a machine Owen runs.
 *
 * ```ts
 * const cloud = new SpellCloud({ address: "https://spell.example.org" })
 * await cloud.listen({ port: 4949 })                     // `spell app cloud serve`
 * ```
 *
 * - It serves ONLY what people outside need, never the page server's tools (no editor, no `/api/files`, no epics):
 *   - `/api/sign-in/...` and its link's page:  signing in by email, invite only (`SignInCheck`)
 *     - the mail catcher's page and list are NOT served (`caughtMail: "hidden"`):  they'd hand anyone every code
 *     - until a mail service is picked (Q12), its mail waits in `environment.cloudDir`'s `mail/`,
 *       and `spell app cloud mail` reads it on this machine
 *   - every project data folder, as the page server serves them (`SpaceFolders`):
 *     `/api/places/spaces/...`, `/api/reads/spaces/...`, `/api/exports/spaces/...`
 *   - `/apps/<project>`:  a built-in program's page (`cloudApp.html`), and its files under `/spaces/`,
 *     for `@spell/examples` and `@spell/guides` alone
 *   - `/element/...`:  `<spell-viewer>` and the runtime
 *   - `/terms`;  `/hello`, liveness
 * - WHO'S ASKING is whoever's signed in, and nobody else:  no "this machine's person" for someone outside.
 *   - Its pages carry no write token (no `window.SPELL_SERVER`), so nothing but a sign-in writes.
 *   - Its token is for this machine's own commands (`spell app cloud invite`):
 *     in its record, `cloud.json`, readable by this machine's person only.
 * - ITS ADDRESS (`address`):
 *   where people reach it, through whatever puts it there with a certificate (a tunnel or a proxy, on this machine).
 *   - It listens on this machine alone (`127.0.0.1`).
 *   - Its host is let in, writes from its origin;  its mails' links start with it.
 *   - An `https` address marks every cookie it sets `Secure`.
 * - BACKUPS:  every space, each night, a week kept, as the main checkout's page server makes them (`SpaceBackups`).
 * - Node only;  NEVER imported by the editor's browser code.
 * - NOT the page server's route module (`appRoutes`):
 *   that serves this machine's person, and takes them to be anyone who isn't signed in.
 ****************/
export class SpellCloud {
  /** The web server, its guard and its router. */
  readonly server: SRV.WebServer
  /** Its sign-in check:  its mail seam's catcher among it. */
  readonly signIn: SignInCheck
  /** Where people reach it, `https://spell.example.org`:  `undefined` for this machine alone. */
  readonly address: string | undefined
  /** Every project data folder. */
  private readonly folders: SpaceFolders
  /** Where it keeps its own files. */
  private readonly dir: string
  /** What stops the nightly backups. */
  private stopBackups: (() => void) | undefined

  constructor({
    address,
    dir = environment.cloudDir,
    people = peopleStore(),
    folderFor,
    abuseContact = environment.abuseContact
  }: SpellCloudProps = {}) {
    this.address = address?.replace(/\/+$/, "")
    this.dir = dir
    mkdirSync(dir, { recursive: true })
    this.server = new SRV.WebServer({ live: false })
    if (this.address) this.server.guard.allowAddress(this.address)
    this.folders = new SpaceFolders({
      credentials: new ReadCredentials({ file: join(dir, "space-reads.key") }),
      personFor: signedInPerson,
      people,
      abuseContact,
      ...(folderFor && { folderFor })
    })
    this.signIn = new SignInCheck({
      signIns: new SignIns({ file: join(dir, "sessions.json"), minutes: environment.signInMinutes }),
      mailer: new MailCatcher({ folder: join(dir, "mail") }),
      accounts: new SpellAccounts(people, { takedowns: this.folders.takedowns }),
      abuseContact,
      caughtMail: "hidden",
      ...(this.address && { address: this.address })
    })
    this.route(this.server.router)
  }

  /**
   * Start listening, on this machine alone, and write its record.
   * - On `port` (default `CLOUD_PORT`;  `0`, any free one), never another:
   *   whatever gives it its address points at that port.
   * - Starts the nightly backups, unless `backups: "off"` (a test's).
   */
  async listen({ port = CLOUD_PORT, backups = "nightly" }: CloudListenOptions = {}): Promise<{ url: string }> {
    const { url } = await this.server.listen({ port, fallback: false })
    if (backups === "nightly") this.stopBackups = new SpaceBackups().nightly()
    const record: CloudRecord = {
      pid: process.pid,
      port: this.server.port,
      token: this.server.guard.token,
      ...(this.address && { address: this.address }),
      started: new Date().toISOString()
    }
    const file = join(this.dir, RECORD_FILE)
    writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600 })
    chmodSync(file, 0o600)
    return { url }
  }

  /** Stop:  its backups, its folders, its server;  its record goes.  NEVER throws. */
  async close(): Promise<void> {
    this.stopBackups?.()
    this.folders.close()
    projectBuild.stop()
    await this.server.close().catch((ignored) => console.error("SpellCloud.close():", ignored))
    const record = SpellCloud.record(this.dir)
    if (record?.pid === process.pid) rmSync(join(this.dir, RECORD_FILE), { force: true })
  }

  /** The record of the cloud running from `dir`:  `undefined` when none is, or it can't be read.  NEVER throws. */
  static record(dir = environment.cloudDir): CloudRecord | undefined {
    const file = join(dir, RECORD_FILE)
    if (!existsSync(file)) return undefined
    try {
      return JSON.parse(readFileSync(file, "utf8")) as CloudRecord
    } catch {
      return undefined
    }
  }

  ////////////////
  // ## Its routes
  ////////////////

  /** SIDE EFFECT:  every route it serves, on `router`:  see the class. */
  private route(router: SRV.Router): void {
    const { guard } = this.server
    if (this.address?.startsWith("https:")) router.use(secureCookies)
    router.use(this.signIn.check)
    this.signIn.route(router, guard)
    this.folders.route({ router, guard })
    router.get(TERMS_PATH, (_request, reply) => reply.sendFile(TERMS_FILE))
    router.get("/hello", (_request, reply) => reply.set("Cache-Control", "no-store").json({ message: "Spell's cloud" }))
    router.get(`${CLOUD_APPS_PREFIX}/:project*`, (request, reply) => {
      if (!SERVED_GROUPS.test(`/${request.params.project ?? ""}/`)) throw new SRV.HttpError(404, "no such program here")
      return reply.set("Cache-Control", "no-store").sendFile(APP_PAGE)
    })
    router.use("/spaces", onlyServedGroups, spaceFiles)
    router.use(new SRV.StaticHandler({ mounts: [{ prefix: "/element", dir: ELEMENT_DIR }] }).handle)
  }
}

/** Constructor props of a `SpellCloud`. */
export type SpellCloudProps = {
  /** Where people reach it, `https://spell.example.org`:  left out, this machine alone (a test, a try). */
  address?: string
  /** Where it keeps its own files:  default `environment.cloudDir`. */
  dir?: string
  /** People and orgs, the accounts among them:  default spell.spaces' (`peopleStore()`). */
  people?: PeopleStore
  /** Where an address's folder is on disk:  default spell.spaces' (`folderForPlace()`), a test's own. */
  folderFor?: (address: string) => string
  /** Where people report abuse:  default the server's (`environment.abuseContact`). */
  abuseContact?: string
}

/** What `SpellCloud.listen()` takes. */
export type CloudListenOptions = {
  /** Its port:  default `CLOUD_PORT`;  `0`, any free one.  Taken:  it throws. */
  port?: number
  /** Make a backup each night:  default `"nightly"`;  `"off"` for a test. */
  backups?: "nightly" | "off"
}

/** What a running cloud writes about itself, in `cloud.json`:  readable by this machine's person only. */
export type CloudRecord = {
  /** Its process. */
  pid: number
  /** The port it listens on, on this machine. */
  port: number
  /** Its write token:  this machine's own commands send it (`spell app cloud invite`). */
  token: string
  /** Where people reach it. */
  address?: string
  /** When it started, ISO. */
  started: string
}

/**
 * Who's asking, on the cloud:  whoever's signed in.
 * - throws `HttpError(401)` for nobody:  nobody outside is this machine's person.
 */
export function signedInPerson(request: SRV.Request): string {
  if (!request.person) throw new SRV.HttpError(401, "Sign in with your Spell account first.")
  return request.person
}

/** Middleware:  `/spaces/...` for the built-in groups alone;  404 for anything else, a person's own projects above all. */
function onlyServedGroups(request: SRV.Request, _reply: SRV.Reply, next: SRV.Next): void {
  if (!SERVED_GROUPS.test(request.path)) throw new SRV.HttpError(404, "no such file here")
  next()
}

/** Middleware:  every cookie this reply sets is `Secure`, as the cloud's address is `https`. */
function secureCookies(_request: SRV.Request, reply: SRV.Reply, next: SRV.Next): void {
  const set = reply.set.bind(reply) as (name: string, value: unknown) => SRV.Reply
  const secured = (name: string | Record<string, unknown>, value?: unknown): SRV.Reply => {
    if (typeof name !== "string") {
      for (const [each, eachValue] of Object.entries(name)) secured(each, eachValue)
      return reply
    }
    const isCookie = /^set-cookie$/i.test(name) && typeof value === "string" && !/;\s*Secure\b/i.test(value)
    return set(name, isCookie ? `${value as string}; Secure` : value)
  }
  reply.set = secured as SRV.Reply["set"]
  next()
}
