import type { ChunkStore } from "spell/util/places/ChunkedPlace"
import { JsonChunks } from "spell/util/places/JsonChunks"
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
 *   - No credential, or none good:  401, and a page asks Spell's server for one.  A reader no longer:  403.
 * - TAKEN DOWN (epic `atmosphere` P6), as the host says (`takenDown`), asked afresh for each read:
 *   - the whole space, or the reader's own account:  451 (`TAKEN_DOWN_STATUS`), naming the host's abuse contact
 *   - a thing:  left out of its list file as it's served, and its own file answered 451
 *   - the files stay as they are on the disk:  nothing here writes
 * - Reads NOTHING through a place:  a space's files, as they are, so it works while nothing's written.
 * - Behind `Guard`'s host check only:  the credential is what lets a read in, no run token.
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

  constructor({
    prefix,
    credentials,
    filesOf,
    mayRead,
    takenDown = async () => NOTHING_TAKEN_DOWN,
    format = new JsonChunks()
  }: DirectReadsProps) {
    this.prefix = prefix
    this.credentials = credentials
    this.filesOf = filesOf
    this.mayRead = mayRead
    this.takenDown = takenDown
    this.json = format
  }

  /** Add its one route to `router`, behind `guard`'s host check. */
  route(router: SRV.Router, guard: SRV.Guard): this {
    router.get(`${this.prefix}/:path*`, guard.hostCheck, async (request, reply) => {
      const text = await this.read(request.params.path ?? "", cookiesOf(request, READ_CREDENTIAL_COOKIE))
      reply.set("Cache-Control", "no-store").type("application/json").send(text)
    })
    return this
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
    const credential = this.credentialFor(path, credentials)
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
  /** May `person` read `space` now:  its member list, read afresh. */
  mayRead: (space: string, person: string) => Promise<boolean>
  /**
   * What's taken down in `space` now, for `person` (epic `atmosphere` P6):  the host's takedowns, read afresh.
   * - Their own account taken down is the whole space, for them.  Left out:  nothing ever is.
   */
  takenDown?: (space: string, person: string) => Promise<TakenDown>
  /** The files' format, for where a list's rows are;  default plain `JsonChunks`. */
  format?: JsonChunks
}
