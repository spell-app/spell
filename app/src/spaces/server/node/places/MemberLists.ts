import { memberAccessFor } from "spell/places/AtProtoSpace"
import type { SpaceMember } from "spell/places/places.types"
import { ADMIN_SPACE, PRIVATE_SPACE } from "spell/app/spaces/models/spaceNames"
import { spaceRoleFor } from "spell/app/spaces/models/people"
import type { OrgRoles } from "spell/app/spaces/server/node/people/OrgRoles"
import type { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"

import type { RealSpace } from "./RealSpace"
import type { SpaceMembers } from "./SpaceMembers"

/** The folders that make a folder a space's own, with a list or settings of its own:  `__members/`, `__settings/`. */
const SPACE_MARKS = ["__members/", "__settings/"]

/** Spaces' own names a space's folder may be under:  the private side, and the Admin space. */
const SPACE_FOLDERS_UNDER = new Set([`${PRIVATE_SPACE}/`, `${ADMIN_SPACE}/`])

/** How deep under an org's folder a space's folder may be:  `@rs/events_team@/2026-q4/__private/notes`. */
const MOST_DEPTH = 5

/****************
 * ### `MemberLists`
 * Each space's member list kept in step with its org's roles (epic `atmosphere` P24), and an AUDIT saying where one
 * isn't.
 *
 * ```ts
 * const lists = new MemberLists({ people, orgRoles, membersAt, realSpaceAt })
 * await lists.follow("rs")    // each real Space of RS:  who should be on it put, who shouldn't taken off
 * await lists.audit("rs")     // [{ address: "events_team@rs/__private/notes", person: "zed@rs", said: "..." }]
 * ```
 *
 * - On Spell's own server the lists are worked out on every read (`SpaceMembers`, P22), so a change counts at once:
 *   nothing to follow.
 * - A space KEPT IN A REAL SPACE (P14) has a list of its own on the host:  `follow()` puts each member with an
 *   AT Protocol account on it, and takes off whoever isn't one any more.
 *   - Asked by `OrgRoles.changed()` as a role or a member changes, through the app's `SpaceFolders`;
 *     and by the daily round (`followAll()`), which catches a term ending on its date.
 *   - The org's own account, the Space's authority, stays on it.
 * - THE AUDIT (`audit()`, `spell space org audit`):  every space whose list differs from what its roles say, and how.
 *   - a term held by someone who isn't in the org any more
 *   - someone the org file calls a manager, who manages nothing by the roles:  an editor in its paired spaces
 *   - a paired space's folder with a list of its own (`__members/`), which doesn't count there
 *   - a real Space whose list isn't Spell's
 * - Its spaces:  every folder under the org's with a list or settings of its own (`SPACE_MARKS`), people's own spaces
 *   in it too;  a folder with neither has the list its address gives it, so nothing to compare.
 * - Node only;  knows no route:  the app's `SpaceFolders` hands it each space's members and real Space.
 ****************/
export class MemberLists {
  /** People, orgs and rosters, and the files under each org's folder. */
  private readonly people: PeopleStore
  /** Who manages what. */
  private readonly orgRoles: OrgRoles
  /** The members of the space at an address:  `undefined` for no space's own folder. */
  private readonly membersAt: MemberListsProps["membersAt"]
  /** The real Space the space at an address is kept in:  `undefined` for none. */
  private readonly realSpaceAt: MemberListsProps["realSpaceAt"]

  constructor({ people, orgRoles, membersAt, realSpaceAt }: MemberListsProps) {
    this.people = people
    this.orgRoles = orgRoles
    this.membersAt = membersAt
    this.realSpaceAt = realSpaceAt
  }

  ////////////////
  // ## Following
  ////////////////

  /**
   * SIDE EFFECT:  bring each real Space of org `org` into step with its list:  who should be on it put, with what they
   * may do;  who shouldn't, taken off.  What it changed.
   * - NEVER throws:  a Space that can't be reached, or says no, is logged, and the next round tries again
   */
  async follow(org: string): Promise<ListChange[]> {
    const changes: ListChange[] = []
    for (const address of await this.spacesOf(org)) {
      try {
        changes.push(...(await this.followSpace(address)))
      } catch (error) {
        console.error(`MemberLists:  ${address}'s Space didn't follow its list;  the next round tries again`, error)
      }
    }
    return changes
  }

  /**
   * SIDE EFFECT:  `follow()` every org with an Admin space:  the daily round's.  What it changed.
   * - NEVER throws
   */
  async followAll(): Promise<ListChange[]> {
    const changes: ListChange[] = []
    for (const org of await this.orgsWithRoles()) changes.push(...(await this.follow(org)))
    return changes
  }

  ////////////////
  // ## The audit
  ////////////////

  /**
   * Every way org `org`'s lists differ from its roles (see the class), each with its space's address:
   * none when they agree.
   * - A real Space that can't be reached is one too:  nobody knows what its list holds.
   */
  async audit(org: string): Promise<ListDifference[]> {
    const differences: ListDifference[] = [...(await this.auditRoster(org))]
    for (const address of await this.spacesOf(org)) {
      const members = this.membersAt(address)
      if (!members) continue
      differences.push(...(await this.auditOwnList(address, members)))
      differences.push(...(await this.auditRealSpace(address, members)))
    }
    return differences
  }

  /** Terms held by someone not in org `org`, and org-file managers who manage nothing:  none for no Admin space. */
  private async auditRoster(org: string): Promise<ListDifference[]> {
    if (!(await this.people.roster(org))) return []
    const address = `@${org}/${ADMIN_SPACE}`
    const differences: ListDifference[] = []
    const holders = new Set<string>()
    for (const term of await this.orgRoles.terms(org)) {
      if (!term.person) continue
      holders.add(term.person)
      if (await this.orgRoles.isInOrg(org, term.person)) continue
      const of = term.of ? ` of ${term.of}` : ""
      differences.push({
        address,
        person: term.person,
        said: `${term.person} is a ${term.role}${of}, but isn't in @${org}:  end the term, or invite them back`
      })
    }
    for (const each of (await this.people.org(org))?.members.items ?? []) {
      const person = each.person && this.people.addressOf(each.person)
      if (!person || spaceRoleFor(each.role) !== "manager" || holders.has(person)) continue
      differences.push({
        address: `@${org}`,
        person,
        said:
          `@${org}'s org file makes ${person} a manager, but its roles give them nothing to manage:  ` +
          `they're an editor in its spaces;  name them a Manager, or change the org file`
      })
    }
    return differences
  }

  /** A paired space's folder with its own `__members/`, which doesn't count there:  how it differs from its roles. */
  private async auditOwnList(address: string, members: SpaceMembers): Promise<ListDifference[]> {
    const own = await members.ownList()
    if (!own || !(await this.orgRoles.spaceAt(address))) return []
    const said = `its own list (__members) doesn't count here:  its list comes from its org's roles`
    return differencesOf(own, await members.list(), { said: "its own list", is: "its roles" }).map((how) => ({
      address,
      ...how,
      said: `${how.said};  ${said}`
    }))
  }

  /** A real Space whose list isn't Spell's:  who's on one and not the other, or may do something else. */
  private async auditRealSpace(address: string, members: SpaceMembers): Promise<ListDifference[]> {
    let real: RealSpace | undefined
    try {
      real = await this.realSpaceAt(address)
    } catch (error) {
      return [{ address, said: `its real Space can't be reached:  ${(error as Error).message}` }]
    }
    if (!real) return []
    const { put, remove, entries } = await this.stepsFor(real, members)
    const differences: ListDifference[] = []
    for (const member of put) {
      const has = entries.get(member.did)
      differences.push({
        address,
        person: member.person,
        said: has
          ? `${member.person} (${member.did}) may ${accessWords(has)} in its real Space, and should ${accessWords(memberAccessFor(member))}`
          : `${member.person} (${member.did}) isn't on its real Space's list`
      })
    }
    for (const did of remove) {
      differences.push({ address, said: `${did} is on its real Space's list, and isn't a member here` })
    }
    return differences
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** SIDE EFFECT:  bring the real Space at `address` into step with its list.  - throws what its host says */
  private async followSpace(address: string): Promise<ListChange[]> {
    const members = this.membersAt(address)
    const real = members && (await this.realSpaceAt(address))
    if (!members || !real) return []
    const { put, remove } = await this.stepsFor(real, members)
    const changes: ListChange[] = []
    for (const member of put) {
      await real.putMember(member.did, member)
      changes.push({ address, did: member.did, person: member.person, action: "put" })
    }
    for (const did of remove) {
      await real.removeMember(did)
      changes.push({ address, did, action: "remove" })
    }
    return changes
  }

  /**
   * What would bring `real`'s list into step with `members`':  each member with an account not on it, or with other
   * rights, to put;  each account on it that's no member's, but the org's own, to take off.  And its list, by DID.
   */
  private async stepsFor(real: RealSpace, members: SpaceMembers) {
    const entries = new Map((await real.members()).map((entry) => [entry.did, entry]))
    const withAccounts = (await members.listWithAccounts()).filter(
      (member): member is SpaceMember & { did: string } => !!member.did
    )
    const put = withAccounts.filter((member) => {
      const has = entries.get(member.did)
      const should = memberAccessFor(member)
      return !has || has.read !== should.read || has.write !== should.write
    })
    const dids = new Set(withAccounts.map(({ did }) => did))
    const remove = [...entries.keys()].filter((did) => !dids.has(did) && did !== real.orgDid)
    return { put, remove, entries }
  }

  /**
   * Every space's own folder under org `org`'s, by address:  each with a list or settings of its own (`SPACE_MARKS`).
   * - `@rs/minutes`, `@rs/__private/budget`, `events_team@rs/2026-q4/__private/notes`, `ana@rs/recipes`
   */
  private async spacesOf(org: string): Promise<string[]> {
    const storage = this.people.storage
    const found: string[] = []
    const walk = async (path: string, depth: number): Promise<void> => {
      const names = await storage.list(path)
      if (depth && names.some((name) => SPACE_MARKS.includes(name))) found.push(addressFor(org, path))
      if (depth >= MOST_DEPTH) return
      for (const name of names) {
        if (!name.endsWith("/") || (name.startsWith("__") && !SPACE_FOLDERS_UNDER.has(name))) continue
        await walk(`${path}/${name.slice(0, -1)}`, depth + 1)
      }
    }
    await walk(`@${org}`, 0)
    return found
  }

  /** Every org with an Admin space, by id. */
  private async orgsWithRoles(): Promise<string[]> {
    const { orgs } = await this.people.orgs()
    const ids: string[] = []
    for (const { id } of orgs) if (await this.people.roster(id)) ids.push(id)
    return ids
  }
}

/** Constructor props of `MemberLists`. */
export type MemberListsProps = {
  /** People, orgs and rosters, and the files under each org's folder. */
  people: PeopleStore
  /** Who manages what:  the same one each space's members ask. */
  orgRoles: OrgRoles
  /** The members of the space at `address`:  `undefined` for no space's own folder. */
  membersAt: (address: string) => SpaceMembers | undefined
  /**
   * The real Space the space at `address` is kept in:  `undefined` for none.
   * - throws `HttpError(503)` for one this server has no org account to write as
   */
  realSpaceAt: (address: string) => Promise<RealSpace | undefined>
}

/** One change `follow()` made to a real Space's list. */
export type ListChange = {
  /** The space's address. */
  address: string
  /** The account put on its list, or taken off. */
  did: string
  /** Whose, for one put on:  their address. */
  person?: string
  /** Put on (or given other rights), or taken off. */
  action: "put" | "remove"
}

/** One way a space's list differs from what its roles say, as the audit says it. */
export type ListDifference = {
  /** The space's address:  `@rs/__admin` for the roster's own. */
  address: string
  /** Who it's about, by address, when it's a person. */
  person?: string
  /** How, in words:  what to do about it too. */
  said: string
}

/** The address of the folder at `path` under org `org`'s:  `@rs/events_team@/notes` is `events_team@rs/notes`. */
function addressFor(org: string, path: string): string {
  const [, first = "", ...rest] = path.split("/")
  if (first.endsWith("@")) return [`${first}${org}`, ...rest].join("/")
  return [`@${org}`, first, ...rest].join("/")
}

/**
 * How list `said` differs from list `is`, person by person:  someone on one alone, or with another role.
 * - `names`:  what to call each list, in the words
 */
function differencesOf(
  said: SpaceMember[],
  is: SpaceMember[],
  names: { said: string; is: string }
): Omit<ListDifference, "address">[] {
  const roleIn = (list: SpaceMember[], person: string) => list.find((each) => each.person === person)?.role
  const people = [...new Set([...said, ...is].map(({ person }) => person))]
  return people.flatMap((person) => {
    const listed = roleIn(said, person)
    const should = roleIn(is, person)
    if (listed === should) return []
    if (!should) return [{ person, said: `${names.said} has ${person}, as ${listed};  ${names.is} don't` }]
    if (!listed) return [{ person, said: `${names.said} leaves out ${person}, ${names.is} make them ${should}` }]
    return [{ person, said: `${names.said} makes ${person} ${listed};  ${names.is} make them ${should}` }]
  })
}

/** What `access` lets someone do, in words:  `read and write`, `read`, or `nothing`. */
function accessWords({ read, write }: { read: boolean; write: boolean }): string {
  if (read && write) return "read and write"
  if (read) return "read"
  return write ? "write" : "do nothing"
}
