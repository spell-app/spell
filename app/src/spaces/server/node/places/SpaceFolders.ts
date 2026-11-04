import { join } from "path"

import {
  DATA_FOLDER,
  PERSONAL_FOLDERS,
  SPACE_FOLDER_CHECKS_AT_MOST_EVERY,
  SPACE_FOLDERS_PREFIX,
  type Place
} from "spell/util/places/places.types"
import { JsonChunks } from "spell/util/places/JsonChunks"
import { parseRef } from "spell/util/places/refs"
import type { SRV } from "spell/server"
import { FolderPlace, PlaceServer } from "spell/server/places"
import { SP } from "spell/parser/spell"
import type { OrgRole } from "spell/app/spaces/models/people"
import environment from "spell/app/spaces/server/node/environment"
import { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"
import { prefsPersonFor } from "spell/app/spaces/server/node/prefs/prefsRoutes"
import { folderForPlace } from "spell/app/spaces/server/node/projects/project-utils"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"
import { readJSON5, writeJSON5 } from "spell/app/spaces/server/node/storage/json5"

/** The roles that may change anyone's rows in a folder, not only their own. */
const KEEPER_ROLES: readonly string[] = ["admin", "spell-admin"]

/** The role a folder's own person is written into its `__members/` with:  the owner's. */
const OWNER_ROLE = "admin"

/** The folder of a project data folder's own memberships:  optional (epic `atmosphere` Q9). */
const MEMBERS_FOLDER = "__members"

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
 * - WHO WRITES:  each row's owner is whoever made it (`owner`), and only they change it, as on an atmosphere account;
 *   except a KEEPER of the folder, who may change anyone's:
 *   - the person whose space it is
 *   - an admin in the folder's own memberships, `__members/`, when it has one (optional:  Q9)
 *   - without one, an admin of the space's org (`PeopleStore.rolesOf()`), as the org's members are today
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
    await this.writeOwnerMembership(storage, address)
    const place = new FolderPlace({
      storage,
      format: new JsonChunks({ summaries: "every field" }),
      whoWrites: "only the owner",
      mayChangeAnyRow: (who) => this.isKeeper(storage, address, who),
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

  ////////////////
  // ## Who may change anyone's rows
  ////////////////

  /** May `who` change any row of the folder at `address`, not only their own?  See the class. */
  private async isKeeper(storage: DiskStorage, address: string, who: string): Promise<boolean> {
    const space = spaceOf(address)
    if (space.person && who === space.address) return true
    const members = await this.membersOf(storage)
    if (members) return members.some(({ person, role }) => person === who && KEEPER_ROLES.includes(role))
    const roles = await this.orgRolesOf(who)
    return roles.some(({ id, role }) => id === space.org && KEEPER_ROLES.includes(role))
  }

  /** The folder's own memberships, by each person's address:  `undefined` if it has no `__members/`. */
  private async membersOf(storage: DiskStorage): Promise<{ person: string; role: string }[] | undefined> {
    const names = await storage.list(MEMBERS_FOLDER)
    if (!names.length) return undefined
    const members: { person: string; role: string }[] = []
    for (const name of names.filter((each) => /\.json5?$/.test(each))) {
      const entry = await readJSON5<MembershipEntry>(storage, `${MEMBERS_FOLDER}/${name}`).catch(() => undefined)
      const person = personAddressIn(entry?.person)
      if (person && typeof entry?.role === "string") members.push({ person, role: entry.role })
    }
    return members
  }

  /** `who`'s roles in their orgs, as the people store has them:  none for someone with no file. */
  private async orgRolesOf(who: string): Promise<OrgRole[]> {
    const [id, org] = who.split("@")
    if (!id || !org) return []
    const { person } = await this.people.person(id, org)
    return person ? this.people.rolesOf(person) : []
  }

  /**
   * SIDE EFFECT:  a folder with its own `__members/` gets its person's membership there, the owner's role, if missing.
   * - Only a person's space has one person to write:  an org's folder is its admins'.
   */
  private async writeOwnerMembership(storage: DiskStorage, address: string): Promise<void> {
    const space = spaceOf(address)
    const members = await this.membersOf(storage)
    if (!members || !space.person || members.some(({ person }) => person === space.address)) return
    const entry = { $type: "Membership", person: { $ref: `Person#${space.address}` }, role: OWNER_ROLE }
    await writeJSON5(storage, join(MEMBERS_FOLDER, `${space.address}.json5`), entry)
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

/** One membership, as a `__members/` file holds it. */
type MembershipEntry = {
  /** Who:  a reference, `{ "$ref": "Person#owen@spell" }`, or their address, `"owen@spell"`. */
  person?: unknown
  /** Their role:  guest, member, admin or spell-admin. */
  role?: unknown
}

/** A person's address, from what a membership says of them:  `{ "$ref": "Person#owen@spell" }` => `owen@spell`. */
function personAddressIn(person: unknown): string | undefined {
  if (typeof person === "string") return person.includes("@") ? person : undefined
  const ref = (person as { $ref?: unknown } | undefined)?.$ref
  if (typeof ref !== "string") return undefined
  const { id, place } = parseRef(ref)
  return place ? `${id}@${place}` : id.includes("@") ? id : undefined
}

/** Whose space `address` is in:  `owen@spell/recipes` is the person `owen@spell`, of org `spell`;  `@three-degrees/x`, the org. */
function spaceOf(address: string): { address: string; person?: string; org: string } {
  const [space = ""] = address.split("/")
  const [person, org = ""] = space.split("@")
  return person ? { address: space, person, org } : { address: space, org }
}
