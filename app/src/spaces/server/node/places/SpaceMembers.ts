import { join } from "path"

import {
  PlaceError,
  SPACE_MEMBER_OPERATIONS,
  SPACE_SETTINGS_DEFAULT,
  type PlaceContext,
  type SpaceMember,
  type SpaceSettings,
  type ThingChange
} from "spell/places/places.types"
import { parseRef } from "spell/places/refs"
import { SRV } from "spell/server"
import type { FolderOperation } from "spell/server/places"
import { SP } from "spell/parser/spell"
import {
  SPACE_ROLES,
  leastRoleFor,
  mayDo,
  spaceRoleFor,
  type Role,
  type SpaceRole,
  type SpaceRoleRights
} from "spell/app/spaces/models/people"
import { OrgRoles, type PairedSpace } from "spell/app/spaces/server/node/people/OrgRoles"
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
const OWNER_ROLE: SpaceRole = "manager"

/** The role an org's Manager of a space has in it (epic `atmosphere` P20, Q28):  its manager, whatever their membership says. */
const ORG_MANAGER_ROLE: SpaceRole = "manager"

/**
 * The most a paired space's membership gives someone who manages nothing there (epic `atmosphere` P22):
 * an org file's manager writes, but manages a space only by the org's roles.
 */
const MOST_FOR_A_MEMBER: SpaceRole = "editor"

/** What a refusal calls each kind of thing, in English:  a page says it in its own language, from the role it `needs`. */
const KIND_WORDS = { post: "posts or comments", row: "rows", file: "pages or files", app: "apps" } as const

/****************
 * ### `SpaceMembers`
 * Who's in the space one project data folder is in, and what their role lets them do (epic `atmosphere` P4, Q4, Q9).
 *
 * ```ts
 * const members = new SpaceMembers({ address: "@family/cookbook", storage, people })
 * await members.memberOf("ana@spell")     // { person: "ana@spell", role: "manager", canRead: true, canWrite: true, ... }
 * ```
 *
 * - Its members, from the first of these the folder has:
 *   - its own memberships, a file each in `__members/` (optional:  Q9 B):
 *     `{ person: { $ref: "Person#ana@spell" }, role }`
 *   - in a person's space (`owen@spell/recipes`):  that person, its manager
 *   - in an org's (`@family/cookbook`):  the org's members, as the people store has them (`PeopleStore.rolesOf()`)
 * - In an org with an Admin space, every folder is in one of its PAIRED SPACES (epic `atmosphere` P22,
 *   `OrgRoles.spaceAt()`):  the org's, the Admins', each team's and each project's, a shared one and a private one.
 *   - Its list is worked out from the org's roles, never typed, asked every time:
 *     - shared (`events_team@rs/welcome`):  everyone in the org, by their membership's role, at most an editor;
 *       and its Managers, as its managers (`OrgRoles.managersOfSpace()`)
 *     - private (`finance_team@rs/__private/budget-notes`):  its Managers alone
 *   - A folder's own `__members/` doesn't count there.
 *   - Joining and leaving:  only the org's own shared space takes them, as joining or leaving the org;
 *     every other's list changes with the org's roles alone (`pairedListOrDie()`).
 * - Each role is a space role (`SPACE_ROLES`, the ONE table;  epic `atmosphere` P20, Q20 A, Q21 D):
 *   a viewer reads and posts, an editor also changes what's there, a manager also makes and removes, and adds and
 *   removes members.
 *   - What each may write, by the kind of thing:  `changeOrDie()` (epic `atmosphere` P23), which the kit's
 *     `FolderPlace` asks of each change.
 *   - An older file's guest, member and admin are read as viewer, editor and manager (`spaceRoleFor()`);
 *     Spell's own spell-admin, as a manager.
 * - Joining, leaving and managers follow AT Protocol's lists (proposal 0001, T6):
 *   a membership added, removed, or given the manager role (`operations`, `SPACE_MEMBER_OPERATIONS`).
 *   - Written where the members are:  the folder's own file, or the org's, through the people store.
 * - Its SETTINGS (epic `atmosphere` P7, Q13), `publicRead` and `publicWrite`, as an AT Protocol Space's member space
 *   has them.
 *   - Both off, unless a manager turns them on.
 *   - In the folder's `__settings/space.json5` (`SETTINGS_FILE`).
 *   - `publicRead`:  anyone reads it, signed in or not (`mayRead()`)
 *   - `publicWrite`:  anyone signed in adds things of their own, and changes only those (the kit's `FolderPlace`)
 * - A manager may DELETE the space (`deleteSpace()`):  every file of it, for good, but Spell's takedown log.
 * - KEPT IN A REAL SPACE (epic `atmosphere` P14):  its settings may name an AT Protocol Space (`keptIn()`, `realSpace`);
 *   then the Space's own list follows this one (`realSpace`, the app's `RealSpace`), for each member whose membership
 *   names their AT Protocol account (`did`).
 *   - The Space's list first:  a host that says no changes nothing here.
 *   - A member with no `did` is on Spell's list alone, and reads the Space through Spell only once they have one.
 * - Read afresh each time it's asked:  a membership written by hand in VS Code counts at once.
 * - Node only;  the kit's `FolderPlace` is handed `memberOf()`, `changeOrDie()` and `operations`, and knows nothing
 *   of roles.
 ****************/
export class SpaceMembers {
  /** The space's own id, which every thing in it is written as:  `@family`, `owen@spell`. */
  readonly spaceId: string
  /** The folder's files. */
  private readonly storage: DiskStorage
  /** People and orgs. */
  private readonly people: PeopleStore
  /** Its folder's full address:  `@family/cookbook`, `events_team@rs/__private/notes`. */
  private readonly address: string
  /** Whose space it is, by its address alone:  a paired space (`paired()`) needs its org's roles too. */
  private readonly space: Space
  /** Told once the space is deleted through its operations:  its host forgets what it opened. */
  private readonly onDeleted: (() => void) | undefined
  /** The real Space it's kept in, if it is:  its list follows this one. */
  private readonly realSpace: SpaceMembersProps["realSpace"]
  /** Who manages what in its org, for an org's space. */
  private readonly orgRoles: OrgRoles

  constructor({ address, storage, people, onDeleted, realSpace, orgRoles }: SpaceMembersProps) {
    this.address = address
    this.space = spaceOf(address)
    this.onDeleted = onDeleted
    this.realSpace = realSpace
    this.orgRoles = orgRoles ?? new OrgRoles({ people })
    this.spaceId = this.space.person ? this.space.address : `@${this.space.org}`
    this.storage = storage
    this.people = people
  }

  ////////////////
  // ## Who's a member
  ////////////////

  /** Every member, with what their role lets them do. */
  async list(): Promise<SpaceMember[]> {
    const paired = await this.paired()
    if (paired) return this.pairedList(paired)
    const own = await this.ownMemberships()
    if (this.space.person) {
      return own
        ? own.map(({ person, role }) => memberWith(person, role))
        : [memberWith(this.space.address, OWNER_ROLE)]
    }
    const org = own ? undefined : await this.people.org(this.space.org)
    const listed: [string, Role][] = own
      ? own.map(({ person, role }) => [person, role])
      : (org?.members.items ?? []).flatMap((each) =>
          each.person ? [[this.people.addressOf(each.person), each.role]] : []
        )
    return listed.map(([person, role]) => memberWith(person, role))
  }

  /** `identity` as a member, with what their role lets them do:  `undefined` for someone who isn't one.  See the class. */
  memberOf = async (identity: string): Promise<SpaceMember | undefined> => {
    const paired = await this.paired()
    if (paired) {
      if ((await this.orgRoles.managersOfSpace(paired)).includes(identity))
        return memberWith(identity, ORG_MANAGER_ROLE)
      if (paired.side === "private") return undefined
      const role = (await this.orgRolesOf(identity)).find(({ id }) => id === paired.org)?.role
      return role && memberWith(identity, atMostAnEditor(role))
    }
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
   * - the space's own person;  else as their role says (`SPACE_ROLES`' `canChangeAny`):  a manager
   */
  async keeps(who: string): Promise<boolean> {
    if (this.space.person && who === this.space.address && !(await this.paired())) return true
    const member = await this.memberOf(who)
    return !!member && SPACE_ROLES[member.role as SpaceRole].canChangeAny
  }

  ////////////////
  // ## Writes by role
  ////////////////

  /**
   * May this change be made (epic `atmosphere` P23, Q21 D)?  The kit's `FolderPlace` asks it of each change a member
   * makes, by its kind of thing:  a post, a row, a file, an app.  See `SPACE_ROLES`' `things`.
   * - a viewer:  posts and comments, where the space lets its viewers (`viewersPost`), and changes only their own
   * - an editor:  also changes any existing page, sheet or row;  makes no page, sheet or app
   * - a manager:  also makes pages, sheets and apps, and removes anything;  never changes someone else's post
   * - "their own":  whose `by` is them, as nobody else ever changes a post
   * - an app:  only one the org's Admins approved, at the version approved (`OrgRoles.approvedApps()`)
   * - throws `PlaceError` `"refused"`:  `"role"` with the role it `needs`, or `"owner"` for someone else's post
   */
  changeOrDie = async (change: ThingChange): Promise<void> => {
    const { member, kind, action, by, identity, collection } = change
    if (!member) return
    const settings = await this.settings()
    const rightsOf = (role: SpaceRole) => rightsIn(role, settings)
    const role = member.role as SpaceRole
    const isOwn = by === undefined || by === identity
    if (!mayDo(rightsOf(role), kind, action, isOwn)) {
      if (!isOwn && kind === "post" && action === "change") {
        throw new PlaceError(`"${collection}":  only ${by} changes their own ${kind}`, {
          cause: { kind: "refused", whyNot: "owner" }
        })
      }
      const needs = leastRoleFor(kind, action, isOwn, rightsOf)
      throw new PlaceError(
        `Your role can't ${action} ${KIND_WORDS[kind]} here:  you're ${withArticle(role)} of ` +
          `${this.spaceId}, and it takes ${withArticle(needs)}`,
        { cause: { kind: "refused", whyNot: "role", needs } }
      )
    }
    if (kind === "app" && action !== "remove") await this.approvedAppOrDie(change.fields)
  }

  /** - throws `PlaceError` `"refused"`, `"place"`, for an app its org's Admins haven't approved at that version */
  private async approvedAppOrDie(fields: ThingChange["fields"]): Promise<void> {
    const paired = await this.paired()
    if (!paired) return
    const name = fields?.name
    const version = fields?.version
    const approved = await this.orgRoles.approvedApps(paired.org)
    if (approved.some((app) => app.name === name && app.version === version)) return
    const listed = approved.filter((app) => app.name === name).map((app) => app.version)
    const why = listed.length ? `only ${listed.join(", ")} is approved` : "it isn't on the approved list"
    throw new PlaceError(`@${paired.org} can't install ${String(name)} ${String(version)}:  ${why}`, {
      cause: { kind: "refused", whyNot: "place" }
    })
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
      publicWrite: said?.publicWrite === true,
      viewersPost: said?.viewersPost !== false
    }
  }

  /** The real AT Protocol Space it's kept in, `at://...`, as its settings say (`realSpace`):  `undefined` for none. */
  async keptIn(): Promise<string | undefined> {
    const said = await readJSON5<{ realSpace?: unknown }>(this.storage, SETTINGS_FILE).catch(() => undefined)
    return typeof said?.realSpace === "string" && said.realSpace.startsWith("at://") ? said.realSpace : undefined
  }

  /**
   * SIDE EFFECT:  keep the space in the real AT Protocol Space `uri` from now on, its org's (`keptIn()`).
   * - Spell's own tools set it;  never a manager through its operations.
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
    // what isn't a manager's to change, the real Space it's kept in, stays
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
   * - A person's space with no memberships of its own gets them:  its person first, as its manager.
   * - `did`:  their AT Protocol account, for a space kept in a real Space:  put on its list first (see the class);
   *   kept in their membership, so a later change knows it
   * - throws `HttpError(404)` for an org, or a person, the people store has no file for;
   *   `SpaceRefusal` for the real Space's no
   */
  async add(person: string, role: SpaceRole, did?: string): Promise<void> {
    const paired = await this.paired()
    if (paired) {
      this.pairedListOrDie(paired, `add ${person}`, role)
      const { org, member } = await this.orgAndPersonOrDie(person)
      await this.people.setRole(org, member, role)
      return
    }
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
    const paired = await this.paired()
    if (paired) this.pairedListOrDie(paired, `take ${person} out`, leaving.role as SpaceRole)
    if (leaving.canManage && !members.some((each) => each !== leaving && each.canManage)) {
      throw new PlaceError(`${person} is the last manager of ${this.spaceId}:  make someone else a manager first`, {
        cause: { kind: "refused", whyNot: "place" }
      })
    }
    const own = paired ? undefined : await this.ownMemberships()
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
   * - Only a person's space has one person to write:  an org's folder is its managers'.
   */
  async writeOwnerMembership(): Promise<void> {
    const own = await this.ownMemberships()
    if (!own || !this.space.person || own.some(({ person }) => person === this.space.address)) return
    if (await this.paired()) return
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
  async askerOrDie(
    { identity }: PlaceContext,
    what: string,
    ability: "canRead" | "canManage"
  ): Promise<SpaceMember | undefined> {
    if (identity === undefined) return undefined
    const asker = await this.memberOf(identity)
    if (asker?.[ability]) return asker
    const why = asker
      ? `you're ${withArticle(asker.role)} of ${this.spaceId}`
      : `you aren't a member of ${this.spaceId}`
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

  /** The paired space it's in (epic `atmosphere` P22), asked afresh:  `undefined` in an org with no Admin space, or a person's. */
  private paired(): Promise<PairedSpace | undefined> {
    return this.orgRoles.spaceAt(this.address)
  }

  /**
   * Paired space `space`'s list, worked out from its org's roles (see the class):  its Managers first, as managers;
   * then, in a shared one, everyone else in the org, at most an editor.
   */
  private async pairedList(space: PairedSpace): Promise<SpaceMember[]> {
    const managers = await this.orgRoles.managersOfSpace(space)
    const org = space.side === "shared" ? await this.people.org(space.org) : undefined
    const others = (org?.members.items ?? []).flatMap((each) => {
      const person = each.person && this.people.addressOf(each.person)
      return person && !managers.includes(person) ? [memberWith(person, atMostAnEditor(each.role))] : []
    })
    return [...managers.map((person) => memberWith(person, ORG_MANAGER_ROLE)), ...others]
  }

  /**
   * - throws `PlaceError` `"refused"` unless paired space `space`'s list takes `what`:
   *   only the org's own shared space, as joining or leaving the org, never as a manager;
   *   every other's changes with the org's roles alone
   */
  private pairedListOrDie(space: PairedSpace, what: string, role?: SpaceRole): void {
    const isOrgsShared = space.of.kind === "the-org" && space.side === "shared"
    if (isOrgsShared && role !== ORG_MANAGER_ROLE) return
    const why = isOrgsShared
      ? `its managers are the org's Board and Admins:  name them in @${space.org}'s Admin space`
      : `its list comes from @${space.org}'s roles:  change them in its Admin space`
    throw new PlaceError(`${space.address} can't ${what}:  ${why}`, { cause: { kind: "refused", whyNot: "place" } })
  }

  /** `who`'s roles in their orgs, as the people store has them:  none for someone with no file. */
  private async orgRolesOf(who: string): Promise<{ id: string; role: Role }[]> {
    const account = SP.SpellLocation.accountParts(who)
    if (!account) return []
    const { person } = await this.people.person(account.id, account.org)
    return person ? this.people.rolesOf(person) : []
  }

  /** The space's org, and `person`, as the people store has them.  - throws `HttpError(404)` for either missing */
  private async orgAndPersonOrDie(person: string) {
    const org = await this.people.org(this.space.org)
    if (!org) throw new SRV.HttpError(404, `there's no org @${this.space.org} to add members to`)
    const account = SP.SpellLocation.accountParts(person)
    const member = account && (await this.people.person(account.id, account.org)).person
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
  /** Who manages what in its org (epic `atmosphere` P20):  one of its own on `people`, by default. */
  orgRoles?: OrgRoles
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
  /** Their role:  viewer, editor or manager (or an older file's guest, member or admin). */
  role?: unknown
  /** Their AT Protocol account, `did:plc:...`, for a space kept in a real Space (epic `atmosphere` P14). */
  did?: unknown
}

/** `person`, a member with the space role `role` gives (an older word read as its new one), and what it lets them do. */
/** What `role` may do in a space with `settings`:  a viewer posts only where the space lets its viewers. */
function rightsIn(role: SpaceRole, settings: SpaceSettings): SpaceRoleRights {
  const rights: SpaceRoleRights = SPACE_ROLES[role]
  if (role !== "viewer" || settings.viewersPost !== false) return rights
  return { ...rights, things: { ...rights.things, post: { make: false, change: "none", remove: "none" } } }
}

function memberWith(person: string, role: Role): SpaceMember {
  const spaceRole = spaceRoleFor(role)
  const { canRead, canWrite, canManage } = SPACE_ROLES[spaceRole]
  return { person, role: spaceRole, canRead, canWrite, canManage }
}

/** `role` as a paired space's member has it, managing nothing there:  at most an editor (`MOST_FOR_A_MEMBER`). */
function atMostAnEditor(role: Role): SpaceRole {
  const spaceRole = spaceRoleFor(role)
  return spaceRole === ORG_MANAGER_ROLE ? MOST_FOR_A_MEMBER : spaceRole
}

/** Is `role` one of the people library's roles? */
function isRole(role: unknown): role is Role {
  return (Membership.Roles as readonly unknown[]).includes(role)
}

/** `role` with its article, for a message:  `a viewer`, `an editor`, `a manager`. */
function withArticle(role: string): string {
  return `${/^[aeiou]/i.test(role) ? "an" : "a"} ${role}`
}

/** The space role `role` is:  an older word read as its new one.  - throws `HttpError(400)` for a role that isn't one */
function roleOrDie(role: unknown): SpaceRole {
  if (!isRole(role)) throw new SRV.HttpError(400, `send a role, one of ${Object.keys(SPACE_ROLES).join(", ")}`)
  return spaceRoleFor(role)
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
  if (typeof person !== "string" || !SP.SpellLocation.isAccount(person)) {
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
  const account = SP.SpellLocation.accountParts(space)
  return account
    ? { address: space, person: account.id, org: account.org }
    : { address: space, org: space.replace(/^@/, "") }
}
