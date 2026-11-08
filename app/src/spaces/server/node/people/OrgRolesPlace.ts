import { SRV } from "spell/server"
import {
  ORG_ROLES_ADDRESS,
  PlaceError,
  type ApplyAnswer,
  type ChangesAnswer,
  type ListAnswer,
  type ListQuery,
  type Place,
  type PlaceCapabilities,
  type PlaceChange,
  type PlaceContext,
  type PlaceRow
} from "spell/places/places.types"
import { SPACE_ROLES, type SpaceRole } from "spell/app/spaces/models/people"
import type { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"
import type { SpaceMembers } from "spell/app/spaces/server/node/places/SpaceMembers"
import type { EventProgram, OrgEvent, OrgEvents } from "./OrgEvents"
import { BY_SPELL, type DesignGrant, type OrgRoles, type RoleChange, type TermGrant, type TermView } from "./OrgRoles"

/**
 * The collections an org's roles place holds, each a program's type's plural (`a "member" is a thing`):
 * - `members`:  who's in the org, by address, and their membership's role
 * - `teams`, `projects`:  its standing teams, and its projects, each by its folder
 * - `org_roles`:  its roles, each by its key, read only but its name
 * - `terms`:  who holds which role of what, and when;  read are only the ones not ended
 * - `approved_apps`:  the apps its Admins approved, each at one version
 * - `designers`:  who designs which of its spaces, whatever their role there (`person`, `space`;  T47)
 * - `role_changes`:  its log, every change, oldest first, read only:  `who` made it, `did` what, `what` about, `why`
 * - `events`:  its events (`OrgEvents`, epic `atmosphere` P32), each by its folder:  its `name`, `team`, `organizers`
 *   (addresses, comma-separated), who `proposed` it, its `stage` (key) and `stageName`, and the stage it moves to
 *   next (`onward`, `onwardName`;  "" at the last)
 * - `event_stages`:  its event program's stages, in order, read only:  each by its key, its `name`, the stages it
 *   moves to (`movesTo`) and who moves an event into it (`movedBy`)
 */
export const ORG_ROLES_COLLECTIONS = [
  "members",
  "teams",
  "projects",
  "org_roles",
  "terms",
  "approved_apps",
  "designers",
  "role_changes",
  "events",
  "event_stages"
] as const

/** One of an org's roles place's collections:  see `ORG_ROLES_COLLECTIONS`. */
export type OrgRolesCollection = (typeof ORG_ROLES_COLLECTIONS)[number]

/** What it can do:  every list whole, in one answer;  each write one change of the org's roles, checked by its rules. */
const CAPABILITIES: PlaceCapabilities = {
  kind: "org's roles",
  idOf: "id",
  makesIds: true,
  filter: "none",
  sort: "none",
  select: "none",
  page: "none",
  write: ["insert", "update", "delete"],
  whoWrites: "its members",
  atomic: false,
  live: "poll",
  abort: "soft",
  identifiesBy: "this machine"
}

/** The space role a person added on the page takes in the org, unless the page names another (Q21 D:  a member). */
const NEW_MEMBER_ROLE: SpaceRole = "editor"

/** Splits a change token's parts:  the log's length, then each id (`changesSince()`). */
const TOKEN_SEPARATOR = "\n"

/** Splits a term's id into its role, its holder, what it manages and its start day (`termIdOf()`). */
const TERM_ID_SEPARATOR = "~"

/****************
 * ### `OrgRolesPlace`
 * An org's roles as a PLACE (epic `atmosphere` P25):  what its Admin page, a Spell program, reads and writes, the same
 * way every program reads and writes a space's data folder.
 *
 * ```spell
 * admin roles is a data folder at "@rs/__admin/roles"
 * ```
 *
 * - Served by the app's `SpaceFolders`, at that address, and at `@rs/__admin/events` for the org's events page under the one route (`/api/places/spaces/@rs/__admin/roles`):
 *   no route of its own.
 * - Its collections:  `ORG_ROLES_COLLECTIONS`, each row with an `id`.
 * - Every write is ONE change of the org's roles, made through `OrgRoles`, so its rules hold here as anywhere:
 *   a Project Manager can't end a Team Manager's term from the page either.
 *   - `members`:  an insert adds someone to the org (`SpaceMembers.add()` on its shared space, the Board's and the
 *     Admins'), logged as they `"join"`;  a delete is their leaving it (`OrgRoles.leave()`)
 *   - `teams`:  an insert or update adds or renames one (`addTeam()`);  `projects`:  an insert adds one (`addProject()`)
 *   - `org_roles`:  an update renames one (`defineRole()`)
 *   - `terms`:  an insert gives one (`give()`), a delete ends it (`end()`):  its record stays, in the log
 *   - `approved_apps`:  an insert or update approves an app at its version (`approveApp()`), a delete takes it off the list
 *   - `designers`:  an insert lets someone design a space (`giveDesign()`), a delete ends it (`endDesign()`)
 *   - `events`:  an insert proposes one (`OrgEvents.propose()`), an update of its `stage` moves it (`move()`)
 *   - anything else, a `role_changes` write, a term changed in place:  refused, `"place"`
 * - Who's asking (`PlaceContext.identity`) is who the change is BY, in the log.
 * - Who READS it:  anyone in the org, and its Board and Admins;  anyone else reads none of it (`mayRead()`).
 * - Its refusals are `PlaceError`s:  `OrgRoles`' 403 a `"refused"`, `"role"`;  404 `"not found"`;  any other,
 *   `"refused"`, `"place"`, each with `OrgRoles`' own words.
 * - Node only;  knows nothing of pages:  the Admin page is the built-in program `@spell/examples/OrgAdmin`.
 ****************/
export class OrgRolesPlace implements Place {
  /** Its org's id:  `rs`. */
  readonly org: string
  /** Who manages what in the org. */
  private readonly orgRoles: OrgRoles
  /** The org's events. */
  private readonly events: OrgEvents
  /** People, orgs and rosters. */
  private readonly people: PeopleStore
  /** The org's own shared space's members:  who joins it joins the org. */
  private readonly orgMembers: SpaceMembers

  constructor({ org, orgRoles, events, people, orgMembers }: OrgRolesPlaceProps) {
    this.org = org
    this.orgRoles = orgRoles
    this.events = events
    this.people = people
    this.orgMembers = orgMembers
  }

  /** The org whose roles place `address` is (`@rs/__admin/roles` => `rs`):  `undefined` for any other address. */
  static orgAt(address: string): string | undefined {
    return ORG_ROLES_ADDRESS.exec(address)?.[1]
  }

  /** What it can do:  see the class. */
  describe(): PlaceCapabilities {
    return CAPABILITIES
  }

  ////////////////
  // ## Reading
  ////////////////

  /**
   * Every row of `collection`, as the org has it now.
   * - None for anyone outside the org (`mayRead()`).
   * - throws `PlaceError` `"not found"` for no such collection;  `"no such place"` for an org with no Admin space
   */
  async list(collection: string, _query: ListQuery, { identity }: PlaceContext = {}): Promise<ListAnswer> {
    const rows = (await this.mayRead(identity)) ? await this.rowsOf(collectionOrDie(collection)) : []
    return { rows, handled: {}, version: await this.tokenFor(rows) }
  }

  /**
   * What changed in `collection` since `token` (a list's `version`, or an earlier answer's `token`):
   * nothing while the org's log hasn't moved;  else every row, and the ids gone since.
   * - The token is the log's length and the ids it saw:  an org's roles are small.
   */
  async changesSince(collection: string, token: string, { identity }: PlaceContext = {}): Promise<ChangesAnswer> {
    const rows = (await this.mayRead(identity)) ? await this.rowsOf(collectionOrDie(collection)) : []
    const now = await this.tokenFor(rows)
    if (now === token) return { rows: [], removed: [], token }
    const [, ...before] = token.split(TOKEN_SEPARATOR)
    const ids = new Set(rows.map((row) => `${row.id}`))
    return { rows, removed: before.filter((id) => !ids.has(id)), token: now }
  }

  /** `rows`' token:  the org's log's length, then their ids (`changesSince()`). */
  private async tokenFor(rows: readonly PlaceRow[]): Promise<string> {
    const logged = (await this.orgRoles.log(this.org)).length
    return [logged, ...rows.map((row) => `${row.id}`)].join(TOKEN_SEPARATOR)
  }

  /** The rows of `collection`, by what it is:  see `ORG_ROLES_COLLECTIONS`. */
  private async rowsOf(collection: OrgRolesCollection): Promise<PlaceRow[]> {
    const { org } = this
    const roster = await this.people.roster(org)
    if (!roster) throw new PlaceError(`@${org} has no Admin space yet`, { cause: { kind: "no such place" } })
    if (collection === "members") {
      const members = (await this.people.org(org))?.members.items ?? []
      return members.flatMap((each) => {
        const person = each.person && this.people.addressOf(each.person)
        return person ? [{ id: person, person, name: each.person?.names ?? "", role: each.role }] : []
      })
    }
    if (collection === "teams") return roster.teams.items.map((team) => ({ id: team.folder, name: team.name }))
    if (collection === "projects") {
      return roster.projects.items.map((project) => ({
        id: project.folder,
        name: project.name,
        team: project.team?.folder ?? ""
      }))
    }
    if (collection === "org_roles") {
      return roster.roles.items.map((role) => ({ id: role.key, name: role.name, manages: role.manages }))
    }
    if (collection === "terms") return (await this.orgRoles.terms(org)).map(termRowOf)
    if (collection === "approved_apps")
      return (await this.orgRoles.approvedApps(org)).map((app) => ({ id: app.name, ...app }))
    if (collection === "designers") return (await this.orgRoles.designers(org)).map(designerRowOf)
    if (collection === "events") {
      const program = await this.events.program(org)
      return (await this.events.events(org)).map((each) => eventRowOf(each, program))
    }
    if (collection === "event_stages") {
      return (await this.events.program(org)).stages.map((each) => ({
        id: each.key,
        name: each.name,
        movesTo: each.next.join(", "),
        movedBy: each.movedBy
      }))
    }
    return (await this.orgRoles.log(org)).map(changeRowOf)
  }

  ////////////////
  // ## Writing
  ////////////////

  /**
   * Make each change, in turn, as one change of the org's roles each:  see the class.
   * - Not all or nothing:  each one made stays, as it's logged.
   * - throws `PlaceError` for the first one refused
   */
  async apply(changes: readonly PlaceChange[], { identity }: PlaceContext = {}): Promise<ApplyAnswer> {
    const rows: PlaceRow[] = []
    for (const change of changes) {
      const row = await placeErrorOf(() => this.make(change, identity))
      if (row) rows.push(row)
    }
    return { rows }
  }

  /** Make one change:  the row it leaves, for an insert or an update. */
  private async make(change: PlaceChange, by: string | undefined): Promise<PlaceRow | undefined> {
    const { org } = this
    const why = { ...(by !== undefined && { by }) }
    const { kind, id = "", fields = {} } = change
    const text = (field: string) => (typeof fields[field] === "string" ? (fields[field] as string).trim() : "")
    const collection = collectionOrDie(change.collection)
    const writes = kind === "delete" ? "remove" : "add or change"

    if (collection === "members" && kind === "insert") {
      const person = text("person") || id
      await this.orgManagerOrDie(by, `add people to @${org}`)
      const role = (Object.keys(SPACE_ROLES) as SpaceRole[]).find((each) => each === text("role")) ?? NEW_MEMBER_ROLE
      await this.orgMembers.add(person, role)
      await this.orgRoles.logChange(org, { action: "join", by: by ?? BY_SPELL, person })
      await this.orgRoles.changed(org)
      return { ...fields, id: person, person }
    }
    if (collection === "members" && kind === "delete") {
      await this.orgRoles.leave(org, id, why)
      return undefined
    }
    if (collection === "teams" && kind !== "delete") {
      const folder = text("folder") || folderFor(text("name")) || id
      await this.orgRoles.addTeam(org, { id: folder, name: text("name") || folder }, why)
      return { id: folder, name: text("name") || folder }
    }
    if (collection === "projects" && kind === "insert") {
      const folder = text("folder") || folderFor(text("name")) || id
      const team = text("team") || undefined
      await this.orgRoles.addProject(org, { id: folder, name: text("name") || folder, ...(team && { team }) }, why)
      return { id: folder, name: text("name") || folder, team: team ?? "" }
    }
    if (collection === "org_roles" && kind === "update") {
      await this.orgRoles.defineRole(org, { id, name: text("name") }, why)
      return { id, name: text("name") }
    }
    if (collection === "terms" && kind === "insert") {
      const grant = grantOf(fields)
      await this.orgRoles.give(org, grant, why)
      return termRowOf({ ...viewOfGrant(grant) })
    }
    if (collection === "terms" && kind === "delete") {
      await this.orgRoles.end(org, grantOfId(id), why)
      return undefined
    }
    if (collection === "approved_apps" && kind !== "delete") {
      const app = { name: text("name") || id, version: text("version") }
      await this.orgRoles.approveApp(org, app, why)
      return { id: app.name, ...app }
    }
    if (collection === "approved_apps" && kind === "delete") {
      await this.orgRoles.unapproveApp(org, id, why)
      return undefined
    }
    if (collection === "designers" && kind === "insert") {
      const grant = { person: text("person"), space: text("space") }
      await this.orgRoles.giveDesign(org, grant, why)
      return designerRowOf(grant)
    }
    if (collection === "designers" && kind === "delete") {
      const [person = "", space = ""] = id.split(TERM_ID_SEPARATOR)
      await this.orgRoles.endDesign(org, { person, space }, why)
      return undefined
    }
    if (collection === "events" && kind === "insert") {
      const name = text("name")
      const proposal = {
        id: text("folder") || folderFor(name) || id,
        name,
        organizers: text("organizers")
          .split(",")
          .map((each) => each.trim())
          .filter(Boolean),
        ...(text("team") && { team: text("team") })
      }
      const event = await this.events.propose(org, proposal, why)
      return eventRowOf(event, await this.events.program(org))
    }
    if (collection === "events" && kind === "update" && text("stage")) {
      const event = await this.events.move(org, id, text("stage"), why)
      return eventRowOf(event, await this.events.program(org))
    }
    throw new PlaceError(`@${org}'s ${collection}:  the Admin page can't ${writes} one this way`, {
      cause: { kind: "refused", whyNot: "place" }
    })
  }

  ////////////////
  // ## Who may
  ////////////////

  /**
   * May `identity` read the org's roles:  someone in the org, or its Board and Admins?
   * - Anyone else reads NONE of it, rather than a refusal:  a page opened before its person signs in reads again once
   *   they have, and its checks for changes keep going.
   */
  private async mayRead(identity: string | undefined): Promise<boolean> {
    if (identity === undefined || (await this.orgRoles.isInOrg(this.org, identity))) return true
    return await this.isOrgManager(identity)
  }

  /** - throws `PlaceError` `"refused"`, `"role"`, for anyone but the Board and the Admins, who manage the org's shared space */
  private async orgManagerOrDie(by: string | undefined, what: string): Promise<void> {
    if (by === undefined || (await this.isOrgManager(by))) return
    throw new PlaceError(`Only @${this.org}'s Board and Admins ${what}`, {
      cause: { kind: "refused", whyNot: "role", needs: "manager" }
    })
  }

  /** Does `who` manage the org's own shared space:  its Board, its Admins? */
  private async isOrgManager(who: string): Promise<boolean> {
    const space = { org: this.org, of: { kind: "the-org" as const }, side: "shared" as const, address: `@${this.org}` }
    return (await this.orgRoles.managersOfSpace(space)).includes(who)
  }
}

/** Constructor props of `OrgRolesPlace`. */
export type OrgRolesPlaceProps = {
  /** The org's id:  `rs`. */
  org: string
  /** Who manages what, the one every folder's members ask (`SpaceFolders.orgRoles`). */
  orgRoles: OrgRoles
  /** The org's events (`SpaceFolders.events`). */
  events: OrgEvents
  /** People, orgs and rosters. */
  people: PeopleStore
  /** The org's own shared space's members (`@rs`):  who joins it joins the org. */
  orgMembers: SpaceMembers
}

////////////////
// ## Helpers
////////////////

/** - throws `PlaceError` `"not found"` for a collection it hasn't */
function collectionOrDie(collection: string): OrgRolesCollection {
  if ((ORG_ROLES_COLLECTIONS as readonly string[]).includes(collection)) return collection as OrgRolesCollection
  throw new PlaceError(`an org's roles have no "${collection}":  ${ORG_ROLES_COLLECTIONS.join(", ")}`, {
    cause: { kind: "not found" }
  })
}

/** Run `make`, turning what `OrgRoles` throws into the `PlaceError` a page reads:  see the class. */
async function placeErrorOf<T>(make: () => Promise<T>): Promise<T> {
  try {
    return await make()
  } catch (error) {
    if (!(error instanceof SRV.HttpError)) throw error
    if (error.status === 403) {
      throw new PlaceError(error.message, { cause: { kind: "refused", whyNot: "role", needs: "manager" } })
    }
    if (error.status === 404) throw new PlaceError(error.message, { cause: { kind: "not found" } })
    throw new PlaceError(error.message, { cause: { kind: "refused", whyNot: "place" } })
  }
}

/**
 * A change of the log as a row:  `who` made it (never `by`, a place's own field), `did` what, `what` it was about, in
 * one line, and `why`;  its `id` its place in the log.
 */
function changeRowOf(change: RoleChange, index: number): PlaceRow {
  const { at, by, action, why = "", person, team, role, of, name, project, version, space } = change
  const what = [person ?? team, role, of && `of ${of}`, project, name, version, space].filter(Boolean).join(" ")
  return { id: `${index + 1}`, at: at.slice(0, 16).replace("T", " "), who: by, did: action, what, why }
}

/** A term as a row:  its id says all of it, so a delete names the term (`grantOfId()`). */
function termRowOf(term: TermView): PlaceRow {
  const holder = term.person ?? term.team ?? ""
  const starts = term.start?.slice(0, 10) ?? ""
  const id = [term.role, holder, term.of ?? "", starts].join(TERM_ID_SEPARATOR)
  return { id, role: term.role, holder, manages: term.of ?? "", starts, ends: term.end?.slice(0, 10) ?? "" }
}

/** An event as a row, its stages named as `program` names them:  its organizers comma-separated. */
function eventRowOf(event: OrgEvent, program: EventProgram): PlaceRow {
  const { id, name, team = "", organizers, proposedBy, stage } = event
  const nameOf = (key: string) => program.stages.find((each) => each.key === key)?.name ?? key
  const next = program.stages.find((each) => each.key === stage)?.next[0] ?? ""
  return {
    id,
    name,
    team,
    organizers: organizers.join(", "),
    proposed: proposedBy,
    stage,
    stageName: nameOf(stage),
    onward: next,
    onwardName: next && nameOf(next)
  }
}

/** A designer as a row:  its id their person and space. */
function designerRowOf({ person, space }: DesignGrant): PlaceRow {
  return { id: [person, space].join(TERM_ID_SEPARATOR), person, space }
}

/** The term a page's new row asks for:  `holder` a person's address (`ana@rs`), else a team's folder. */
function grantOf(fields: PlaceRow): TermGrant {
  const text = (field: string) => (typeof fields[field] === "string" ? (fields[field] as string).trim() : "")
  const holder = text("holder")
  const starts = text("starts")
  const ends = text("ends")
  return {
    role: text("role"),
    ...(holder.includes("@") ? { person: holder } : { team: holder }),
    ...(text("manages") && { of: text("manages") }),
    ...(starts && { start: dayOrDie(starts) }),
    ...(ends && { end: dayOrDie(ends) })
  }
}

/** The term a row's id names (`termRowOf()`), for ending it. */
function grantOfId(id: string): TermGrant {
  const [role = "", holder = "", of = ""] = id.split(TERM_ID_SEPARATOR)
  return { role, ...(holder.includes("@") ? { person: holder } : { team: holder }), ...(of && { of }) }
}

/** A grant as it'll show, before `OrgRoles` has it:  its start today when it names none. */
function viewOfGrant({ role, person, team, of, start = new Date(), end }: TermGrant): TermView {
  return {
    role,
    ...(person && { person }),
    ...(team && { team }),
    ...(of && { of }),
    start: start.toISOString(),
    ...(end && { end: end.toISOString() })
  }
}

/** - throws `PlaceError` `"refused"`, `"field"`, for a day that isn't one:  `2027-06-30` */
function dayOrDie(day: string): Date {
  const date = new Date(day)
  if (Number.isNaN(date.getTime())) {
    throw new PlaceError(`"${day}" isn't a day:  write it 2027-06-30`, { cause: { kind: "refused", whyNot: "field" } })
  }
  return date
}

/** A team's or project's folder, from its name:  "Events Team" => `events_team`. */
function folderFor(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}
