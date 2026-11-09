import type { ChunkStore } from "spell/places/ChunkedPlace"
import { JsonChunks } from "spell/places/JsonChunks"
import { SRV } from "spell/server"
import {
  READ_CREDENTIAL_COOKIE,
  READ_CREDENTIAL_DAYS,
  cookiesOf,
  type ReadCredential,
  type ReadCredentials
} from "spell/server/signIn"

import { NOTHING_TAKEN_DOWN, TAKEN_DOWN_STATUS, isThingTakenDown, takenDownMessage, type TakenDown } from "./takenDown"

/** What a thing's file and a list's file end in:  `JsonChunks`' names, the only files it serves. */
const LIST_FILE = /^[^/]+\.list\.json$/
/** What a list file's name ends in, after its collection. */
const LIST_ENDING = ".list.json"
const BODY_FILE = /^([^/]+)\/([^/]+\.json)$/

/** What a read through to a space's real host has in its address, after the space's:  `<space>/__host/xrpc/<method>`. */
export const HOST_PASS_THROUGH = "/__host"

/** The only calls passed through to a real host:  reading a Space, never writing it, nor anything else of the host. */
const PASSED_THROUGH =
  /^\/xrpc\/com\.atproto\.space\.(getSpaceCredential|listRepos|listRecords|getRecord|getBlob|listBlobs)$/

/** The headers a read through carries to the host, and back:  the credential, its signature, the MAC's ask and answer. */
const PASSED_HEADERS = /^(authorization|content-type|signature|signature-input|atproto-[\w-]+)$/i

/****************
 * ### `DirectReads`
 * A space's files, read straight, apart from the server that writes them:  each a plain `GET`, with a credential for
 * the whole space (epic `atmosphere` P5, Q6 C).
 *
 * ```ts
 * const reads = new DirectReads({ prefix: SPACE_READS_PREFIX, credentials, filesOf, mayRead }).route(router, guard)
 * reads.cookieFor("@family/cookbook", "bo@spell")      // what `PlaceServer`'s `credentialFor` sets
 * ```
 *
 * - `GET <prefix>/<space>/recipes.list.json`, `GET <prefix>/<space>/recipes/r-1.json`:  the folder's list and things,
 *   as `JsonChunks` lays them out, so a page reads them with `WebChunks`, as from any static host.
 *   - Nothing else of the folder:  never its `__` names (its own members), a dot file, or a folder inside it.
 * - The CREDENTIAL rides in a cookie (`READ_CREDENTIAL_COOKIE`), one per space, each with that space's read address as
 *   its path:  so only reads of that space carry it, and no page's script ever holds it (`HttpOnly`).
 * - Each read checks the credential's signature (`ReadCredentials`), that it's for this space, and that its person is
 *   still a reader (`mayRead`, the member list):  so someone who leaves is refused at once.
 *   - A space ANYONE reads (`publicRead`, epic `atmosphere` P7, Q13) needs no credential at all.
 *   - No credential, or none good:  401, and a page asks Spell's server for one.  A reader no longer:  403.
 * - TAKEN DOWN (epic `atmosphere` P6), as the host says (`takenDown`), asked afresh for each read:
 *   - the whole space, or the reader's own account:  451 (`TAKEN_DOWN_STATUS`), naming the host's abuse contact
 *   - a thing:  left out of its list file as it's served, and its own file answered 451
 *   - the files stay as they are on the disk:  nothing here writes
 * - Reads NOTHING through a place:  a space's files, as they are, so it works while nothing's written.
 *   - The host may bring them into step first (`onRead`):  the app's watches a space's files while pages read it.
 * - Behind `Guard`'s host check only:  the credential is what lets a read in, no run token.
 * - THROUGH TO A REAL HOST (epic `atmosphere` P14):  a space kept in a real AT Protocol Space is read there, by each
 *   person's OWN Space credential, at `<prefix>/<space>/__host/xrpc/<method>` (`HOST_PASS_THROUGH`, `hostOf`).
 *   - a pass-through that keeps nothing:  the request goes on as it came, its credential and signature with it, and the
 *     host's answer comes back as it is, so the HOST decides who reads:  Spell gates nothing here
 *   - only the Space's reading calls (`PASSED_THROUGH`), only to the host that space names:  never an open proxy
 *   - why:  a page can't ask another site's host itself, and a person's credential is theirs, never Spell's
 * - Node only.  Knows no people and no folders:  `filesOf` and `mayRead` are handed in (the app's `SpaceFolders`).
 ****************/
export class DirectReads {
  /** Where it listens:  every space's address after it. */
  readonly prefix: string
  /** Signs and checks credentials. */
  private readonly credentials: ReadCredentials
  /** A space's files, by its address;  `undefined` for no such space. */
  private readonly filesOf: DirectReadsProps["filesOf"]
  /** May this person read this space now? */
  private readonly mayRead: DirectReadsProps["mayRead"]
  /** What's taken down in this space, for this person, now. */
  private readonly takenDown: NonNullable<DirectReadsProps["takenDown"]>
  /** The files' format:  where a list's rows are, and which thing a file is. */
  private readonly json: JsonChunks
  /** Told of each read, before it's answered:  the host's chance to bring the files into step first. */
  private readonly onRead: DirectReadsProps["onRead"]
  /** The real host a space is kept in, if it is. */
  private readonly hostOf: DirectReadsProps["hostOf"]

  constructor({
    prefix,
    credentials,
    filesOf,
    mayRead,
    takenDown = async () => NOTHING_TAKEN_DOWN,
    format = new JsonChunks(),
    onRead,
    hostOf
  }: DirectReadsProps) {
    this.prefix = prefix
    this.credentials = credentials
    this.filesOf = filesOf
    this.mayRead = mayRead
    this.takenDown = takenDown
    this.json = format
    this.onRead = onRead
    this.hostOf = hostOf
  }

  /** Add its routes to `router`, behind `guard`'s host check:  its reads, and with `hostOf`, the reads through. */
  route(router: SRV.Router, guard: SRV.Guard): this {
    if (this.hostOf) {
      router.get(`${this.prefix}/:path*`, guard.hostCheck, this.passThrough)
      router.post(`${this.prefix}/:path*`, guard.hostCheck, this.passThrough)
    }
    router.get(`${this.prefix}/:path*`, guard.hostCheck, async (request, reply) => {
      const text = await this.read(request.params.path ?? "", cookiesOf(request, READ_CREDENTIAL_COOKIE))
      reply.set("Cache-Control", "no-store").type("application/json").send(text)
    })
    return this
  }

  /**
   * A read through to the real host the space is kept in:  see the class.  Anything else goes on (`next()`).
   * - throws `HttpError`:  404 for a space kept in no real host, or a call it doesn't pass;  502 when the host doesn't answer
   */
  private passThrough = async (request: SRV.Request, reply: SRV.Reply, next: SRV.Next): Promise<void> => {
    const path = `/${request.params.path ?? ""}`
    const at = path.indexOf(`${HOST_PASS_THROUGH}/`)
    if (at < 0) return next()
    const [space, call] = [path.slice(1, at), path.slice(at + HOST_PASS_THROUGH.length)]
    const host = await this.hostOf!(space)
    if (!host || !PASSED_THROUGH.test(call)) throw new SRV.HttpError(404, `${space} isn't read through to a host there`)
    const query = request.originalUrl.includes("?") ? request.originalUrl.slice(request.originalUrl.indexOf("?")) : ""
    const headers = Object.fromEntries(
      Object.entries(request.headers).flatMap(([name, value]) =>
        PASSED_HEADERS.test(name) && typeof value === "string" ? [[name, value]] : []
      )
    )
    const body = request.method === "POST" ? await bodyOf(request) : undefined
    const answer = await fetch(`${host}${call}${query}`, {
      method: request.method,
      headers,
      ...(body && { body: body as BodyInit })
    }).catch((error: unknown) => {
      throw new SRV.HttpError(502, `${space}'s host didn't answer:  ${(error as Error).message}`)
    })
    reply.status(answer.status).set("Cache-Control", "no-store")
    answer.headers.forEach((value, name) => {
      if (PASSED_HEADERS.test(name)) reply.set(name, value)
    })
    reply.send(Buffer.from(await answer.arrayBuffer()))
  }

  /**
   * The `Set-Cookie` value carrying a new credential for `person` to read `space`:  only that space's reads get it.
   * - `space`:  its address, `@family/cookbook`.
   */
  cookieFor(space: string, person: string): string {
    const credential = this.credentials.issue({ space, person })
    const path = encodeURI(this.readsAt(space))
    return `${READ_CREDENTIAL_COOKIE}=${credential}; Path=${path}/; HttpOnly; SameSite=Strict; Max-Age=${READ_CREDENTIAL_DAYS * 24 * 60 * 60}`
  }

  /** Where `space` is read:  `/api/reads/spaces/@family/cookbook`. */
  readsAt(space: string): string {
    return `${this.prefix}/${space}`
  }

  /**
   * The text of the file at `path` (`@family/cookbook/recipes.list.json`), for whoever holds one of `credentials`.
   * - throws `HttpError`:  401 with no good credential for that space, 451 for the space (or the reader's account)
   *   or the thing taken down, 403 for someone who's no reader now, 404 for a file that isn't there or isn't one it serves
   */
  private async read(path: string, credentials: readonly string[]): Promise<string> {
    const credential = this.credentialFor(path, credentials) ?? (await this.anyonesFor(path))
    if (!credential) {
      throw new SRV.HttpError(401, "no credential to read this space:  ask Spell's server for one, signed in")
    }
    const { space, person } = credential
    const down = await this.takenDown(space, person)
    if (down.isWhole) throw new SRV.HttpError(TAKEN_DOWN_STATUS, takenDownMessage("this space", down.contact))
    if (!(await this.mayRead(space, person))) {
      throw new SRV.HttpError(403, `${person} can't read ${space}:  they aren't one of its members`)
    }
    const files = await this.filesOf(space)
    const address = path
      .slice(space.length + 1)
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/")
    if (!files || !(await this.isServed(files, address))) {
      throw new SRV.HttpError(404, `${space} has no file ${address} to read`)
    }
    await this.onRead?.(space, this.collectionOf(address))
    const text = await files.read(address)
    if (text === undefined) throw new SRV.HttpError(404, `${space} has no file ${address} to read`)
    return this.withoutTakenDown(down, address, text)
  }

  /**
   * `text`, the file at `address`, as it's served with `down` taken down:  a list without those things.
   * - throws `HttpError(451)` for a thing's own file that's taken down
   */
  private withoutTakenDown(down: TakenDown, address: string, text: string): string {
    if (!down.things.size) return text
    const body = BODY_FILE.exec(address)
    if (body) {
      const collection = this.json.collectionOfFolder(body[1]!)
      const id = this.json.idOfFile(body[2]!)
      if (id !== undefined && isThingTakenDown(down, collection, id)) {
        throw new SRV.HttpError(TAKEN_DOWN_STATUS, takenDownMessage(`"${collection}" ${id}`, down.contact))
      }
      return text
    }
    const collection = this.json.collectionOfFolder(address.slice(0, -LIST_ENDING.length))
    const gone = down.things.get(collection)
    if (!gone?.size) return text
    const list = this.json.listIn(text)
    const rows = list.rows.filter((row) => !gone.has(`${row[this.json.idOf]}`))
    const keep = <T>(byId: Record<string, T> | undefined) =>
      byId && Object.fromEntries(Object.entries(byId).filter(([id]) => !gone.has(id)))
    const versions = keep(list.versions)
    const stamps = keep(list.stamps)
    return this.json.listText({ rows, ...(versions && { versions }), ...(stamps && { stamps }) })
  }

  /** The credential among these that's good, for the space `path` is in:  the most particular one, if more fit. */
  private credentialFor(path: string, credentials: readonly string[]): ReadCredential | undefined {
    let found: ReadCredential | undefined
    for (const each of credentials) {
      const said = this.credentials.check(each)
      if (!said || !path.startsWith(`${said.space}/`)) continue
      if (!found || said.space.length > found.space.length) found = said
    }
    return found
  }

  /**
   * With no credential, the space `path` is in, if anyone may read it (`publicRead`, epic `atmosphere` P7, Q13):
   * read as nobody in particular.
   * - `path` ends in a list's file (one part) or a thing's (two):  so the space is what's before either.
   */
  private async anyonesFor(path: string): Promise<{ space: string; person?: string } | undefined> {
    const parts = path.split("/")
    for (const fileParts of [1, 2]) {
      const space = parts.slice(0, -fileParts).join("/")
      if (space && (await this.mayRead(space, undefined))) return { space }
    }
    return undefined
  }

  /** The collection the served file at `address` is of:  a list's, or a thing's. */
  private collectionOf(address: string): string {
    const folder = BODY_FILE.exec(address)?.[1] ?? address.slice(0, -LIST_ENDING.length)
    return this.json.collectionOfFolder(folder)
  }

  /** Is `address` a list, or a thing of a collection that has one:  never a `__` name, a dot file or a folder of its own. */
  private async isServed(files: Pick<ChunkStore, "read">, address: string): Promise<boolean> {
    if (address.split("/").some((part) => !part || part.startsWith(".") || part.startsWith("__"))) return false
    if (LIST_FILE.test(address)) return true
    const collection = BODY_FILE.exec(address)?.[1]
    return collection !== undefined && (await files.read(`${collection}.list.json`)) !== undefined
  }
}

/** Constructor props of `DirectReads`. */
export type DirectReadsProps = {
  /** Where it listens:  `SPACE_READS_PREFIX`. */
  prefix: string
  /** Signs and checks credentials:  the same key as hands them out. */
  credentials: ReadCredentials
  /** A space's files, by its address (`@family/cookbook`);  `undefined` for no such space. */
  filesOf: (space: string) => Pick<ChunkStore, "read"> | undefined | Promise<Pick<ChunkStore, "read"> | undefined>
  /**
   * May `person` read `space` now:  its member list, and its settings, read afresh.
   * - `person` left out:  nobody's signed in, or no credential came;  a space anyone reads says yes (`publicRead`).
   */
  mayRead: (space: string, person: string | undefined) => Promise<boolean>
  /**
   * What's taken down in `space` now, for `person` (epic `atmosphere` P6):  the host's takedowns, read afresh.
   * - Their own account taken down is the whole space, for them.  Left out:  nothing ever is.
   */
  takenDown?: (space: string, person: string | undefined) => Promise<TakenDown>
  /** The files' format, for where a list's rows are;  default plain `JsonChunks`. */
  format?: JsonChunks
  /**
   * Told of each read that's let in, of a file of `collection` in `space`, and waited on before the file is read.
   * - The app's `SpaceFolders` watches the space's files while it's read (Owen, 2026-11-04, epic `atmosphere` T17):
   *   so a file edited by hand shows in the next read.
   * - MUST NOT throw:  a read works whatever it does.
   */
  onRead?: (space: string, collection: string) => Promise<void>
  /**
   * The real AT Protocol host a space is kept in, `https://...`, if it is (epic `atmosphere` P14):  its reads through
   * go there, by each reader's own credential.  Left out, or `undefined`:  none is read through.
   */
  hostOf?: (space: string) => Promise<string | undefined>
}

/** Everything a request sent, as bytes. */
async function bodyOf(request: SRV.Request): Promise<Uint8Array> {
  const chunks: Buffer[] = []
  for await (const chunk of request.raw) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks)
}
