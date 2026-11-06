import { join } from "path"

import {
  PlaceError,
  SPACE_MEMBER_OPERATIONS,
  SPACE_SETTINGS_DEFAULT,
  type PlaceContext,
  type SpaceMember,
  type SpaceSettings
} from "spell/places/places.types"
import { parseRef } from "spell/places/refs"
import { SRV } from "spell/server"
import type { FolderOperation } from "spell/server/places"
import type { Role } from "spell/app/spaces/models/people"
import type { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"
import type { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"
import { readJSON5, writeJSON5 } from "spell/app/spaces/server/node/storage/json5"
import { Membership } from "spell/app/spaces/@spell/library/people/people.lib.ts"

import type { RealSpace } from "./RealSpace"

/** The folder of a project data folder's own memberships:  optional (epic `atmosphere` Q9). */
const MEMBERS_FOLDER = "__members"

/**
 * A space's own settings, who besides its members reads and writes it (`SpaceSettings`, epic `atmosphere` P7, Q13):
 * in its `__settings/` folder, one of spaces' own names, so never listed, read direct or exported.
 */
const SETTINGS_FILE = "__settings/space.json5"

/** What a space's folder keeps when it's deleted:  Spell's own log of what it took down, so a takedown outlives it. */
const KEPT_ON_DELETE = new Set(["__takedowns.json5"])

/** The role a space's own person has in it, and is written into its `__members/` with:  the owner's. */
const OWNER_ROLE: Role = "admin"

/** What each role lets a member do:  guests read, members write, admins also manage the list (epic `atmosphere` P4). */
const ROLE_FLAGS: Record<Role, Omit<SpaceMember, "person" | "role">> = {
  guest: { canRead: true, canWrite: false, canManage: false },
  member: { canRead: true, canWrite: true, canManage: false },
  admin: { canRead: true, canWrite: true, canManage: true },
  "spell-admin": { canRead: true, canWrite: true, canManage: true }
}

/****************
 * ### `SpaceMembers`
 * Who's in the space one project data folder is in, and what their role lets them do (epic `atmosphere` P4, Q4, Q9).
 *
 * ```ts
 * const members = new SpaceMembers({ address: "@family/cookbook", storage, people })
 * await members.memberOf("ana@spell")     // { person: "ana@spell", role: "admin", canRead: true, canWrite: true, ... }
 * ```
 *
 * - Its members, from the first of these the folder has:
 *   - its own memberships, a file each in `__members/` (optional:  Q9 B):
 *     `{ person: { $ref: "Person#ana@spell" }, role }`
 *   - in a person's space (`owen@spell/recipes`):  that person, its admin
 *   - in an org's (`@family/cookbook`):  the org's members, as the people store has them (`PeopleStore.rolesOf()`)
 * - Each role gives a read, a write and a manage flag (`ROLE_FLAGS`):
 *   a guest reads, a member writes, an admin also adds and removes members.
 * - Joining, leaving and admins follow AT Protocol's lists (proposal 0001, T6):
 *   a membership added, removed, or given the admin role (`operations`, `SPACE_MEMBER_OPERATIONS`).
 *   - Written where the members are:  the folder's own file, or the org's, through the people store.
 * - Its SETTINGS (epic `atmosphere` P7, Q13), `publicRead` and `publicWrite`, as an AT Protocol Space's member space
 *   has them.
 *   - Both off, unless an admin turns them on.
 *   - In the folder's `__settings/space.json5` (`SETTINGS_FILE`).
 *   - `publicRead`:  anyone reads it, signed in or not (`mayRead()`)
 *   - `publicWrite`:  anyone signed in adds things of their own, and changes only those (the kit's `FolderPlace`)
 * - An admin may DELETE the space (`deleteSpace()`):  every file of it, for good, but Spell's takedown log.
 * - KEPT IN A REAL SPACE (epic `atmosphere` P14):  its settings may name an AT Protocol Space (`keptIn()`, `realSpace`);
 *   then the Space's own list follows this one (`realSpace`, the app's `RealSpace`), for each member whose membership
 *   names their AT Protocol account (`did`).
 *   - The Space's list first:  a host that says no changes nothing here.
 *   - A member with no `did` is on Spell's list alone, and reads the Space through Spell only once they have one.
 * - Read afresh each time it's asked:  a membership written by hand in VS Code counts at once.
 * - Node only;  the kit's `FolderPlace` is handed `memberOf()` and `operations`, and knows nothing of roles.
 ****************/
export class SpaceMembers {
  /** The space's own id, which every thing in it is written as:  `@family`, `owen@spell`. */
  readonly spaceId: string
  /** The folder's files. */
  private readonly storage: DiskStorage
  /** People and orgs. */
  private readonly people: PeopleStore
  /** Whose space it is. */
  private readonly space: Space
  /** Told once the space is deleted through its operations:  its host forgets what it opened. */
  private readonly onDeleted: (() => void) | undefined
  /** The real Space it's kept in, if it is:  its list follows this one. */
  private readonly realSpace: SpaceMembersProps["realSpace"]

  constructor({ address, storage, people, onDeleted, realSpace }: SpaceMembersProps) {
    this.space = spaceOf(address)
    this.onDeleted = onDeleted
    this.realSpace = realSpace
    this.spaceId = this.space.person ? this.space.address : `@${this.space.org}`
    this.storage = storage
    this.people = people
  }

  ////////////////
  // ## Who's a member
  ////////////////

  /** Every member, with what their role lets them do. */
  async list(): Promise<SpaceMember[]> {
    const own = await this.ownMemberships()
    if (own) return own.map(({ person, role }) => memberWith(person, role))
    if (this.space.person) return [memberWith(this.space.address, OWNER_ROLE)]
    const org = await this.people.org(this.space.org)
    return (org?.members.items ?? []).flatMap((membership) =>
      membership.person ? [memberWith(this.people.addressOf(membership.person), membership.role)] : []
    )
  }

  /** `identity` as a member, with what their role lets them do:  `undefined` for someone who isn't one.  See the class. */
  memberOf = async (identity: string): Promise<SpaceMember | undefined> => {
    const own = await this.ownMemberships()
    if (own) {
      const found = own.find(({ person }) => person === identity)
      return found && memberWith(found.person, found.role)
    }
    if (this.space.person) return identity === this.space.address ? memberWith(identity, OWNER_ROLE) : undefined
    const role = (await this.orgRolesOf(identity)).find(({ id }) => id === this.space.org)?.role
    return role && memberWith(identity, role)
  }

  /**
   * May `who` change anyone's rows in a program's own folder, not only their own (epic `atmosphere` P1)?
   * - the space's own person;  an admin in the folder's own memberships, when it has them;
   *   without, an admin of the space's org
   */
  async keeps(who: string): Promise<boolean> {
    if (this.space.person && who === this.space.address) return true
    const own = await this.ownMemberships()
    if (own) return own.some(({ person, role }) => person === who && isManager(role))
    return (await this.orgRolesOf(who)).some(({ id, role }) => id === this.space.org && isManager(role))
  }

  /**
   * May `identity` read the space:  a member, or anyone at all, signed in or not (`undefined`), once it's `publicRead`.
   */
  mayRead = async (identity: string | undefined): Promise<boolean> => {
    if (identity !== undefined && (await this.memberOf(identity))?.canRead) return true
    return (await this.settings()).publicRead
  }

  ////////////////
  // ## Settings
  ////////////////

  /** Its settings, as its file says:  `SPACE_SETTINGS_DEFAULT` (members only) for none, or for what isn't a setting. */
  settings = async (): Promise<SpaceSettings> => {
    const said = await readJSON5<Partial<SpaceSettings>>(this.storage, SETTINGS_FILE).catch(() => undefined)
    return {
      publicRead: said?.publicRead === true,
      publicWrite: said?.publicWrite === true
    }
  }

  /** The real AT Protocol Space it's kept in, `at://...`, as its settings say (`realSpace`):  `undefined` for none. */
  async keptIn(): Promise<string | undefined> {
    const said = await readJSON5<{ realSpace?: unknown }>(this.storage, SETTINGS_FILE).catch(() => undefined)
    return typeof said?.realSpace === "string" && said.realSpace.startsWith("at://") ? said.realSpace : undefined
  }

  /**
   * SIDE EFFECT:  keep the space in the real AT Protocol Space `uri` from now on, its org's (`keptIn()`).
   * - Spell's own tools set it;  never an admin through its operations.
   */
  async keepIn(uri: string): Promise<void> {
    const said = (await readJSON5<Record<string, unknown>>(this.storage, SETTINGS_FILE).catch(() => undefined)) ?? {}
    await writeJSON5(this.storage, SETTINGS_FILE, { ...said, realSpace: uri })
  }

  /**
   * Change some of its settings:  the settings after it.
   * - throws `HttpError(400)` for anything but `publicRead` and `publicWrite`, each true or false
   */
  async changeSettings(changes: unknown): Promise<SpaceSettings> {
    const settings = { ...(await this.settings()), ...settingsOrDie(changes) }
    const said = (await readJSON5<Record<string, unknown>>(this.storage, SETTINGS_FILE).catch(() => undefined)) ?? {}
    // what isn't an admin's to change, the real Space it's kept in, stays
    await writeJSON5(this.storage, SETTINGS_FILE, { ...said, ...settings })
    return settings
  }

  ////////////////
  // ## Deleting
  ////////////////

  /**
   * SIDE EFFECT:  delete the space, for good:  every file of its folder, its members and settings too.
   * - Spell's takedown log stays (`KEPT_ON_DELETE`), so what it took down stays down if the space is made again.
   * - Backups still hold it until they age out (`SpaceBackups`).
   */
  async deleteSpace(): Promise<void> {
    for (const name of await this.storage.list("")) {
      const path = name.replace(/\/$/, "")
      if (!KEPT_ON_DELETE.has(path)) await this.storage.remove(path)
    }
  }

  ////////////////
  // ## Joining and leaving
  ////////////////

  /** What `FolderPlace` answers through `PlaceServer`'s `call`, by `SPACE_MEMBER_OPERATIONS`' names:  see there. */
  get operations(): Record<string, FolderOperation> {
    return {
      [SPACE_MEMBER_OPERATIONS.members]: async (_input, context) => {
        await this.askerOrDie(context, "see who's in it", "canRead")
        return this.list()
      },
      [SPACE_MEMBER_OPERATIONS.add]: async (input, context) => {
        const { person, role, did } = (input ?? {}) as { person?: unknown; role?: unknown; did?: unknown }
        await this.askerOrDie(context, "add members", "canManage")
        await this.add(addressOrDie(person), roleOrDie(role), didOrDie(did))
        return this.list()
      },
      [SPACE_MEMBER_OPERATIONS.settings]: async (_input, { identity }) => {
        if (!(await this.mayRead(identity))) await this.askerOrDie({ identity }, "see its settings", "canRead")
        return this.settings()
      },
      [SPACE_MEMBER_OPERATIONS.changeSettings]: async (input, context) => {
        await this.askerOrDie(context, "change its settings", "canManage")
        return this.changeSettings(input)
      },
      [SPACE_MEMBER_OPERATIONS.deleteSpace]: async (_input, context) => {
        await this.askerOrDie(context, "delete the space", "canManage")
        await this.deleteSpace()
        this.onDeleted?.()
        return { deleted: this.spaceId }
      },
      [SPACE_MEMBER_OPERATIONS.remove]: async (input, context) => {
        const person = addressOrDie((input as { person?: unknown } | undefined)?.person)
        // a member may always leave
        if (person !== context.identity) await this.askerOrDie(context, "remove members", "canManage")
        await this.remove(person)
        return this.list()
      }
    }
  }

  /**
   * Make `person` a member with role `role`, or change the role they have, where the members are (see the class).
   * - A person's space with no memberships of its own gets them:  its person first, as its admin.
   * - `did`:  their AT Protocol account, for a space kept in a real Space:  put on its list first (see the class);
   *   kept in their membership, so a later change knows it
   * - throws `HttpError(404)` for an org, or a person, the people store has no file for;
   *   `SpaceRefusal` for the real Space's no
   */
  async add(person: string, role: Role, did?: string): Promise<void> {
    const own = await this.ownMemberships()
    const known = own?.find((each) => each.person === person)
    const theirDid = did ?? known?.did
    const real = theirDid === undefined ? undefined : await this.realSpace?.()
    if (real && theirDid) await real.putMember(theirDid, memberWith(person, role))
    if (own || this.space.person) {
      if (!own) await this.writeMembership(this.space.address, OWNER_ROLE)
      await this.writeMembership(person, role, { file: known?.file, did: theirDid })
      return
    }
    const { org, member } = await this.orgAndPersonOrDie(person)
    await this.people.setRole(org, member, role)
  }

  /**
   * Take `person` out, where the members are.
   * - throws `PlaceError` `"refused"` when it would leave nobody to manage the space
   */
  async remove(person: string): Promise<void> {
    const members = await this.list()
    const leaving = members.find((each) => each.person === person)
    if (!leaving) return
    if (leaving.canManage && !members.some((each) => each !== leaving && each.canManage)) {
      throw new PlaceError(`${person} is the last admin of ${this.spaceId}:  make someone else an admin first`, {
        cause: { kind: "refused", whyNot: "place" }
      })
    }
    const own = await this.ownMemberships()
    if (own) {
      const membership = own.find((each) => each.person === person)
      const real = membership?.did === undefined ? undefined : await this.realSpace?.()
      if (real && membership?.did) await real.removeMember(membership.did)
      if (membership) await this.storage.remove(join(MEMBERS_FOLDER, membership.file))
      return
    }
    const { org, member } = await this.orgAndPersonOrDie(person)
    await this.people.removeMembership(org, member)
  }

  /**
   * SIDE EFFECT:  a folder with its own `__members/` gets its person's membership there, the owner's role, if missing.
   * - Only a person's space has one person to write:  an org's folder is its admins'.
   */
  async writeOwnerMembership(): Promise<void> {
    const own = await this.ownMemberships()
    if (!own || !this.space.person || own.some(({ person }) => person === this.space.address)) return
    await this.writeMembership(this.space.address, OWNER_ROLE)
  }

  ////////////////
  // ## Helpers
  ////////////////

  /**
   * Who's asking, as a member whose role lets them `ability`.
   * - Nobody in particular (the folder's own code, a test):  trusted, `undefined`.
   * - throws `PlaceError` `"refused"`, `"role"`, for anyone else
   */
  private async askerOrDie(
    { identity }: PlaceContext,
    what: string,
    ability: "canRead" | "canManage"
  ): Promise<SpaceMember | undefined> {
    if (identity === undefined) return undefined
    const asker = await this.memberOf(identity)
    if (asker?.[ability]) return asker
    const why = asker ? `you're a ${asker.role} of ${this.spaceId}` : `you aren't a member of ${this.spaceId}`
    throw new PlaceError(`Your role can't ${what}:  ${why}`, { cause: { kind: "refused", whyNot: "role" } })
  }

  /** The folder's own memberships, by each person's address, and each one's file:  `undefined` with no `__members/`. */
  private async ownMemberships(): Promise<OwnMembership[] | undefined> {
    const names = await this.storage.list(MEMBERS_FOLDER)
    if (!names.length) return undefined
    const memberships: OwnMembership[] = []
    for (const file of names.filter((each) => /\.json5?$/.test(each))) {
      const entry = await readJSON5<MembershipEntry>(this.storage, join(MEMBERS_FOLDER, file)).catch(() => undefined)
      const person = personAddressIn(entry?.person)
      const did = typeof entry?.did === "string" ? entry.did : undefined
      if (person && isRole(entry?.role)) memberships.push({ person, role: entry.role, file, ...(did && { did }) })
    }
    return memberships
  }

  /**
   * Write `person`'s membership into the folder's own `__members/`:  `file`, or one named by their address;
   * with their AT Protocol account (`did`), when it's known.
   */
  private async writeMembership(
    person: string,
    role: Role,
    { file = `${person}.json5`, did }: { file?: string | undefined; did?: string | undefined } = {}
  ): Promise<void> {
    const entry = { $type: "Membership", person: { $ref: `Person#${person}` }, role, ...(did && { did }) }
    await writeJSON5(this.storage, join(MEMBERS_FOLDER, file), entry)
  }

  /** `who`'s roles in their orgs, as the people store has them:  none for someone with no file. */
  private async orgRolesOf(who: string): Promise<{ id: string; role: Role }[]> {
    const [id, org] = who.split("@")
    if (!id || !org) return []
    const { person } = await this.people.person(id, org)
    return person ? this.people.rolesOf(person) : []
  }

  /** The space's org, and `person`, as the people store has them.  - throws `HttpError(404)` for either missing */
  private async orgAndPersonOrDie(person: string) {
    const org = await this.people.org(this.space.org)
    if (!org) throw new SRV.HttpError(404, `there's no org @${this.space.org} to add members to`)
    const [id, home] = person.split("@")
    const member = (await this.people.person(id!, home)).person
    if (!member) throw new SRV.HttpError(404, `there's nobody called ${person}:  invite them first`)
    return { org, member }
  }
}

/** Constructor props of `SpaceMembers`. */
export type SpaceMembersProps = {
  /** The folder's full address:  `@family/cookbook`, `owen@spell/recipes`. */
  address: string
  /** Its files. */
  storage: DiskStorage
  /** People and orgs. */
  people: PeopleStore
  /** Told once the space is deleted through its operations (`deleteSpace`). */
  onDeleted?: () => void
  /**
   * The real Space it's kept in, if it is (the app's `RealSpace`, epic `atmosphere` P14):  its list follows this one.
   * - asked as a member is added or removed;  `undefined` for a space kept in none
   */
  realSpace?: () => Promise<Pick<RealSpace, "putMember" | "removeMember"> | undefined>
}

/** Whose space an address is in. */
type Space = {
  /** The space's part of the address:  `owen@spell`, `@family`. */
  address: string
  /** Its person's id, for a person's space:  `owen`. */
  person?: string
  /** Its org:  the person's (`spell`), or the org whose space it is (`family`). */
  org: string
}

/** One membership in a folder's own `__members/`, its file, and their AT Protocol account if it's known. */
type OwnMembership = { person: string; role: Role; file: string; did?: string }

/** One membership, as a `__members/` file holds it. */
type MembershipEntry = {
  /** Who:  a reference, `{ "$ref": "Person#owen@spell" }`, or their address, `"owen@spell"`. */
  person?: unknown
  /** Their role:  guest, member, admin or spell-admin. */
  role?: unknown
  /** Their AT Protocol account, `did:plc:...`, for a space kept in a real Space (epic `atmosphere` P14). */
  did?: unknown
}

/** `person`, a member with role `role`, and what it lets them do. */
function memberWith(person: string, role: Role): SpaceMember {
  return { person, role, ...ROLE_FLAGS[role] }
}

/** Does `role` manage a space, an admin? */
function isManager(role: Role): boolean {
  return ROLE_FLAGS[role].canManage
}

/** Is `role` one of the people library's roles? */
function isRole(role: unknown): role is Role {
  return (Membership.Roles as readonly unknown[]).includes(role)
}

/** - throws `HttpError(400)` for a role that isn't one */
function roleOrDie(role: unknown): Role {
  if (!isRole(role)) throw new SRV.HttpError(400, `send a role, one of ${Membership.Roles.join(", ")}`)
  return role
}

/** - throws `HttpError(400)` for anything but some of `SpaceSettings`, each true or false */
function settingsOrDie(changes: unknown): Partial<SpaceSettings> {
  const said = (changes ?? {}) as Record<string, unknown>
  const names = Object.keys(SPACE_SETTINGS_DEFAULT)
  const isSetting = ([name, value]: [string, unknown]) => names.includes(name) && typeof value === "boolean"
  const entries = Object.entries(said)
  if (typeof changes !== "object" || !entries.length || !entries.every(isSetting)) {
    throw new SRV.HttpError(400, `send settings to change:  ${names.join(", ")}, each true or false`)
  }
  return Object.fromEntries(entries) as Partial<SpaceSettings>
}

/** - throws `HttpError(400)` for a `did` that's sent and isn't one, `did:plc:...` */
function didOrDie(did: unknown): string | undefined {
  if (did === undefined) return undefined
  if (typeof did !== "string" || !/^did:[a-z]+:\S+$/.test(did)) {
    throw new SRV.HttpError(400, `send their AT Protocol account as a DID, like "did:plc:abc123"`)
  }
  return did
}

/** - throws `HttpError(400)` for anything but a person's address, `ana@spell` */
function addressOrDie(person: unknown): string {
  if (typeof person !== "string" || !/^[^@/\s]+@[^@/\s]+$/.test(person)) {
    throw new SRV.HttpError(400, `send a person's address, like "ana@spell"`)
  }
  return person
}

/** A person's address, from what a membership says of them:  `{ "$ref": "Person#owen@spell" }` => `owen@spell`. */
function personAddressIn(person: unknown): string | undefined {
  if (typeof person === "string") return person.includes("@") ? person : undefined
  const ref = (person as { $ref?: unknown } | undefined)?.$ref
  if (typeof ref !== "string") return undefined
  const { id, place } = parseRef(ref)
  return place ? `${id}@${place}` : id.includes("@") ? id : undefined
}

/** Whose space `address` is in:  `owen@spell/recipes` is the person `owen@spell`, of org `spell`;  `@family/x`, the org. */
function spaceOf(address: string): Space {
  const [space = ""] = address.split("/")
  const [person, org = ""] = space.split("@")
  return person ? { address: space, person, org } : { address: space, org }
}
