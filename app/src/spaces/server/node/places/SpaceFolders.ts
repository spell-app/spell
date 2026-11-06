import { readdir, stat } from "fs/promises"
import { join } from "path"

import {
  ANYONE,
  DATA_FOLDER,
  PERSONAL_FOLDERS,
  PlaceError,
  SPACE_FOLDER_CHECKS_AT_MOST_EVERY,
  SPACE_FOLDERS_PREFIX,
  SPACE_LIMITS,
  SPACE_READS_PREFIX,
  whoWritesFolderAt,
  type Place
} from "spell/places/places.types"
import { EVERY_FIELD, JsonChunks } from "spell/places/JsonChunks"
import { SRV } from "spell/server"
import { DirectReads, FolderPlace, PlaceServer, takenDownError, type PlaceCredentialMade } from "spell/server/places"
import { ReadCredentials } from "spell/server/signIn"
import { SP } from "spell/parser/spell"
import environment from "spell/app/spaces/server/node/environment"
import { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"
import { prefsPersonFor } from "spell/app/spaces/server/node/prefs/prefsRoutes"
import { folderForPlace } from "spell/app/spaces/server/node/projects/project-utils"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

import { SpaceExport } from "./SpaceExport"
import { SpaceMembers } from "./SpaceMembers"
import { Takedowns } from "./Takedowns"

/** Where a space is downloaded whole, as a zip of plain JSON files (`SpaceExport`):  its address after it. */
export const SPACE_EXPORTS_PREFIX = "/api/exports/spaces"

/**
 * How long a space counts as CONNECTED after a page last read it direct:  its files are watched till then.
 * - A page checks a project data folder at most every 5 seconds (`SPACE_FOLDER_CHECKS_AT_MOST_EVERY`), most far less
 *   often:  2 minutes covers a page left open, and lets go soon after the last one's closed.
 */
const CONNECTED_MS = 2 * 60_000

/****************
 * ### `SpaceFolders`
 * Every project data folder in spaces, served to programs (epic `atmosphere` P1):
 * `family cookbook is a data folder at "owen@spell/recipes"` keeps its rows in `@spell/owen@/recipes/`.
 *
 * ```ts
 * new SpaceFolders().route({ router, guard })     // the app's route module does
 * ```
 *
 * - ONE route, the kit's `PlaceServer` under `/api/places/spaces/`, the folder's address after it:
 *   `POST /api/places/spaces/owen@spell/recipes/list`.
 *   - No server code per folder:  any address works.
 * - Each folder is a `FolderPlace` on the app's own storage (`DiskStorage`), made the first time it's asked for.
 *   - Its folder on disk is its address's (`folderForPlace()`):
 *     a person's in spell.spaces, the built-in projects' in the app's `spaces/`.
 * - The three ways a program names one:
 *   the compiler turns each into this route's address (spell's `CreatePlace.folderAddressFor()`)
 *   - a full address, `owen@spell/recipes`:  that folder
 *   - `"recipes"` alone:  the program's own, shared by everyone who runs it, `<project>/__data/recipes`
 *   - `personal "recipes"`:  one per person, in each person's space, `owen@spell/__data/recipes`
 *     (it reaches here as `personal/recipes`, and who's asking says whose)
 * - WHO'S ASKING:  whoever's signed in on the device, with a Spell account (epic `atmosphere` P3).
 *   - Else this machine's person (`prefsPersonFor()`), so `owen@spell` is the same person on every machine;
 *     the page says so (`identifiesBy`), offering to sign in.
 * - WHO WRITES, by its address (`whoWritesFolderAt()`):
 *   - a space's own folder (`@family/cookbook`, `owen@spell/recipes`) is WRITTEN BY ITS MEMBERS (epic `atmosphere` P4)
 *     - Every thing is the space's, as its own id (`@family`):  any member whose role writes changes any of it.
 *     - Anyone else is refused, "your role can't write" (`"role"`).
 *     - Its members:  `SpaceMembers`.
 *   - a program's own data (`__data/`, `personal`):  each row's owner is whoever made it (`owner`),
 *     and only they change it, as on an atmosphere account
 *     - except a KEEPER of the folder (`SpaceMembers.keeps()`, epic `atmosphere` P1)
 *   - either way, who wrote each thing last is `by`
 * - READ DIRECT (epic `atmosphere` P5, Q6 C):  a space's own folder's files, read straight,
 *   apart from where they're written.
 *   - At `/api/reads/spaces/<address>/` (the kit's `DirectReads`), with a credential for the whole space.
 *   - A member (a guest too) gets one from the write side's `credential` (`credentialFor()`):
 *     a cookie only that address reads.  Anyone else is refused, `"role"`.
 *   - It's signed by this server's key (`ReadCredentials`).
 *   - Each read asks the member list again, so someone who leaves reads no more.
 *   - Reading works while nothing's written, since it opens no place and writes nothing.
 *   - Something private is a space of its own:
 *     `ana@spell/recipes` lists Ana alone, so @family's credential reads none of it.
 *   - A program's own data (`__data/`, `personal`) is read through the write side, as before.
 *   - Reads through the write side are checked against the member list too (`FolderPlace`, T15).
 * - WATCHED WHILE CONNECTED (Owen, 2026-11-04, epic `atmosphere` T17):  a file edited by hand shows at once, on both
 *   read paths.
 *   - A page reading a space direct connects it, for `CONNECTED_MS` after its last read (`connect()`):
 *     its place is watched, so a changed file brings the list file into step, and tells every page watching.
 *   - The first read of a collection on a connection brings its list into step before it's answered:
 *     so an edit made while nobody was connected shows too.
 *   - A live room, or a page asking the write side what changed, watches or brings it into step already.
 *   - The last read long enough ago, it stops watching.
 *   - The watching is the storage's own, `DiskStorage.watch()`:  no watcher of its own.
 * - Its member list is the place's own operations (`SPACE_MEMBER_OPERATIONS`), through the same route's `call`:
 *   who's in it, a member added or given a role, one removed or leaving.
 * - A folder with a `__members/` gets its person's membership written there, with the owner's role, if it's missing.
 * - TAKEDOWNS (epic `atmosphere` P6, Q7 A):  what Spell took down is refused on both sides, asked afresh for each
 *   request (`Takedowns`;  its log is each folder's `__takedowns.json5`).
 *   - a record:  left out of every read, through the write side and read direct;  a change to it refused, "taken down"
 *   - a space, the account whose space it is, or the asker's own account:
 *     every read, write and credential refused, 451, naming the abuse contact
 *   - put back (`restore`), it's read again at once:  a page following it hears it come back
 * - WHO BESIDES ITS MEMBERS (epic `atmosphere` P7, Q13):  two settings of a space, `publicRead` and `publicWrite`
 *   - Both off, until an admin turns them on (`SpaceMembers.settings()`, the `changeSettings` operation).
 *   - `publicRead`:  anyone reads it, through the write side or direct, and is given a credential, signed in or not
 *   - `publicWrite`:  anyone signed in adds things, and changes only the ones they wrote (their `by`):  a sign-up sheet
 * - LIMITS (epic `atmosphere` P7, `SPACE_LIMITS`):  a thing's file at most about 1 MB, a space's folder 100 MB
 *   - A save past either is refused, `"over the ceiling"`, and the page keeps it, saying why.
 * - LEAVING (epic `atmosphere` P7):  `GET /api/exports/spaces/<address>` downloads the space as a zip of plain JSON
 *   (`SpaceExport`), for anyone who may read it.
 *   - `spell app export` writes the same into a folder.
 * - DELETING:  an admin's `deleteSpace` operation removes the space's files for good (`SpaceMembers.deleteSpace()`)
 * - Node only;  NEVER imported by the editor's browser code.
 ****************/
export class SpaceFolders {
  /** Each folder's storage and members, by its address, made once. */
  private readonly folders = new Map<string, SpaceFolder>()
  /** Each folder's place, by its address, made once. */
  private readonly places = new Map<string, FolderPlace>()
  /** Its files read direct. */
  private readonly reads: DirectReads
  /** Where an address's folder is on disk. */
  private readonly folderFor: (address: string) => string
  /** People and orgs:  an org's roles, for a folder with no memberships of its own. */
  private readonly people: PeopleStore
  /** Who's asking, as an address:  `owen@spell`. */
  private readonly personFor: (request: SRV.Request) => string
  /** What Spell took down, in each folder. */
  readonly takedowns: Takedowns
  /** Each space connected now, by its address:  what stops its watch, when it lets go, and the collections in step. */
  private readonly connections = new Map<string, SpaceConnection>()

  constructor({
    folderFor = folderForPlace,
    people = new PeopleStore(new DiskStorage(environment.spellSpacesDir)),
    personFor = (request) => {
      const { id, org } = prefsPersonFor(request)
      return `${id}@${org}`
    },
    credentials = new ReadCredentials(),
    abuseContact
  }: SpaceFoldersProps = {}) {
    this.folderFor = folderFor
    this.people = people
    this.personFor = personFor
    this.takedowns = new Takedowns({
      storageFor: (address) => this.folderAt(address)?.storage,
      ...(abuseContact !== undefined && { contact: abuseContact })
    })
    this.reads = new DirectReads({
      prefix: SPACE_READS_PREFIX,
      credentials,
      filesOf: (space) => this.spaceFolderAt(space)?.storage,
      mayRead: async (space, person) => !!(await this.spaceFolderAt(space)?.members.mayRead(person)),
      takenDown: (space, person) => this.takedowns.takenDownIn(space, person),
      onRead: (space, collection) => this.connect(space, collection)
    })
  }

  /**
   * Add its two routes to `router`:
   * - the write side, behind `guard`:  this run's token or a sign-in, the server's own host and origin
   * - the read side, behind its host check, with a credential for each space
   */
  route({ router, guard }: { router: SRV.Router; guard: SRV.Guard }): this {
    new PlaceServer({
      prefix: SPACE_FOLDERS_PREFIX,
      open: (name, identity) => this.placeFor(name, identity),
      identityOf: this.personFor,
      credentialFor: ({ placeName, identity }) => this.credentialFor(placeName, identity)
    }).route(router, guard)
    this.reads.route(router, guard)
    router.get(`${SPACE_EXPORTS_PREFIX}/:place*`, guard.hostCheck, guard.writeCheck, async (request, reply) => {
      const out = await this.exportOf(request.params.place ?? "", this.personFor(request)).catch((error: unknown) => {
        if (!(error instanceof PlaceError)) throw error
        throw new SRV.HttpError(PlaceServer.statusOf(error), error.message)
      })
      reply
        .set("Content-Disposition", `attachment; filename="${out.fileName}"`)
        .set("Cache-Control", "no-store")
        .type("application/zip")
        .send(out.zip())
    })
    return this
  }

  /**
   * The space the route names `name`, exported whole as `identity` reads it (`SpaceExport`):  leaving Spell.
   * - `identity` left out:  this machine's own code, trusted (`spell app export`).
   * - throws `HttpError(404)` for no space's own folder;  `PlaceError` `"refused"` for someone who can't read it
   */
  async exportOf(name: string, identity: string | undefined): Promise<SpaceExport> {
    const address = this.addressFor(name, identity)
    const folder = address === undefined ? undefined : this.spaceFolderAt(address)
    const place = address === undefined ? undefined : await this.placeFor(address, identity)
    if (!folder || !address || !(place instanceof FolderPlace)) {
      throw new SRV.HttpError(404, `there's no space at ${name} to export`)
    }
    return SpaceExport.of({
      address,
      place,
      storage: folder.storage,
      members: folder.members,
      ...(identity !== undefined && { identity })
    })
  }

  /**
   * The place the route names `name`, for `identity`:  `owen@spell/recipes`, or `personal/recipes`.
   * - `undefined` for a name that's no folder's address:  the route answers 404.
   */
  async placeFor(name: string, identity: string | undefined): Promise<Place | undefined> {
    const address = this.addressFor(name, identity)
    if (!address) return undefined
    const known = this.places.get(address)
    if (known) return known
    const folder = this.folderAt(address)
    if (!folder) return undefined
    const { storage, members } = folder
    await members.writeOwnerMembership()
    const whoWrites = whoWritesFolderAt(address)
    const place = new FolderPlace({
      storage,
      format: new JsonChunks({ summaries: EVERY_FIELD }),
      whoWrites,
      ...(whoWrites === "its members"
        ? {
            space: { id: members.spaceId, memberOf: members.memberOf, settings: members.settings },
            operations: members.operations
          }
        : { mayChangeAnyRow: (who: string) => members.keeps(who) }),
      limits: SPACE_LIMITS,
      bytesInUse: () => bytesIn(folder.root),
      checkedAtMostEvery: SPACE_FOLDER_CHECKS_AT_MOST_EVERY,
      identifiesBy: "this machine",
      takenDown: (asker) => this.takedowns.takenDownIn(address, asker)
    })
    this.places.set(address, place)
    return place
  }

  /**
   * A credential for `identity` to read the space the route names `name` direct:  its cookie, and where it's read.
   * - `undefined` for a program's own data, which isn't read direct:  the route answers 404.
   * - Anyone's, signed in or not, for a space anyone reads (`publicRead`).
   * - throws `PlaceError` `"refused"`:
   *   `"taken down"`, for a space Spell took down;  `"role"`, for someone who isn't one of its members
   */
  async credentialFor(name: string, identity: string | undefined): Promise<PlaceCredentialMade | undefined> {
    const address = this.addressFor(name, identity)
    const folder = address === undefined ? undefined : this.spaceFolderAt(address)
    if (!folder || !address) return undefined
    const down = await this.takedowns.takenDownIn(address, identity)
    if (down.isWhole) throw takenDownError("this space", down)
    if (!(await folder.members.mayRead(identity))) {
      throw new PlaceError(`You can't read this:  you aren't a member of ${folder.members.spaceId}`, {
        cause: { kind: "refused", whyNot: "role" }
      })
    }
    return { cookie: this.reads.cookieFor(address, identity ?? ANYONE), readsAt: this.reads.readsAt(address) }
  }

  /** Stop every folder's watching:  for a test, or the page server stopping.  The next ask opens each again. */
  close(): void {
    for (const address of [...this.connections.keys()]) this.disconnect(address)
    for (const { storage } of this.folders.values()) storage.close()
    this.folders.clear()
    this.places.clear()
  }

  ////////////////
  // ## Connected
  ////////////////

  /** Is the space at `address` connected now:  its files watched?  For a test. */
  isConnected(address: string): boolean {
    return this.connections.has(address)
  }

  /**
   * A page read `collection` of the space at `address` direct:  watch its files for `CONNECTED_MS` more.
   * - Its first read of `collection` waits while that list is brought into step with the folder.
   * - NEVER throws:  a failure is logged, and the read goes ahead.
   */
  private async connect(address: string, collection: string): Promise<void> {
    try {
      let connection = this.connections.get(address)
      if (connection) connection.lettingGo.refresh()
      else {
        const lettingGo = setTimeout(() => this.disconnect(address), CONNECTED_MS)
        lettingGo.unref()
        connection = { lettingGo, inStep: new Map(), place: this.placeFor(address, undefined) }
        this.connections.set(address, connection)
        const place = await connection.place
        // the place's watch hears the disk for every collection;  nobody's told anything here
        if (place instanceof FolderPlace && this.connections.get(address) === connection) {
          connection.stop = place.watch({ collection }, () => {})
        }
      }
      let inStep = connection.inStep.get(collection)
      if (!inStep) {
        const brought = connection.place.then((place) =>
          place instanceof FolderPlace ? place.keepInStep(collection) : undefined
        )
        // a failure isn't kept:  the next read tries again
        inStep = brought.catch((error: unknown) => {
          connection!.inStep.delete(collection)
          throw error
        })
        connection.inStep.set(collection, inStep)
      }
      await inStep
    } catch (ignored) {
      console.error(`SpaceFolders:  can't watch ${address} for a page reading it direct:`, ignored)
    }
  }

  /** Stop watching the space at `address`:  no page has read it for `CONNECTED_MS`. */
  private disconnect(address: string): void {
    const connection = this.connections.get(address)
    if (!connection) return
    clearTimeout(connection.lettingGo)
    connection.stop?.()
    this.connections.delete(address)
  }

  ////////////////
  // ## Folders
  ////////////////

  /** The folder at `address`, its storage and members, made once:  `undefined` for one with no folder on disk. */
  private folderAt(address: string): SpaceFolder | undefined {
    const known = this.folders.get(address)
    if (known) return known
    const root = this.diskFolderFor(address)
    if (!root) return undefined
    const storage = new DiskStorage(root)
    const onDeleted = () => this.forget(address)
    const folder = { root, storage, members: new SpaceMembers({ address, storage, people: this.people, onDeleted }) }
    this.folders.set(address, folder)
    return folder
  }

  /** Forget the folder at `address`, and its place:  it was deleted.  The next ask opens it afresh. */
  private forget(address: string): void {
    this.folders.get(address)?.storage.close()
    this.folders.delete(address)
    this.places.delete(address)
  }

  /** The folder at `address`, if it's a space's own, read direct:  never a program's own data, or no address at all. */
  private spaceFolderAt(address: string): SpaceFolder | undefined {
    if (!SP.SpellLocation.isAddress(address) || whoWritesFolderAt(address) !== "its members") return undefined
    return this.folderAt(address)
  }

  ////////////////
  // ## Addresses
  ////////////////

  /** The full address `name` stands for, asked by `identity`:  `personal/recipes` is theirs, `__data/recipes` in it. */
  private addressFor(name: string, identity: string | undefined): string | undefined {
    const personal = `${PERSONAL_FOLDERS}/`
    if (!name.startsWith(personal)) return SP.SpellLocation.isAddress(name) ? name : undefined
    if (!identity) return undefined
    return `${identity}/${DATA_FOLDER}/${name.slice(personal.length)}`
  }

  /** The folder on disk an address names;  `undefined` for one with none (`@local/...`) or that climbs out. */
  private diskFolderFor(address: string): string | undefined {
    if (address.split("/").some((part) => !part || part === "." || part === "..")) return undefined
    try {
      return this.folderFor(address)
    } catch {
      return undefined
    }
  }
}

/** Constructor props of `SpaceFolders`:  each one's default is the app's own, so a test hands in its own. */
export type SpaceFoldersProps = {
  /** Where an address's folder is on disk;  default `folderForPlace()`. */
  folderFor?: (address: string) => string
  /** People and orgs, for an org's roles;  default spell.spaces' own. */
  people?: PeopleStore
  /** Who's asking, as an address:  default whoever's signed in, else this machine's person, `owen@spell`. */
  personFor?: (request: SRV.Request) => string
  /** Signs and checks the credentials a space is read direct with:  default a key for this run alone. */
  credentials?: ReadCredentials
  /** Where people ask about a takedown:  default the server's (`environment.abuseContact`). */
  abuseContact?: string
}

/** A space a page is reading direct:  its files watched (`SpaceFolders.connect()`). */
type SpaceConnection = {
  /** Its place, opened for the watch. */
  place: Promise<Place | undefined>
  /** Stops the place's watch;  none until it's opened. */
  stop?: () => void
  /** When it lets go:  pushed back by each read. */
  lettingGo: NodeJS.Timeout
  /** Each collection brought into step on this connection, by name. */
  inStep: Map<string, Promise<void>>
}

/** One project data folder:  its files, and who's in its space. */
type SpaceFolder = {
  /** Its folder on disk. */
  root: string
  /** Its files. */
  storage: DiskStorage
  /** Its space's members. */
  members: SpaceMembers
}

/** How many bytes every file under `folder` holds:  `0` for a folder that isn't there.  - NEVER throws */
async function bytesIn(folder: string): Promise<number> {
  let total = 0
  const entries = await readdir(folder, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    const path = join(folder, entry.name)
    if (entry.isDirectory()) total += await bytesIn(path)
    else total += (await stat(path).catch(() => undefined))?.size ?? 0
  }
  return total
}
