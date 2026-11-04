import {
  DATA_FOLDER,
  PERSONAL_FOLDERS,
  SPACE_FOLDER_CHECKS_AT_MOST_EVERY,
  SPACE_FOLDERS_PREFIX,
  whoWritesFolderAt,
  type Place
} from "spell/util/places/places.types"
import { JsonChunks } from "spell/util/places/JsonChunks"
import type { SRV } from "spell/server"
import { FolderPlace, PlaceServer } from "spell/server/places"
import { SP } from "spell/parser/spell"
import environment from "spell/app/spaces/server/node/environment"
import { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"
import { prefsPersonFor } from "spell/app/spaces/server/node/prefs/prefsRoutes"
import { folderForPlace } from "spell/app/spaces/server/node/projects/project-utils"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

import { SpaceMembers } from "./SpaceMembers"

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
 * - Its member list is the place's own operations (`SPACE_MEMBER_OPERATIONS`), through the same route's `call`:
 *   who's in it, a member added or given a role, one removed or leaving.
 * - A folder with a `__members/` gets its person's membership written there, with the owner's role, if it's missing.
 * - Node only;  NEVER imported by the editor's browser code.
 ****************/
export class SpaceFolders {
  /** Each folder's place and its storage, by its address, made once. */
  private readonly folders = new Map<string, { place: FolderPlace; storage: DiskStorage }>()
  /** Where an address's folder is on disk. */
  private readonly folderFor: (address: string) => string
  /** People and orgs:  an org's roles, for a folder with no memberships of its own. */
  private readonly people: PeopleStore
  /** Who's asking, as an address:  `owen@spell`. */
  private readonly personFor: (request: SRV.Request) => string

  constructor({
    folderFor = folderForPlace,
    people = new PeopleStore(new DiskStorage(environment.spellSpacesDir)),
    personFor = (request) => {
      const { id, org } = prefsPersonFor(request)
      return `${id}@${org}`
    }
  }: SpaceFoldersProps = {}) {
    this.folderFor = folderFor
    this.people = people
    this.personFor = personFor
  }

  /** Add the route to `router`, behind `guard`:  this run's token, the server's own host and origin. */
  route({ router, guard }: { router: SRV.Router; guard: SRV.Guard }): this {
    new PlaceServer({
      prefix: SPACE_FOLDERS_PREFIX,
      open: (name, identity) => this.placeFor(name, identity),
      identityOf: this.personFor
    }).route(router, guard)
    return this
  }

  /**
   * The place the route names `name`, for `identity`:  `owen@spell/recipes`, or `personal/recipes`.
   * - `undefined` for a name that's no folder's address:  the route answers 404.
   */
  async placeFor(name: string, identity: string | undefined): Promise<Place | undefined> {
    const address = this.addressFor(name, identity)
    if (!address) return undefined
    const known = this.folders.get(address)
    if (known) return known.place
    const root = this.diskFolderFor(address)
    if (!root) return undefined
    const storage = new DiskStorage(root)
    const members = new SpaceMembers({ address, storage, people: this.people })
    await members.writeOwnerMembership()
    const whoWrites = whoWritesFolderAt(address)
    const place = new FolderPlace({
      storage,
      format: new JsonChunks({ summaries: "every field" }),
      whoWrites,
      ...(whoWrites === "its members"
        ? { space: { id: members.spaceId, memberOf: members.memberOf }, operations: members.operations }
        : { mayChangeAnyRow: (who: string) => members.keeps(who) }),
      checkedAtMostEvery: SPACE_FOLDER_CHECKS_AT_MOST_EVERY,
      identifiesBy: "this machine"
    })
    this.folders.set(address, { place, storage })
    return place
  }

  /** Stop every folder's watching:  for a test, or the page server stopping.  The next ask opens each again. */
  close(): void {
    for (const { storage } of this.folders.values()) storage.close()
    this.folders.clear()
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
}
