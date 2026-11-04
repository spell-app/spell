import { join } from "path"

import {
  PlaceError,
  SPACE_MEMBER_OPERATIONS,
  type PlaceContext,
  type SpaceMember
} from "spell/util/places/places.types"
import { parseRef } from "spell/util/places/refs"
import { SRV } from "spell/server"
import type { FolderOperation } from "spell/server/places"
import type { Role } from "spell/app/spaces/models/people"
import type { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"
import type { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"
import { readJSON5, writeJSON5 } from "spell/app/spaces/server/node/storage/json5"
import { Membership } from "spell/app/spaces/@spell/library/people/people.lib.ts"

/** The folder of a project data folder's own memberships:  optional (epic `atmosphere` Q9). */
const MEMBERS_FOLDER = "__members"

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
 *   - its own memberships, a file each in `__members/` (optional:  Q9 B), `{ person: { $ref: "Person#ana@spell" }, role }`
 *   - in a person's space (`owen@spell/recipes`):  that person, its admin
 *   - in an org's (`@family/cookbook`):  the org's members, as the people store has them (`PeopleStore.rolesOf()`)
 * - Each role gives a read, a write and a manage flag (`ROLE_FLAGS`):  a guest reads, a member writes, an admin also
 *   adds and removes members.
 * - Joining, leaving and admins follow AT Protocol's lists (proposal 0001, T6):  a membership added, removed, or given
 *   the admin role (`operations`, `SPACE_MEMBER_OPERATIONS`), written where the members are:  the folder's own file, or
 *   the org's, through the people store.
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

  constructor({ address, storage, people }: SpaceMembersProps) {
    this.space = spaceOf(address)
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
        const { person, role } = (input ?? {}) as { person?: unknown; role?: unknown }
        await this.askerOrDie(context, "add members", "canManage")
        await this.add(addressOrDie(person), roleOrDie(role))
        return this.list()
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
   * - throws `HttpError(404)` for an org, or a person, the people store has no file for
   */
  async add(person: string, role: Role): Promise<void> {
    const own = await this.ownMemberships()
    if (own || this.space.person) {
      if (!own) await this.writeMembership(this.space.address, OWNER_ROLE)
      await this.writeMembership(person, role, own?.find((each) => each.person === person)?.file)
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
      const file = own.find((each) => each.person === person)?.file
      if (file) await this.storage.remove(join(MEMBERS_FOLDER, file))
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
      if (person && isRole(entry?.role)) memberships.push({ person, role: entry.role, file })
    }
    return memberships
  }

  /** Write `person`'s membership into the folder's own `__members/`:  `file`, or one named by their address. */
  private async writeMembership(person: string, role: Role, file = `${person}.json5`): Promise<void> {
    const entry = { $type: "Membership", person: { $ref: `Person#${person}` }, role }
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

/** One membership in a folder's own `__members/`, and its file. */
type OwnMembership = { person: string; role: Role; file: string }

/** One membership, as a `__members/` file holds it. */
type MembershipEntry = {
  /** Who:  a reference, `{ "$ref": "Person#owen@spell" }`, or their address, `"owen@spell"`. */
  person?: unknown
  /** Their role:  guest, member, admin or spell-admin. */
  role?: unknown
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
