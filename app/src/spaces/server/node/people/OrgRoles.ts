import { SRV } from "spell/server"
import { SP } from "spell/parser/spell"
import { ADMIN_SPACE, INBOX_SPACE, PRIVATE_SPACE } from "spell/app/spaces/models/spaceNames"
import type { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"
import { readJSON5, writeJSON5 } from "spell/app/spaces/server/node/storage/json5"
import * as People from "spell/app/spaces/@spell/library/people/people.lib.ts"

/** The log of every change to an org's roles, in its Admin space:  `@rs/__admin/log.json5`. */
const LOG_FILE = "log.json5"

/** The apps an org's Admins approved, in its Admin space:  `@rs/__admin/apps.json5` (epic `atmosphere` P23). */
const APPS_FILE = "apps.json5"

/** An org's policies, in its Admin space:  `@rs/__admin/policy.json5`, how many versions it keeps (epic `atmosphere` P26). */
const POLICY_FILE = "policy.json5"

/**
 * Who DESIGNS which of an org's spaces, in its Admin space:  `@rs/__admin/designers.json5` (epic `atmosphere` T47).
 */
const DESIGNERS_FILE = "designers.json5"

/** Who a change was made by when Spell's own tools made it, trusted:  no person. */
export const BY_SPELL = "spell"

/**
 * The roles every org starts with (the Spaces guide's "Who manages what"), by id:  what each one manages.
 * - An org may rename them (`name`), and say who's eligible;  never change what they manage.
 * - The Board are the org's Org Managers:  it manages the org, every space in it (Q28).
 */
const BUILT_IN_ROLES = {
  board: { name: "Board", manages: "the-org" },
  admins: { name: "Admins", manages: "the-admin-space" },
  "team-manager": { name: "Team Manager", manages: "a-team" },
  "project-manager": { name: "Project Manager", manages: "a-project" }
} as const satisfies Record<string, { name: string; manages: People.Manages }>

/****************
 * ### `OrgRoles`
 * Who manages what in an org (epic `atmosphere` P20, Q28):  the Board, the Admins, Team Managers and Project Managers,
 * each for a while, kept in the org's Admin space and always looked up, never copied.
 *
 * ```ts
 * const roles = new OrgRoles({ people })
 * await roles.setUp("rs", { board: "ana@rs" })
 * await roles.addTeam("rs", { id: "events_team", name: "Events Team" }, { by: "ana@rs" })
 * await roles.give("rs", { role: "team-manager", person: "bo@rs", of: "events_team" }, { by: "ana@rs" })
 * await roles.managersOf("rs", "events_team")  // ["ana@rs", "bo@rs"]:  the Board, and the team's Manager
 * ```
 *
 * - An org's ROSTER (the people library's `Roster`), in its Admin space, `@rs/__admin/roster.json5`:
 *   - each role found by its `key`, each team and project by its `folder`:  a thing kept inside the roster keeps
 *     its `id` only while something else refers to it (the core's `Saver`), so the id can't be what finds it
 *   - its roles (`OrgRole`):  the four built in (`BUILT_IN_ROLES`), renamed as it likes, and its own
 *   - its standing teams, and its projects, each under a team or the org itself, never under another project
 *   - its TERMS:  a person, or a whole team, holding a role from a day, until a day, if it ends
 * - Its PAIRED SPACES (`spaceAt()`, epic `atmosphere` P22):  the org, the Admins, each team and each project has two,
 *   a shared one everyone in the org reads and a private one only its Managers reach (`PairedSpace`).
 * - Who MANAGES each (`managersOfSpace()`;  `managersOf()` by a team's or project's folder), today:
 *   - the Board:  every space, the Admin space and the org's private one too
 *   - the Admins:  the Admin space and every other, but the org's private one
 *   - a team's Team Managers:  its spaces, and those of every project under it
 *   - a project's Project Managers:  its spaces
 *   - a team holding a term:  the people on it today, its Team Managers
 * - Its RULES, checked as a role changes:
 *   - who may name or end a term:  whoever manages what its role manages, or anything above it;  only the Board, the Board
 *     - so a Project Manager can never remove the Board, the Admins or a Team Manager
 *   - who's eligible:  the role's own people and teams, when it names any;  else anyone in the org
 *   - teams, projects and the roles themselves:  the Board and the Admins;  a team's Managers add projects under it
 * - Every change is LOGGED, who, when and why, in the takedown log's shape:  `@rs/__admin/log.json5` (`log()`).
 *   - Ending a term keeps it, its end day set:  the record of who held a role stays.
 * - LEAVING the org (`leave()`, epic `atmosphere` P24):  every term they hold ends that day, and they leave its org
 *   file, so they're off every list at once;  what they wrote stays the org's.
 * - Each change TELLS `onChange` (`changed()`):  the app's `SpaceFolders` brings each real Space's list into step
 *   (`MemberLists`).  A term ending by its date tells nobody:  the daily round catches it.
 * - `by`:  who's asking, a person's address;  none for Spell's own tools, trusted.
 * - An org with no Admin space (the family cookbook) has no roster:  its spaces use their three roles alone.
 * - Node only;  reads and writes through the people store, so a person named is the one in their own file.
 * - Knows nothing of spaces' members:  `SpaceMembers` asks it, and makes each of a space's Managers its manager.
 ****************/
export class OrgRoles {
  /** People, orgs and rosters. */
  private readonly people: PeopleStore
  /** When it is:  a test's clock. */
  private readonly now: () => Date
  /** Told of each change to an org's roles or members, by its id. */
  private readonly onChange: OrgRolesProps["onChange"]

  constructor({ people, now = () => new Date(), onChange }: OrgRolesProps) {
    this.people = people
    this.now = now
    this.onChange = onChange
  }

  ////////////////
  // ## Who manages what
  ////////////////

  /**
   * Every person managing the space `folder` of org `org` today, by address (see the class):  the org's own, without.
   * - None for an org with no Admin space.
   */
  async managersOf(org: string, folder?: string): Promise<string[]> {
    const roster = await this.people.roster(org)
    return roster ? this.managersIn(roster, scopeOf(roster, folder)) : []
  }

  /** Does `who` (`ana@rs`) manage the space `folder` of org `org` today? */
  async manages(who: string, org: string, folder?: string): Promise<boolean> {
    return (await this.managersOf(org, folder)).includes(who)
  }

  ////////////////
  // ## Paired spaces
  ////////////////

  /**
   * The paired space a folder's `address` is in, in an org with an Admin space (epic `atmosphere` P22):
   * its owner, which side, and its own address.  See `PairedSpace`.
   * - `@rs/minutes`:  the org's shared space;  `@rs/__private/budget`:  its private one
   * - `@rs/__admin/notes`:  the Admins' private space, the Admin space;  `admins@rs/requests`:  their shared one,
   *   where anyone in the org may ask them for something
   * - `events_team@rs/welcome`:  the Events Team's shared space;  `events_team@rs/__private/notes`:  its private one
   * - `events_team@rs/2026-q4/welcome`:  the project 2026-q4's, under its team;  `picnic@rs/...`:  one under the org
   * - `undefined`:  an org with no Admin space, or a person's own space (`ana@rs/recipes`)
   * - The roster wins:  a person whose id is a team's folder (`events_team@rs`) has no space of their own in it.
   */
  async spaceAt(address: string): Promise<PairedSpace | undefined> {
    const [head = "", next, after] = address.split("/")
    if (head.startsWith("@")) {
      const org = head.slice(1)
      if (!(await this.people.roster(org))) return undefined
      if (next === ADMIN_SPACE)
        return { org, of: { kind: "the-admin-space" }, side: "private", address: `${head}/${next}` }
      return sideOf({ org, of: { kind: "the-org" } }, head, next)
    }
    const account = SP.SpellLocation.accountParts(head)
    const roster = account && (await this.people.roster(account.org))
    if (!account || !roster) return undefined
    const { id, org } = account
    if (id === ADMINS_SHARED) return sideOf({ org, of: { kind: "the-admin-space" } }, head, next)
    const team = roster.teams.items.find((each) => each.folder === id)
    const inTeam = team && roster.projects.items.find((each) => each.team === team && each.folder === next)
    if (inTeam) return sideOf({ org, of: { kind: "a-project", folder: inTeam.folder } }, `${head}/${next}`, after)
    if (team) return sideOf({ org, of: { kind: "a-team", folder: id } }, head, next)
    const project = roster.projects.items.find((each) => !each.team && each.folder === id)
    if (project) return sideOf({ org, of: { kind: "a-project", folder: id } }, head, next)
    return undefined
  }

  /**
   * The org's OWN SPACE of one of its people (epic `atmosphere` P28):  `ana@rs/about` is Ana's, in RS.
   * - Hers to make pages in:  her "About me", "Services I offer";  everyone in the org reads it (`SpaceMembers`).
   * - `{ org, person }`:  a person's account in an org with an Admin space, which no paired space claims (`spaceAt()`:
   *   the roster wins, so `events_team@rs` is the team's)
   * - `undefined`:  anything else, an org with no Admin space among them (the family cookbook's people);
   *   its private side, `ana@rs/__private/...`;  and her inbox, `ana@rs/__inbox` (`inboxAt()`, P29)
   */
  async memberSpaceAt(address: string): Promise<MemberSpace | undefined> {
    const [head = "", next] = address.split("/")
    if (next === PRIVATE_SPACE || next === INBOX_SPACE) return undefined
    const account = SP.SpellLocation.accountParts(head)
    if (!account || !(await this.people.roster(account.org))) return undefined
    if (await this.spaceAt(address)) return undefined
    return { org: account.org, person: head }
  }

  /**
   * The INBOX a folder's `address` is, a person's in an org with an Admin space (epic `atmosphere` P29, Q23 A):
   * `ana@rs/__inbox`, where Spell writes the messages people in RS send her.
   * - `{ org, person }`:  the person, `ana@rs`, as `memberSpaceAt()` finds her own space
   * - `undefined`:  any other address, an org with no Admin space among them, and a team's or a project's
   *   (`events_team@rs/__inbox`):  only people have inboxes
   */
  async inboxAt(address: string): Promise<MemberSpace | undefined> {
    const [head = "", next] = address.split("/")
    if (next !== INBOX_SPACE) return undefined
    return this.memberSpaceAt(head)
  }

  /** The Board and the Admins of org `org`, by address:  who may delete what's in a person's own space, never edit it. */
  async boardAndAdmins(org: string): Promise<string[]> {
    const roster = await this.people.roster(org)
    return roster ? this.managersIn(roster, { kind: "the-admin-space" }) : []
  }

  /**
   * Every person managing the paired space `space` today, by address:
   * - the org's shared space:  the Board and the Admins;  its private one:  the Board alone
   * - the Admins' two:  the Board and the Admins
   * - a team's two:  the Board, the Admins and its Team Managers
   * - a project's two:  the Board, the Admins, its team's Managers and its Project Managers
   */
  async managersOfSpace(space: PairedSpace): Promise<string[]> {
    const roster = await this.people.roster(space.org)
    if (!roster) return []
    const { of, side } = space
    if (of.kind === "the-org") return this.managersIn(roster, side === "private" ? { kind: "the-org" } : SHARED_SCOPE)
    if (of.kind === "the-admin-space") return this.managersIn(roster, { kind: "the-admin-space" })
    return this.managersIn(roster, scopeOf(roster, of.folder))
  }

  /** Org `org`'s terms that haven't ended, today, each its role's id, its holder and what it manages. */
  async terms(org: string): Promise<TermView[]> {
    const roster = await this.people.roster(org)
    if (!roster) return []
    return roster.terms.items.filter((term) => this.isHeld(term)).map((term) => this.viewOf(term))
  }

  /** Is `who` (`ana@rs`) a member of org `org`, by its org file? */
  async isInOrg(org: string, who: string): Promise<boolean> {
    const { members } = (await this.people.org(org)) ?? {}
    return !!members?.items.some((each) => each.person && this.people.addressOf(each.person) === who)
  }

  /** Every change to org `org`'s roles, oldest first:  none for an org with no Admin space. */
  async log(org: string): Promise<RoleChange[]> {
    const said = await readJSON5<{ changes?: RoleChange[] }>(this.people.storage, logFile(org)).catch(() => undefined)
    return said?.changes ?? []
  }

  ////////////////
  // ## Approved apps
  ////////////////

  /**
   * The apps org `org`'s Admins approved, each at one version:  the only ones a space of the org installs
   * (epic `atmosphere` P23;  `SpaceMembers.changeOrDie()`).  None for an org with no Admin space.
   */
  async approvedApps(org: string): Promise<ApprovedApp[]> {
    const said = await readJSON5<{ apps?: ApprovedApp[] }>(this.people.storage, appsFile(org)).catch(() => undefined)
    return (said?.apps ?? []).filter((app) => typeof app?.name === "string" && typeof app.version === "string")
  }

  /**
   * SIDE EFFECT:  approve `app` at its version for org `org`, in place of any other version of it;  logged.
   * - throws `HttpError(403)` for anyone but the Board and the Admins;  as `rosterOrDie()`
   */
  async approveApp(org: string, app: ApprovedApp, why: RoleWhy): Promise<void> {
    const roster = await this.rosterOrDie(org)
    await this.mayOrDie(roster, why, { kind: "the-admin-space" }, "approve apps")
    const others = (await this.approvedApps(org)).filter((each) => each.name !== app.name)
    await writeJSON5(this.people.storage, appsFile(org), {
      apps: [...others, { name: app.name, version: app.version }]
    })
    await this.logChange(org, { action: "approve app", by: why.by ?? BY_SPELL, ...appOf(app), why: why.why })
  }

  /**
   * SIDE EFFECT:  take app `name` off org `org`'s approved list;  logged.  Spaces that installed it keep it.
   * - throws `HttpError(403)` for anyone but the Board and the Admins;  as `rosterOrDie()`
   */
  async unapproveApp(org: string, name: string, why: RoleWhy): Promise<void> {
    const roster = await this.rosterOrDie(org)
    await this.mayOrDie(roster, why, { kind: "the-admin-space" }, "approve apps")
    const apps = (await this.approvedApps(org)).filter((each) => each.name !== name)
    await writeJSON5(this.people.storage, appsFile(org), { apps })
    await this.logChange(org, { action: "unapprove app", by: why.by ?? BY_SPELL, name, why: why.why })
  }

  ////////////////
  // ## Policy
  ////////////////

  /**
   * Org `org`'s policies, from its Admin space (epic `atmosphere` P26):  `{}` until it says, or with no Admin space.
   * - `versionsKept`:  how many versions of each project Publish keeps;  unsaid, every one (`ProjectDrafts`).
   */
  async policy(org: string): Promise<OrgPolicy> {
    const said = await readJSON5<OrgPolicy>(this.people.storage, policyFile(org)).catch(() => undefined)
    const kept = said?.versionsKept
    return typeof kept === "number" && kept > 0 ? { versionsKept: Math.floor(kept) } : {}
  }

  /**
   * SIDE EFFECT:  set org `org`'s policies, in place of what it said;  logged.
   * - throws `HttpError(403)` for anyone but the Board and the Admins;  as `rosterOrDie()`
   */
  async setPolicy(org: string, policy: OrgPolicy, why: RoleWhy): Promise<void> {
    const roster = await this.rosterOrDie(org)
    await this.mayOrDie(roster, why, { kind: "the-admin-space" }, "set the org's policy")
    await writeJSON5(this.people.storage, policyFile(org), policy)
    await this.logChange(org, { action: "policy", by: why.by ?? BY_SPELL, ...policy, why: why.why })
  }

  ////////////////
  // ## Designers
  ////////////////

  /**
   * Who DESIGNS which of org `org`'s spaces (epic `atmosphere` T47, J117):  drafts and saves the pages and source of
   * the projects in it, though their role there may be a viewer.
   * - A space role decides a space's DATA;  this decides its PROGRAM (`canDesign`), person by person.
   * - A space's Managers design it by their role:  they're not listed.
   * - None for an org with no Admin space.
   */
  async designers(org: string): Promise<DesignGrant[]> {
    const said = await readJSON5<{ designers?: DesignGrant[] }>(this.people.storage, designersFile(org)).catch(
      () => undefined
    )
    return (said?.designers ?? []).filter((each) => typeof each?.person === "string" && typeof each.space === "string")
  }

  /**
   * Does `person` design the paired space `space`, by the org's say (`designers()`)?
   * - A grant covers both its sides:  a project's drafts are kept in the private one (`ProjectDrafts`).
   */
  async designs(person: string, space: PairedSpace): Promise<boolean> {
    const shared = sharedAddressOf(space.address)
    return (await this.designers(space.org)).some((each) => each.person === person && each.space === shared)
  }

  /**
   * SIDE EFFECT:  let `grant.person` design `grant.space`, a paired space's shared address (`picnic@rs`);  logged.
   * - throws `HttpError(400)` for a space that's no paired space of the org's, or someone who isn't in it
   * - throws `HttpError(403)` unless `why.by` manages that space, or anything above it
   */
  async giveDesign(org: string, grant: DesignGrant, why: RoleWhy): Promise<void> {
    const { roster, space } = await this.designGrantOrDie(org, grant, why)
    const others = (await this.designers(org)).filter((each) => !sameGrant(each, { ...grant, space }))
    await writeJSON5(this.people.storage, designersFile(org), {
      designers: [...others, { person: grant.person, space }]
    })
    await this.logChange(roster.id, {
      action: "give design",
      by: why.by ?? BY_SPELL,
      person: grant.person,
      space,
      why: why.why
    })
  }

  /**
   * SIDE EFFECT:  `grant.person` no longer designs `grant.space`;  logged.  Their drafts stay, for a Manager to publish
   * or discard.
   * - throws as `giveDesign()`
   */
  async endDesign(org: string, grant: DesignGrant, why: RoleWhy): Promise<void> {
    const { roster, space } = await this.designGrantOrDie(org, grant, why)
    const designers = (await this.designers(org)).filter((each) => !sameGrant(each, { ...grant, space }))
    await writeJSON5(this.people.storage, designersFile(org), { designers })
    await this.logChange(roster.id, {
      action: "end design",
      by: why.by ?? BY_SPELL,
      person: grant.person,
      space,
      why: why.why
    })
  }

  /** - throws as `giveDesign()`;  the org's roster, and the grant's space as its shared address */
  private async designGrantOrDie(org: string, { person, space: _space }: DesignGrant, why: RoleWhy) {
    const roster = await this.rosterOrDie(org)
    const space = sharedAddressOf(_space.trim())
    const paired = await this.spaceAt(`${space}/`)
    if (!paired || paired.org !== org || paired.side !== "shared") {
      throw new SRV.HttpError(400, `${space} is no space of @${org}'s:  name one, as "picnic@rs" or "@${org}"`)
    }
    if (!(await this.isInOrg(org, person))) throw new SRV.HttpError(400, `${person} isn't in @${org}`)
    await this.mayOrDie(roster, why, scopeOfSpace(roster, paired), `say who designs ${space}`)
    return { roster, space }
  }

  ////////////////
  // ## Changing them
  ////////////////

  /**
   * SIDE EFFECT:  give org `org` its Admin space:  a roster with the four built-in roles, and `board` its first Board.
   * - Spell's own tools only (`spell space org setup`, P35):  nobody's asked.
   * - throws `HttpError(409)` when it has one already;  as `give()` for `board`
   */
  async setUp(org: string, { board }: { board: string }): Promise<void> {
    if (await this.people.roster(org)) throw new SRV.HttpError(409, `@${org} has an Admin space already`)
    const roster = new People.Roster({ id: org })
    for (const [id, { name, manages }] of Object.entries(BUILT_IN_ROLES)) {
      roster.roles.add(new People.OrgRole({ id, key: id, name, manages }))
    }
    await this.people.save(roster)
    await this.logChange(org, { action: "set up", by: BY_SPELL })
    await this.give(org, { role: "board", person: board }, {})
  }

  /**
   * SIDE EFFECT:  add the standing team `id` to org `org`, or rename it.
   * - throws `HttpError(403)` for anyone but the Board and the Admins;  as `rosterOrDie()`
   */
  async addTeam(org: string, { id, name }: { id: string; name: string }, why: RoleWhy): Promise<void> {
    const roster = await this.rosterOrDie(org)
    await this.mayOrDie(roster, why, { kind: "nothing" }, "add teams")
    const team = roster.teams.items.find((each) => each.folder === id)
    if (team) team.name = name
    else roster.teams.add(new People.Team({ id: folderOrDie(id), folder: id, name }))
    await this.saveAndLog(roster, { action: "team", by: why.by ?? BY_SPELL, team: id, name, why: why.why })
  }

  /**
   * SIDE EFFECT:  add project `id` to org `org`, under the standing team `team`, or the org itself.
   * - Who:  the Board and the Admins anywhere;  a team's Managers under their team.
   * - throws `HttpError(403)` for anyone else;  `HttpError(404)` for a team it hasn't;  as `rosterOrDie()`
   */
  async addProject(
    org: string,
    { id, name, team }: { id: string; name: string; team?: string },
    why: RoleWhy
  ): Promise<void> {
    const roster = await this.rosterOrDie(org)
    const underTeam = team === undefined ? undefined : teamOrDie(roster, team)
    await this.mayOrDie(
      roster,
      why,
      underTeam ? { kind: "a-team", team: underTeam } : { kind: "nothing" },
      "add projects"
    )
    if (roster.projects.items.some((each) => each.folder === id)) {
      throw new SRV.HttpError(409, `@${org} has a project ${id} already`)
    }
    roster.projects.add(
      new People.OrgProject({ id: folderOrDie(id), folder: id, name, ...(underTeam && { team: underTeam }) })
    )
    await this.saveAndLog(roster, { action: "project", by: why.by ?? BY_SPELL, project: id, name, team, why: why.why })
  }

  /**
   * SIDE EFFECT:  add a role of org `org`'s own, or change one:  its name, who's eligible, what a new one manages.
   * - `eligiblePeople`, `eligibleTeams`:  who may hold it;  both empty, anyone in the org
   * - A built-in role keeps what it manages (`BUILT_IN_ROLES`):  only its name and who's eligible change.
   * - throws `HttpError(403)` for anyone but the Board and the Admins;
   *   `HttpError(400)` for a built-in role told to manage something else;  `HttpError(404)` for someone it names unknown
   */
  async defineRole(org: string, change: RoleDefinition, why: RoleWhy): Promise<void> {
    const roster = await this.rosterOrDie(org)
    await this.mayOrDie(roster, why, { kind: "nothing" }, "change the org's roles")
    const { id, name, manages, eligiblePeople = [], eligibleTeams = [] } = change
    const builtIn = BUILT_IN_ROLES[id as keyof typeof BUILT_IN_ROLES]
    if (builtIn && manages && manages !== builtIn.manages) {
      throw new SRV.HttpError(400, `${id} is one of every org's roles:  it always manages ${builtIn.manages}`)
    }
    let role = roster.roles.items.find((each) => roleKeyFor(each.key) === roleKeyFor(id))
    if (!role)
      roster.roles.add((role = new People.OrgRole({ id: folderOrDie(id), key: id, manages: manages ?? "nothing" })))
    if (name) role.name = name
    if (manages && !builtIn) role.manages = manages
    role.eligiblePeople.items = await Promise.all(eligiblePeople.map((each) => this.personOrDie(org, each)))
    role.eligibleTeams.items = eligibleTeams.map((each) => teamOrDie(roster, each))
    await this.saveAndLog(roster, { action: "role", by: why.by ?? BY_SPELL, role: id, name: role.name, why: why.why })
  }

  /**
   * SIDE EFFECT:  give a term of a role:  `person` (or the whole team `team`) holds `role` of `of`, from `start`
   * (today) until `end` (no end).
   * - `of`:  the team or project it manages, for a role that manages one;  nothing, for any other
   * - Already held:  nothing changes.
   * - throws `HttpError(403)` for someone who may not name it, or someone not eligible;
   *   `HttpError(404)` for a role, team, project or person it hasn't;  `HttpError(400)` for a term that's no term
   */
  async give(org: string, grant: TermGrant, why: RoleWhy): Promise<void> {
    const roster = await this.rosterOrDie(org)
    const term = await this.termOrDie(roster, grant)
    await this.mayOrDie(roster, why, scopeOfTerm(term), `name a ${term.role.name}`, term.role)
    await this.eligibleOrDie(roster, term)
    if (roster.terms.items.some((each) => this.isHeld(each) && sameTerm(each, term, this.people))) return
    roster.terms.add(term)
    await this.saveAndLog(roster, { action: "give", by: why.by ?? BY_SPELL, ...this.viewOf(term), why: why.why })
  }

  /**
   * SIDE EFFECT:  end a term, today:  its end day set, so the record of who held it stays.
   * - Who may:  as `give()`;  so a Project Manager can't end a Team Manager's, an Admin's or the Board's.
   * - throws `HttpError(404)` for a term nobody holds;  as `give()`
   */
  async end(org: string, grant: TermGrant, why: RoleWhy): Promise<void> {
    const roster = await this.rosterOrDie(org)
    const asked = await this.termOrDie(roster, grant)
    await this.mayOrDie(roster, why, scopeOfTerm(asked), `end a ${asked.role.name}'s term`, asked.role)
    const held = roster.terms.items.filter((each) => this.isHeld(each) && sameTerm(each, asked, this.people))
    if (!held.length) throw new SRV.HttpError(404, `nobody holds that term of ${asked.role.name} in @${org}`)
    for (const term of held) term.end = this.now()
    await this.saveAndLog(roster, { action: "end", by: why.by ?? BY_SPELL, ...this.viewOf(asked), why: why.why })
  }

  /**
   * SIDE EFFECT:  `who` (`bo@rs`) leaves org `org` (epic `atmosphere` P24):  every term they hold ends today, its record
   * kept, and their membership leaves the org file, so they're off every list at once.
   * - What they wrote stays, with their name, until the org removes it.
   * - Who may:  they themselves;  else the Board and the Admins, as for the org's shared space.
   * - An org with no Admin space:  their membership alone;  nothing logged, as it keeps no log.
   * - Nothing, for someone not in it.
   * - throws `HttpError(403)` for anyone else
   */
  async leave(org: string, who: string, why: RoleWhy): Promise<void> {
    const roster = await this.people.roster(org)
    if (roster && why.by !== undefined && why.by !== who) {
      await this.mayOrDie(roster, why, SHARED_SCOPE, `take ${who} out`)
    }
    const held = (roster?.terms.items ?? []).filter(
      (term) => this.isHeld(term) && term.person && this.people.addressOf(term.person) === who
    )
    for (const term of held) term.end = this.now()
    if (roster && held.length) await this.people.save(roster)
    const account = SP.SpellLocation.accountParts(who)
    const person = account && (await this.people.person(account.id, account.org)).person
    const orgFile = await this.people.org(org)
    if (person && orgFile) await this.people.removeMembership(orgFile, person)
    if (roster) await this.logChange(org, { action: "leave", by: why.by ?? BY_SPELL, person: who, why: why.why })
    await this.changed(org)
  }

  /**
   * SIDE EFFECT:  tell `onChange` org `org`'s roles or members changed, and wait for it:
   * `SpaceMembers` says so after someone joins.
   * - NEVER throws:  a failure is logged, and the daily round tries again
   */
  async changed(org: string): Promise<void> {
    try {
      await this.onChange?.(org)
    } catch (error) {
      console.error(`OrgRoles:  @${org}'s lists didn't follow its roles;  the daily round tries again`, error)
    }
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** Every person managing `scope` in `roster` today, by address:  see the class. */
  private managersIn(roster: People.Roster, scope: Scope): string[] {
    const managers = new Set<string>()
    for (const term of roster.terms.items) {
      if (!this.isHeld(term) || !managesWithin(term, scope)) continue
      for (const person of this.holdersOf(roster, term)) managers.add(person)
    }
    return [...managers]
  }

  /** Who holds `term`:  its person, or each person on its team today (that team's Team Managers), by address. */
  private holdersOf(roster: People.Roster, term: People.Term): string[] {
    if (term.person) return [this.people.addressOf(term.person)]
    if (!term.holderTeam) return []
    const team = term.holderTeam
    return roster.terms.items
      .filter((each) => this.isHeld(each) && each.person && each.role?.manages === "a-team" && each.team === team)
      .map((each) => this.people.addressOf(each.person))
  }

  /**
   * - throws `HttpError(403)` unless `by` manages `scope`, or anything above it, today;  only the Board, for a Board term
   *   (`role`).  Nobody (`by` undefined) is Spell's own tools:  trusted.
   */
  private async mayOrDie(roster: People.Roster, { by }: RoleWhy, scope: Scope, what: string, role?: People.OrgRole) {
    if (by === undefined) return
    const above: Scope = role?.manages === "the-org" ? { kind: "the-org" } : scope
    if (this.managersIn(roster, above).includes(by)) return
    throw new SRV.HttpError(403, `${by} may not ${what} in @${roster.id}:  ${whoMay(above)} may`)
  }

  /** - throws `HttpError(403)` unless `term`'s holder may hold its role:  in the org, and eligible (see the class) */
  private async eligibleOrDie(roster: People.Roster, term: People.Term): Promise<void> {
    const { role } = term
    const people = role.eligiblePeople.items.map((each) => this.people.addressOf(each))
    const teams = role.eligibleTeams.items.map((each) => each.folder)
    const anyone = !people.length && !teams.length
    if (term.holderTeam) {
      if (anyone || teams.includes(term.holderTeam.folder)) return
      throw new SRV.HttpError(403, `the ${term.holderTeam.name || term.holderTeam.folder} can't be a ${role.name}`)
    }
    const who = this.people.addressOf(term.person)
    if (!(await this.isInOrg(roster.id, who)))
      throw new SRV.HttpError(403, `${who} isn't in @${roster.id}:  invite them first`)
    if (anyone || people.includes(who)) return
    const onTeams = teams.flatMap((team) =>
      this.holdersOf(roster, new People.Term({ holderTeam: teamOrDie(roster, team) }))
    )
    if (onTeams.includes(who)) return
    throw new SRV.HttpError(403, `${who} isn't eligible to be a ${role.name} of @${roster.id}`)
  }

  /** The term `grant` asks for, its role, holder and what it manages found in `roster`.  - throws as `give()` */
  private async termOrDie(roster: People.Roster, { role, person, team, of, start, end }: TermGrant) {
    const orgRole = roster.roles.items.find((each) => roleKeyFor(each.key) === roleKeyFor(role))
    if (!orgRole) throw new SRV.HttpError(404, `@${roster.id} has no role ${role}`)
    if ((person === undefined) === (team === undefined)) {
      throw new SRV.HttpError(400, `name who holds the ${orgRole.name}:  a person or a team, not both`)
    }
    const term = new People.Term({ role: orgRole, start: start ?? this.now() })
    if (end) term.end = end
    if (person !== undefined) term.person = await this.personOrDie(roster.id, person)
    else term.holderTeam = teamOrDie(roster, team!)
    if (orgRole.manages === "a-team") term.team = teamOrDie(roster, ofOrDie(orgRole, of))
    else if (orgRole.manages === "a-project") term.project = projectOrDie(roster, ofOrDie(orgRole, of))
    else if (of !== undefined) throw new SRV.HttpError(400, `a ${orgRole.name} manages ${orgRole.manages}, not ${of}`)
    return term
  }

  /** `who` (`ana@rs`), from their own file.  - throws `HttpError(404)` for someone with none */
  private async personOrDie(org: string, who: string): Promise<People.Person> {
    const account = SP.SpellLocation.accountParts(who)
    const person = account && (await this.people.person(account.id, account.org)).person
    if (!person) throw new SRV.HttpError(404, `there's nobody called ${who} in @${org}:  invite them first`)
    return person
  }

  /** Org `org`'s roster.  - throws `HttpError(404)` for an org with no Admin space */
  private async rosterOrDie(org: string): Promise<People.Roster> {
    const roster = await this.people.roster(org)
    if (!roster) throw new SRV.HttpError(404, `@${org} has no Admin space:  set one up first`)
    return roster
  }

  /** Is `term` held today:  started, and not ended? */
  private isHeld(term: People.Term): boolean {
    const now = this.now().getTime()
    return (!term.start || term.start.getTime() <= now) && (!term.end || term.end.getTime() > now)
  }

  /** `term` as a log entry and a list show it:  its role's id, who holds it, what it manages, from and until when. */
  private viewOf(term: People.Term): TermView {
    return {
      role: term.role.key,
      ...(term.person && { person: this.people.addressOf(term.person) }),
      ...(term.holderTeam && { team: term.holderTeam.folder }),
      ...((term.team ?? term.project) && { of: (term.team ?? term.project)!.folder }),
      ...(term.start && { start: term.start.toISOString() }),
      ...(term.end && { end: term.end.toISOString() })
    }
  }

  /** SIDE EFFECT:  write `roster`, then log `change`. */
  private async saveAndLog(roster: People.Roster, change: Omit<RoleChange, "at">): Promise<void> {
    await this.people.save(roster)
    await this.logChange(roster.id, change)
    await this.changed(roster.id)
  }

  /**
   * SIDE EFFECT:  add `change` to org `org`'s log, now.
   * - Public for `OrgRecovery`, which logs its codes and recoveries here too.
   */
  async logChange(org: string, change: Omit<RoleChange, "at">): Promise<void> {
    const entry = Object.fromEntries(
      Object.entries({ at: this.now().toISOString(), ...change }).filter(([, value]) => value !== undefined)
    ) as RoleChange
    await writeJSON5(this.people.storage, logFile(org), { changes: [...(await this.log(org)), entry] })
  }
}

/** Constructor props of `OrgRoles`. */
export type OrgRolesProps = {
  /** People, orgs and rosters. */
  people: PeopleStore
  /** When it is:  a test's clock;  the real one, by default. */
  now?: () => Date
  /**
   * Told of each change to an org's roles or members, by its id, and waited for:
   * the app's `SpaceFolders` brings each real Space's list into step (`MemberLists.follow()`).
   */
  onChange?: (org: string) => Promise<unknown> | void
}

/** Who's asking for a change to an org's roles, and why:  for the log. */
export type RoleWhy = {
  /** Who, by address:  none for Spell's own tools, trusted. */
  by?: string
  /** Why, in their words. */
  why?: string
}

/** An app an org's Admins approved, at the one version its spaces may install:  `{ name: "@spell/sign-up-sheet", version: "1.2.0" }`. */
export type ApprovedApp = {
  /** Its project's address:  `@spell/sign-up-sheet`. */
  name: string
  /** The version approved:  `1.2.0`. */
  version: string
}

/** A term asked for, `give()`'s and `end()`'s:  a role, its holder, what it manages, and when. */
export type TermGrant = {
  /** The role's id:  `board`, `admins`, `team-manager`, `project-manager`, or one of the org's own;
   *  an older file's `team-lead` and `project-lead` are read as these (`roleKeyFor()`). */
  role: string
  /** Who holds it, by address:  `bo@rs`. */
  person?: string
  /** Or a whole team holds it, by id:  `events_team`. */
  team?: string
  /** The team or project it manages, by id, for a role that manages one. */
  of?: string
  /** From:  today, by default. */
  start?: Date
  /** Until:  no end, by default. */
  end?: Date
}

/** A role defined, `defineRole()`'s:  see there. */
export type RoleDefinition = {
  /** Its id:  one of the built-in roles' (`board` ...), or a new one's. */
  id: string
  /** What people call it in this org:  "Council". */
  name?: string
  /** What holding a new one manages:  `nothing` by default. */
  manages?: People.Manages
  /** Who may hold it, by address. */
  eligiblePeople?: string[]
  /** Who may hold it:  the people on these teams, by id. */
  eligibleTeams?: string[]
}

/** A term as it's shown and logged:  every person and thing by its address or id. */
export type TermView = {
  /** Its role's id. */
  role: string
  /** Who holds it, by address. */
  person?: string
  /** Or the team holding it, by id. */
  team?: string
  /** The team or project it manages, by id. */
  of?: string
  /** From when, ISO. */
  start?: string
  /** Until when, ISO, if it ends. */
  end?: string
}

/** One line of an org's log of its roles:  what was changed, by whom, when and why (as `TakedownEntry`). */
export type RoleChange = Partial<TermView> & {
  /** When, ISO. */
  at: string
  /** Who, by address;  `spell` for Spell's own tools. */
  by: string
  /**
   * What:  its Admin space set up, a team or project added, a role defined, a term given or ended;
   * its recovery codes made, or used (`OrgRecovery`, P21);  an app approved, or taken off the list (P23);
   * someone leaving the org, their terms ended (`leave()`, P24);  someone joining it, from its Admin page
   * (`OrgRolesPlace`, P25);  its policy set (`setPolicy()`, P26);  someone let design a space, or no longer (T47).
   */
  action:
    | "set up"
    | "team"
    | "project"
    | "role"
    | "give"
    | "end"
    | "recovery codes"
    | "recover"
    | "approve app"
    | "unapprove app"
    | "leave"
    | "join"
    | "policy"
    | "give design"
    | "end design"
  /** A team's, project's or role's name. */
  name?: string
  /** A project's team. */
  team?: string
  /** A project added. */
  project?: string
  /** Why, in their words. */
  why?: string
  /** Recovery codes:  who holds a part of the new ones, or whose parts were used, by address. */
  holders?: string[]
  /** Recovery codes:  how many parts it takes. */
  needed?: number
  /** A recovery:  who it named to the Board, by address. */
  board?: string[]
  /** A recovery:  who it named to the Admins, by address. */
  admins?: string[]
  /** An app approved:  its version.  Its name is `name`. */
  version?: string
  /** A policy set:  how many versions of each project are kept. */
  versionsKept?: number
  /** Someone let design a space, or no longer:  its shared address, `picnic@rs`. */
  space?: string
}

/**
 * Who designs which space (`OrgRoles.designers()`, epic `atmosphere` T47):  `{ person: "ana@rs", space: "picnic@rs" }`.
 */
export type DesignGrant = {
  /** Who, by address:  `ana@rs`. */
  person: string
  /** The paired space they design, by its shared address:  `picnic@rs`, `events_team@rs`, `@rs`. */
  space: string
}

/** An org's policies, kept in its Admin space (`OrgRoles.policy()`, epic `atmosphere` P26). */
export type OrgPolicy = {
  /** How many versions of each project Publish keeps, newest first;  unsaid, every one. */
  versionsKept?: number
}

/** What a term manages, or what's being changed:  the org, its Admin space, a team, a project, or nothing in particular. */
/**
 * One of an org's PAIRED SPACES (epic `atmosphere` P22):  the org, its Admins, each standing team and each project
 * has two, a shared one everyone in the org reads (Q22 A), and a private one only its Managers reach.
 */
export type PairedSpace = {
  /** Its org:  `rs`. */
  org: string
  /** Whose it is:  the org's, the Admins', a team's or a project's (by its folder). */
  of: { kind: "the-org" } | { kind: "the-admin-space" } | { kind: "a-team" | "a-project"; folder: string }
  /** Which of the two. */
  side: SpaceSide
  /** Its own address, the part before its folders:  `@rs`, `@rs/__private`, `events_team@rs/2026-q4/__private`. */
  address: string
}

/** The org's own space of one of its people (`OrgRoles.memberSpaceAt()`, epic `atmosphere` P28). */
export type MemberSpace = {
  /** Its org:  `rs`. */
  org: string
  /** Whose, by address:  `ana@rs`. */
  person: string
}

/** A paired space's side:  shared, everyone in the org reads it;  private, only its Managers. */
export type SpaceSide = "shared" | "private"

/** The Admins' shared space's id, as an account's:  `admins@rs`, where anyone in the org may ask them for something. */
export const ADMINS_SHARED = "admins"

/** The org's shared space, as who manages it:  the Board and the Admins, never a team's Managers. */
const SHARED_SCOPE: Scope = { kind: "the-org-shared" }

/** `owner`'s space at `address`, its private side when `next` is `__private` (`PRIVATE_SPACE`). */
function sideOf(owner: Pick<PairedSpace, "org" | "of">, address: string, next: string | undefined): PairedSpace {
  return next === PRIVATE_SPACE
    ? { ...owner, side: "private", address: `${address}/${PRIVATE_SPACE}` }
    : { ...owner, side: "shared", address }
}

type Scope =
  | { kind: "the-org" }
  | { kind: "the-org-shared" }
  | { kind: "the-admin-space" }
  | { kind: "a-team"; team: People.Team }
  | { kind: "a-project"; project: People.OrgProject }
  | { kind: "nothing" }

/** `@rs/__admin/apps.json5`:  the apps org `org`'s Admins approved. */
function appsFile(org: string): string {
  return `@${org}/${ADMIN_SPACE}/${APPS_FILE}`
}

/** `@rs/__admin/designers.json5`:  who designs which of org `org`'s spaces. */
function designersFile(org: string): string {
  return `@${org}/${ADMIN_SPACE}/${DESIGNERS_FILE}`
}

/** A paired space's address as its shared side's:  `picnic@rs/__private` => `picnic@rs`. */
function sharedAddressOf(address: string): string {
  return address.replace(new RegExp(`/${PRIVATE_SPACE}$`), "").replace(/\/+$/, "")
}

/** Two grants for the same person and space? */
function sameGrant(one: DesignGrant, other: DesignGrant): boolean {
  return one.person === other.person && one.space === other.space
}

/** What managing paired space `space` is, as a scope:  its Managers' (`managersOfSpace()`). */
function scopeOfSpace(roster: People.Roster, { of }: PairedSpace): Scope {
  if (of.kind === "the-org") return SHARED_SCOPE
  if (of.kind === "the-admin-space") return { kind: "the-admin-space" }
  return scopeOf(roster, of.folder)
}

/** `@rs/__admin/policy.json5`:  org `org`'s policies. */
function policyFile(org: string): string {
  return `@${org}/${ADMIN_SPACE}/${POLICY_FILE}`
}

/** `app` as a log entry has it:  its name and version. */
function appOf(app: ApprovedApp): Pick<RoleChange, "name" | "version"> {
  return { name: app.name, version: app.version }
}

/** `@rs/__admin/log.json5`:  the log of org `org`'s roles. */
function logFile(org: string): string {
  return `@${org}/${ADMIN_SPACE}/${LOG_FILE}`
}

/** What the space `folder` of `roster`'s org is:  see `OrgRoles`. */
function scopeOf(roster: People.Roster, folder: string | undefined): Scope {
  if (folder === ADMIN_SPACE) return { kind: "the-admin-space" }
  const team = roster.teams.items.find((each) => each.folder === folder)
  if (team) return { kind: "a-team", team }
  const project = roster.projects.items.find((each) => each.folder === folder)
  if (project) return { kind: "a-project", project }
  return { kind: "the-org" }
}

/** What a term of `term`'s role manages:  where someone must manage to name one. */
function scopeOfTerm(term: People.Term): Scope {
  if (term.team) return { kind: "a-team", team: term.team }
  if (term.project) return { kind: "a-project", project: term.project }
  return { kind: "nothing" }
}

/**
 * Does `term` manage `scope`:  the Board everything;  the Admins all but the org's own scope;
 * a team's Managers it, and its projects;  a project's Managers it.
 * - `nothing`, the scope of a change to the org's teams and roles:  the Board and the Admins.
 */
function managesWithin(term: People.Term, scope: Scope): boolean {
  const manages = term.role?.manages
  if (manages === "the-org") return true
  if (scope.kind === "the-org") return false
  if (manages === "the-admin-space") return true
  if (manages === "a-team" && term.team) {
    if (scope.kind === "a-team") return scope.team === term.team
    if (scope.kind === "a-project") return scope.project.team === term.team
  }
  if (manages === "a-project" && term.project && scope.kind === "a-project") return scope.project === term.project
  return false
}

/** Who manages `scope`, for a refusal's message. */
function whoMay(scope: Scope): string {
  if (scope.kind === "the-org") return "only the Board"
  if (scope.kind === "a-team") return `the Board, the Admins and the ${scope.team.name || scope.team.folder}'s Managers`
  if (scope.kind === "a-project") {
    return `the Board, the Admins, its team's Managers and the ${scope.project.name || scope.project.folder}'s Managers`
  }
  return "the Board and the Admins"
}

/** Are `a` and `b` the same term:  one role, one holder, managing one thing? */
function sameTerm(a: People.Term, b: People.Term, people: PeopleStore): boolean {
  const holder = (term: People.Term) => (term.person ? people.addressOf(term.person) : term.holderTeam)
  return a.role === b.role && holder(a) === holder(b) && a.team === b.team && a.project === b.project
}

/** `roster`'s team `id`.  - throws `HttpError(404)` for one it hasn't */
function teamOrDie(roster: People.Roster, id: string): People.Team {
  const team = roster.teams.items.find((each) => each.folder === id)
  if (!team) throw new SRV.HttpError(404, `@${roster.id} has no team ${id}`)
  return team
}

/** `roster`'s project `id`.  - throws `HttpError(404)` for one it hasn't */
function projectOrDie(roster: People.Roster, id: string): People.OrgProject {
  const project = roster.projects.items.find((each) => each.folder === id)
  if (!project) throw new SRV.HttpError(404, `@${roster.id} has no project ${id}`)
  return project
}

/** - throws `HttpError(400)` when `role` manages a team or a project, and `of` doesn't say which */
function ofOrDie(role: People.OrgRole, of: string | undefined): string {
  if (of === undefined) throw new SRV.HttpError(400, `say which ${role.manages.slice(2)} the ${role.name} manages`)
  return of
}

/** - throws `HttpError(400)` for a key or folder that isn't a folder's name:  letters, digits, `_` and `-` */
function folderOrDie(id: string): string {
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(id)) {
    throw new SRV.HttpError(400, `${id} can't name it:  letters, digits, _ and -, as a folder's name`)
  }
  return id
}

/** An older file's role keys (P20, before Q28), and what each is now. */
const OLD_ROLE_KEYS: Record<string, string> = { "team-lead": "team-manager", "project-lead": "project-manager" }

/** Role key `key` as it's called today:  an older file's `team-lead` is `team-manager` (Q28). */
function roleKeyFor(key: string): string {
  return OLD_ROLE_KEYS[key] ?? key
}
