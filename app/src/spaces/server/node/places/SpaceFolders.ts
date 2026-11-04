import {
  DATA_FOLDER,
  PERSONAL_FOLDERS,
  PlaceError,
  SPACE_FOLDER_CHECKS_AT_MOST_EVERY,
  SPACE_FOLDERS_PREFIX,
  SPACE_READS_PREFIX,
  whoWritesFolderAt,
  type Place
} from "spell/util/places/places.types"
import { EVERY_FIELD, JsonChunks } from "spell/util/places/JsonChunks"
import type { SRV } from "spell/server"
import { DirectReads, FolderPlace, PlaceServer, takenDownError, type PlaceCredentialMade } from "spell/server/places"
import { ReadCredentials } from "spell/server/signIn"
import { SP } from "spell/parser/spell"
import environment from "spell/app/spaces/server/node/environment"
import { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"
import { prefsPersonFor } from "spell/app/spaces/server/node/prefs/prefsRoutes"
import { folderForPlace } from "spell/app/spaces/server/node/projects/project-utils"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

import { SpaceMembers } from "./SpaceMembers"
import { Takedowns } from "./Takedowns"

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
 *   `POST /api/places/spaces/owen@spell/recipes/list`.  No server code per folder:  any address works.
 * - Each folder is a `FolderPlace` on the app's own storage (`DiskStorage`), made the first time it's asked for.
 *   - Its folder on disk is its address's (`folderForPlace()`):  a person's in spell.spaces, the built-in projects' in
 *     the app's `spaces/`.
 * - The three ways a program names one:
 *   the compiler turns each into this route's address (spell's `CreatePlace.folderAddressFor()`)
 *   - a full address, `owen@spell/recipes`:  that folder
 *   - `"recipes"` alone:  the program's own, shared by everyone who runs it, `<project>/__data/recipes`
 *   - `personal "recipes"`:  one per person, in each person's space, `owen@spell/__data/recipes`
 *     (it reaches here as `personal/recipes`, and who's asking says whose)
 * - WHO'S ASKING:  whoever's signed in on the device, with a Spell account (epic `atmosphere` P3);
 *   else this machine's person (`prefsPersonFor()`), so `owen@spell` is the same person on every machine,
 *   and the page says so (`identifiesBy`), offering to sign in.
 * - WHO WRITES, by its address (`whoWritesFolderAt()`):
 *   - a space's own folder (`@family/cookbook`, `owen@spell/recipes`) is WRITTEN BY ITS MEMBERS (epic `atmosphere` P4):
 *     every thing is the space's, as its own id (`@family`), and any member whose role writes changes any of it;
 *     anyone else is refused, "your role can't write" (`"role"`).  Its members:  `SpaceMembers`
 *   - a program's own data (`__data/`, `personal`):  each row's owner is whoever made it (`owner`), and only they change
 *     it, as on an atmosphere account;  except a KEEPER of the folder (`SpaceMembers.keeps()`, epic `atmosphere` P1)
 *   - either way, who wrote each thing last is `by`
 * - READ DIRECT (epic `atmosphere` P5, Q6 C):  a space's own folder's files are read straight, apart from where they're
 *   written, at `/api/reads/spaces/<address>/` (the kit's `DirectReads`), with a credential for the whole space.
 *   - A member (a guest too) gets one from the write side's `credential` (`credentialFor()`), as a cookie only that
 *     address reads;  anyone else is refused, `"role"`.  It's signed by this server's key (`ReadCredentials`).
 *   - Each read asks the member list again, so someone who leaves reads no more;  and reading works while nothing's
 *     written, since it opens no place and writes nothing.
 *   - Something private is a space of its own:  `ana@spell/recipes` lists Ana alone, so @family's credential reads
 *     none of it.
 *   - A program's own data (`__data/`, `personal`) is read through the write side, as before.
 *   - Reads through the write side are checked against the member list too (`FolderPlace`, T15).
 * - Its member list is the place's own operations (`SPACE_MEMBER_OPERATIONS`), through the same route's `call`:
 *   who's in it, a member added or given a role, one removed or leaving.
 * - A folder with a `__members/` gets its person's membership written there, with the owner's role, if it's missing.
 * - TAKEDOWNS (epic `atmosphere` P6, Q7 A):  what Spell took down (`Takedowns`, its log in each folder's
 *   `__takedowns.json5`) is refused on both sides, asked afresh for each request:
 *   - a record:  left out of every read, through the write side and read direct;  a change to it refused, "taken down"
 *   - a space, the account whose space it is, or the asker's own account:  every read, write and credential refused,
 *     451, naming the abuse contact
 *   - put back (`restore`), it's read again at once:  a page following it hears it come back
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
      mayRead: async (space, person) => !!(await this.spaceFolderAt(space)?.members.memberOf(person))?.canRead,
      takenDown: (space, person) => this.takedowns.takenDownIn(space, person)
    })
  }

  /**
   * Add its two routes to `router`:  the write side, behind `guard` (this run's token or a sign-in, the server's own
   * host and origin);  and the read side, behind its host check, with a credential for each space.
   */
  route({ router, guard }: { router: SRV.Router; guard: SRV.Guard }): this {
    new PlaceServer({
      prefix: SPACE_FOLDERS_PREFIX,
      open: (name, identity) => this.placeFor(name, identity),
      identityOf: this.personFor,
      credentialFor: ({ placeName, identity }) => this.credentialFor(placeName, identity)
    }).route(router, guard)
    this.reads.route(router, guard)
    return this
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
        ? { space: { id: members.spaceId, memberOf: members.memberOf }, operations: members.operations }
        : { mayChangeAnyRow: (who: string) => members.keeps(who) }),
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
   * - throws `PlaceError` `"refused"`:  `"taken down"`, for a space Spell took down;  `"role"`, for someone who isn't
   *   one of its members
   */
  async credentialFor(name: string, identity: string | undefined): Promise<PlaceCredentialMade | undefined> {
    const address = this.addressFor(name, identity)
    const folder = address === undefined ? undefined : this.spaceFolderAt(address)
    if (!folder || !address) return undefined
    const down = await this.takedowns.takenDownIn(address, identity)
    if (down.isWhole) throw takenDownError("this space", down)
    const member = identity === undefined ? undefined : await folder.members.memberOf(identity)
    if (!member?.canRead) {
      throw new PlaceError(`You can't read this:  you aren't a member of ${folder.members.spaceId}`, {
        cause: { kind: "refused", whyNot: "role" }
      })
    }
    return { cookie: this.reads.cookieFor(address, identity!), readsAt: this.reads.readsAt(address) }
  }

  /** Stop every folder's watching:  for a test, or the page server stopping.  The next ask opens each again. */
  close(): void {
    for (const { storage } of this.folders.values()) storage.close()
    this.folders.clear()
    this.places.clear()
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
    const folder = { storage, members: new SpaceMembers({ address, storage, people: this.people }) }
    this.folders.set(address, folder)
    return folder
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

/** One project data folder:  its files, and who's in its space. */
type SpaceFolder = {
  /** Its files. */
  storage: DiskStorage
  /** Its space's members. */
  members: SpaceMembers
}
