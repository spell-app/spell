import { core, Thing, App, Place, prop, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Org Admin:  where an org's roles are kept")
///////////////////////////////////////////////
// ## Org Admin:  where an org's roles are kept
///////////////////////////////////////////////

/** The org itself, for the page's title and as a space to design. */
export class OrgProfile extends Thing {
  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 676, end: 697 } })
  accessor name!: string

  // - its "space" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 702, end: 724 } })
  accessor space!: string

  static savedIn = {
    place: "admin_roles",
    collection: "org_profiles",
    times: ["created", "modified"], select: ["name", "space"] }

  // - it lives in admin roles
  @prop({ type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 641, end: 664 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in admin roles
  @prop({ type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 641, end: 664 } })
  accessor modified!: any /* spell: type unknown */
}

export class Member extends Thing {
  // - its "person" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 803, end: 826 } })
  accessor person!: string

  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 831, end: 852 } })
  accessor name!: string

  // - its "role" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 857, end: 878 } })
  accessor role!: string

  // - its "role name" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 883, end: 909 } })
  accessor roleName!: string

  static savedIn = {
    place: "admin_roles",
    collection: "members",
    times: ["created", "modified"]
  }

  // - it lives in admin roles
  @prop({ type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 768, end: 791 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in admin roles
  @prop({ type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 768, end: 791 } })
  accessor modified!: any /* spell: type unknown */
}

export class Team extends Thing {
  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 986, end: 1007 } })
  accessor name!: string

  // - its "space" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1012, end: 1034 } })
  accessor space!: string

  static savedIn = {
    place: "admin_roles",
    collection: "teams",
    times: ["created", "modified"]
  }

  // - it lives in admin roles
  @prop({ type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 951, end: 974 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in admin roles
  @prop({ type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 951, end: 974 } })
  accessor modified!: any /* spell: type unknown */
}

export class Project extends Thing {
  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1114, end: 1135 } })
  accessor name!: string

  // - its "team" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1140, end: 1161 } })
  accessor team!: string

  // - its "space" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1166, end: 1188 } })
  accessor space!: string

  static savedIn = {
    place: "admin_roles",
    collection: "projects",
    times: ["created", "modified"]
  }

  // - it lives in admin roles
  @prop({ type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 1079, end: 1102 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in admin roles
  @prop({ type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 1079, end: 1102 } })
  accessor modified!: any /* spell: type unknown */
}

export class OrgRole extends Thing {
  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1269, end: 1290 } })
  accessor name!: string

  // - its "manages" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1295, end: 1319 } })
  accessor manages!: string

  static savedIn = {
    place: "admin_roles",
    collection: "org_roles",
    times: ["created", "modified"], select: ["name", "manages"] }

  // - it lives in admin roles
  @prop({ type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 1234, end: 1257 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in admin roles
  @prop({ type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 1234, end: 1257 } })
  accessor modified!: any /* spell: type unknown */
}

export class Term extends Thing {
  // - its "role" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1396, end: 1417 } })
  accessor role!: string

  // - its "holder" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1422, end: 1445 } })
  accessor holder!: string

  // - its "manages" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1450, end: 1474 } })
  accessor manages!: string

  // - its "role name" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1479, end: 1505 } })
  accessor roleName!: string

  // - its "holder name" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1510, end: 1538 } })
  accessor holderName!: string

  // - its "manages name" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1543, end: 1572 } })
  accessor managesName!: string

  // - its "starts" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1577, end: 1600 } })
  accessor starts!: string

  // - its "ends" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1605, end: 1626 } })
  accessor ends!: string

  static savedIn = {
    place: "admin_roles",
    collection: "terms",
    times: ["created", "modified"]
  }

  // - it lives in admin roles
  @prop({ type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 1361, end: 1384 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in admin roles
  @prop({ type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 1361, end: 1384 } })
  accessor modified!: any /* spell: type unknown */
}

export class ApprovedApp extends Thing {
  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1711, end: 1732 } })
  accessor name!: string

  // - its "version" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1737, end: 1761 } })
  accessor version!: string

  static savedIn = {
    place: "admin_roles",
    collection: "approved_apps",
    times: ["created", "modified"]
  }

  // - it lives in admin roles
  @prop({ type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 1676, end: 1699 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in admin roles
  @prop({ type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 1676, end: 1699 } })
  accessor modified!: any /* spell: type unknown */
}

/** A designer changes a space's pages and source, whatever their role there:  a Manager publishes them. */
export class Designer extends Thing {
  // - its "person" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1946, end: 1969 } })
  accessor person!: string

  // - its "space" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1974, end: 1996 } })
  accessor space!: string

  // - its "person name" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 2001, end: 2029 } })
  accessor personName!: string

  static savedIn = {
    place: "admin_roles",
    collection: "designers",
    times: ["created", "modified"]
  }

  // - it lives in admin roles
  @prop({ type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 1911, end: 1934 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in admin roles
  @prop({ type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 1911, end: 1934 } })
  accessor modified!: any /* spell: type unknown */
}

/** An event's stages, in order (its place calls them event stages):  who moves an event into each is "the team" or "its organizers". */
export class Stage extends Thing {
  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 2240, end: 2261 } })
  accessor name!: string

  // - its "moves to" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 2266, end: 2291 } })
  accessor movesTo!: string

  // - its "moved by" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 2296, end: 2321 } })
  accessor movedBy!: string

  static savedIn = {
    place: "admin_roles",
    collection: "stages",
    times: ["created", "modified"]
  }

  // - it lives in admin roles
  @prop({ type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 2205, end: 2228 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in admin roles
  @prop({ type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 2205, end: 2228 } })
  accessor modified!: any /* spell: type unknown */
}

export class RoleChange extends Thing {
  // - its "at" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 2405, end: 2424 } })
  accessor at!: string

  // - its "who" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 2429, end: 2449 } })
  accessor who!: string

  // - its "did" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 2454, end: 2474 } })
  accessor did!: string

  // - its "what" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 2479, end: 2500 } })
  accessor what!: string

  // - its "why" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 2505, end: 2525 } })
  accessor why!: string

  static savedIn = {
    place: "admin_roles",
    collection: "role_changes",
    times: ["created", "modified"], select: ["at", "who", "did", "what", "why"] }

  // - it lives in admin roles
  @prop({ type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 2370, end: 2393 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in admin roles
  @prop({ type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 2370, end: 2393 } })
  accessor modified!: any /* spell: type unknown */
}

/**
 * An org's roles live in its Admin space:  who's in it, its teams and projects, who manages what, and until when.
 * Every change goes through Spell's server, under the org's rules, and is logged:
 * a Project Manager can't remove a Team Manager from this page either.
 * Your org's Admin page names its own org on the next line:  "@rs" is the Rock Society's.
 */
export class AdminRole extends Place {}
export const adminRoles = core.place(new AdminRole(), {
  name: "admin_roles",
  kind: "data folder",
  at: "/api/places/spaces/@rs/__admin/roles",
  checkedEvery: 30,
  collections: { stages: { at: "event_stages" } }, firstReads: () => [[OrgProfile], [RoleChange, { sort: [{ field: "at", descending: true }] }], [Stage], [ApprovedApp], [Member, { sort: [{ field: "name" }] }], [Team, { sort: [{ field: "name" }] }], [Project, { sort: [{ field: "name" }] }], [Designer], [OrgRole], [Term]] })

// -----------
core.heading("Org Admin")
///////////////
// ## Org Admin
///////////////
// An org's Admin page:  who's in it, its teams and projects, who manages what and until when, who designs which pages,
// which apps its spaces may install, its event stages, and the log of every change.
// A toolbar with who's signed in, the sections down the side, and one section at a time beside them.
// Where they're kept is in OrgAdmin.api.spell, and only its first line knows.
// Each change goes through Spell's server, under the org's rules:  one you can't make says why, and changes nothing.

core.heading("The page:  a toolbar, the sections down the side, and the one picked")
//## The page:  a toolbar, the sections down the side, and the one picked

export class OrgAdmin extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  /** Who to add, by their address:  ana@rs */
  // - its "new member" is a new member
  @prop({ init: () => new Member(), early: true })
  accessor newMember!: Member

  /** A new standing team, by its name */
  // - its "new team" is a new team
  @prop({ init: () => new Team(), early: true })
  accessor newTeam!: Team

  /** A new project, under a team or, with none picked, the org itself */
  // - its "new project" is a new project
  @prop({ init: () => new Project(), early: true })
  accessor newProject!: Project

  // - its "new term" is a new term
  @prop({ init: () => new Term(), early: true })
  accessor newTerm!: Term

  // - its "new app" is a new approved app
  @prop({ init: () => new ApprovedApp(), early: true })
  accessor newApp!: ApprovedApp

  /** Who designs which space's pages */
  // - its "new designer" is a new designer
  @prop({ init: () => new Designer(), early: true })
  accessor newDesigner!: Designer

  /** A stage an event goes through:  its name changes the stage of that name, or adds one before the last */
  // - its "new stage" is a new stage
  @prop({ init: () => new Stage(), early: true })
  accessor newStage!: Stage

  addTheNewMember() {
    core.saveThing(this.newMember)
    this.newMember = new Member()
  }

  addTheNewTeam() {
    core.saveThing(this.newTeam)
    this.newTeam = new Team()
  }

  addTheNewProject() {
    core.saveThing(this.newProject)
    this.newProject = new Project()
  }

  giveTheNewTerm() {
    core.saveThing(this.newTerm)
    this.newTerm = new Term()
  }

  approveTheNewApp() {
    core.saveThing(this.newApp)
    this.newApp = new ApprovedApp()
  }

  addTheNewDesigner() {
    core.saveThing(this.newDesigner)
    this.newDesigner = new Designer()
  }

  addTheNewStage() {
    core.saveThing(this.newStage)
    this.newStage = new Stage()
  }

  /** The section picked is in the page's address, so a reload comes back to it */
  @drawn draw() {
    return (
      <ui-stack class="org-admin" spacing="none">
        <ui-toolbar class="top-bar" appearance="text" aria-label="Org Admin">
          {core.drawRead(async () => await core.savedThings(OrgProfile, {}, "as drawn"), (org: OrgProfile) => <ui-text slot="title" size="large">{org.name} Admin</ui-text>)}
          <ui-item link="OrgChat">Chat</ui-item>
          <ui-item link="OrgFeed">Feed</ui-item>
          <ui-item link="Inbox">Inbox</ui-item>
          <ui-stack slot="right" direction="horizontal">{core.signInMenu()}</ui-stack>
        </ui-toolbar>
        <ui-tabs class="body" parameter="section" direction="vertical" appearance="secondary" aria-label="Sections">
          <ui-tab label="People" icon="users" value="people">{this.drawPeopleSection()}</ui-tab>
          <ui-tab label="Teams and projects" icon="sitemap" value="teams">{this.drawTeamsSection()}</ui-tab>
          <ui-tab label="Who manages what" icon="user tie" value="roles">{this.drawRolesSection()}</ui-tab>
          <ui-tab label="Who designs what" icon="paint brush" value="designers">{this.drawDesignersSection()}</ui-tab>
          <ui-tab label="Approved apps" icon="check circle outline" value="apps">{this.drawAppsSection()}</ui-tab>
          <ui-tab label="Event stages" icon="stream" value="stages">{this.drawStagesSection()}</ui-tab>
          <ui-tab label="Log" icon="history" value="log">{this.drawLogSection()}</ui-tab>
        </ui-tabs>
      </ui-stack>
    )
  }

  drawPeopleSection() {
    return (
      <ui-stack class="people" part="people_section">
        <ui-header size="medium">People</ui-header>
        <ui-form class="add" prop:value={this.newMember}>
          <ui-input name="person" placeholder="Add someone, by their address:  ana@rs" aria-label="Add someone, by their address" fluid={true} action={true}>
            <ui-button class="add" slot="action" color="primary" disabled={this.newMember.person === ""} title="Add them to the org" onClick={core.pressed(this, () => this.addTheNewMember())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Add
            </ui-button>
          </ui-input>
        </ui-form>
        {core.drawRead(async () => await core.savedThings(Member, { sort: [{ field: "name" }] }, "as drawn"), (member: Member) => <>
          <ui-cell data-column="Name">{member.name}</ui-cell>
          <ui-cell data-column="Address">
            <ui-text color="grey">{member.person}</ui-text>
          </ui-cell>
          <ui-cell data-column="Role">
            <ui-label size="small">{member.roleName}</ui-label>
          </ui-cell>
          <ui-cell data-column="">
            <ui-button class="remove" icon="close" size="mini" appearance="transparent" aria-label="Take them out of the org" title="Take them out of the org" onClick={core.pressed(this, () => core.removeSaved(member))} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
          </ui-cell>
        </>, {
          waiting: () => <ui-loader visible={true} inline={true} text={true} part="people_section">
            {"Finding the org's people"}
          </ui-loader>,
          items: () => <ui-table appearance="very-basic" selectable={true} unstackable={true} part="people_section">
            <ui-row />
          </ui-table>,
          none: () => <ui-text class="none" color="grey" part="people_section">Nobody yet.</ui-text>,
          failed: () => <ui-text color="red" part="people_section">We can't read the org's people right now.</ui-text>
        })}
      </ui-stack>
    )
  }

  drawTeamsSection() {
    return (
      <ui-stack class="teams" part="teams_section">
        <ui-header size="medium">Teams</ui-header>
        <ui-form class="add new-team" prop:value={this.newTeam}>
          <ui-input name="name" placeholder="A new team:  Events Team" aria-label="A new team" fluid={true} action={true}>
            <ui-button class="add" slot="action" color="primary" disabled={this.newTeam.name === ""} title="Add this team" onClick={core.pressed(this, () => this.addTheNewTeam())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Add team
            </ui-button>
          </ui-input>
        </ui-form>
        {core.drawRead(async () => await core.savedThings(Team, { sort: [{ field: "name" }] }, "as drawn"), (team: Team) => <>
          <ui-cell data-column="Name">{team.name}</ui-cell>
          <ui-cell data-column="Space">
            <ui-text color="grey">{team.space}</ui-text>
          </ui-cell>
        </>, {
          waiting: () => <ui-loader visible={true} inline={true} text={true} part="teams_section">{"Finding the teams"}</ui-loader>,
          items: () => <ui-table appearance="very-basic" selectable={true} unstackable={true} part="teams_section">
            <ui-row />
          </ui-table>,
          none: () => <ui-text class="none" color="grey" part="teams_section">No teams yet.</ui-text>
        })}
        <ui-header size="medium">Projects</ui-header>
        <ui-form class="add new-project" prop:value={this.newProject}>
          <ui-stack class="row" direction="horizontal" align="center" wrap={true}>
            <ui-input name="name" placeholder="A new project:  2026 Q4" aria-label="A new project" fluid={true} />
            <ui-select name="team" placeholder="Under the org itself" aria-label="Under the team">
              {core.drawRead(async () => await core.savedThings(Team, { sort: [{ field: "name" }] }, "as drawn"), (team: Team) => <ui-item value={team.id} part="teams_section">{team.name}</ui-item>)}
            </ui-select>
            <ui-button class="add-project" color="primary" title="Add this project" disabled={this.newProject.name === ""} onClick={core.pressed(this, () => this.addTheNewProject())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Add project
            </ui-button>
          </ui-stack>
        </ui-form>
        {core.drawRead(async () => await core.savedThings(Project, { sort: [{ field: "name" }] }, "as drawn"), (project: Project) => <>
          <ui-cell data-column="Name">{project.name}</ui-cell>
          <ui-cell data-column="Under">{project.team}</ui-cell>
          <ui-cell data-column="Space">
            <ui-text color="grey">{project.space}</ui-text>
          </ui-cell>
        </>, {
          waiting: () => <ui-loader visible={true} inline={true} text={true} part="teams_section">{"Finding the projects"}</ui-loader>,
          items: () => <ui-table appearance="very-basic" selectable={true} unstackable={true} part="teams_section">
            <ui-row />
          </ui-table>,
          none: () => <ui-text class="none" color="grey" part="teams_section">No projects yet.</ui-text>
        })}
      </ui-stack>
    )
  }

  drawRolesSection() {
    return (
      <ui-stack class="roles" part="roles_section">
        <ui-header size="medium">Who manages what</ui-header>
        <ui-form class="add" prop:value={this.newTerm}>
          <ui-stack class="row" direction="horizontal" align="center" wrap={true}>
            <ui-select name="holder" placeholder="Who" aria-label="Who:  a person, or a team">
              {core.drawRead(async () => await core.savedThings(Member, { sort: [{ field: "name" }] }, "as drawn"), (member: Member) => <ui-item value={member.person} part="roles_section">{member.name}</ui-item>)}
              {core.drawRead(async () => await core.savedThings(Team, { sort: [{ field: "name" }] }, "as drawn"), (team: Team) => <ui-item value={team.id} part="roles_section">{team.name}</ui-item>)}
            </ui-select>
            <ui-select name="role" placeholder="Role" aria-label="Role">
              {core.drawRead(async () => await core.savedThings(OrgRole, {}, "as drawn"), (one: OrgRole) => <ui-item value={one.id} part="roles_section">{one.name}</ui-item>)}
            </ui-select>
            <ui-select name="manages" placeholder="The whole org" aria-label="Of">
              {core.drawRead(async () => await core.savedThings(Team, { sort: [{ field: "name" }] }, "as drawn"), (team: Team) => <ui-item value={team.id} part="roles_section">{team.name}</ui-item>)}
              {core.drawRead(async () => await core.savedThings(Project, { sort: [{ field: "name" }] }, "as drawn"), (project: Project) => <ui-item value={project.id} part="roles_section">{project.name}</ui-item>)}
            </ui-select>
            <ui-input name="ends" type="date" aria-label="Until" />
            <ui-button class="give" color="primary" title="Give them this role" disabled={this.newTerm.holder === ""} onClick={core.pressed(this, () => this.giveTheNewTerm())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Name them
            </ui-button>
          </ui-stack>
        </ui-form>
        {core.drawRead(async () => await core.savedThings(Term, {}, "as drawn"), (term: Term) => <>
          <ui-cell class="holder" data-column="Who" title={term.holder}>{term.holderName}</ui-cell>
          <ui-cell data-column="Role">
            <ui-label size="small">{term.roleName}</ui-label>
          </ui-cell>
          <ui-cell data-column="Of">{term.managesName}</ui-cell>
          <ui-cell data-column="Since">{term.starts}</ui-cell>
          <ui-cell data-column="Until">{term.ends}</ui-cell>
          <ui-cell data-column="">
            <ui-button class="end" icon="close" size="mini" appearance="transparent" aria-label="End this term" title="End this term:  its record stays in the log" onClick={core.pressed(this, () => core.removeSaved(term))} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
          </ui-cell>
        </>, {
          waiting: () => <ui-loader visible={true} inline={true} text={true} part="roles_section">
            {"Finding who manages what"}
          </ui-loader>,
          items: () => <ui-table appearance="very-basic" selectable={true} unstackable={true} part="roles_section">
            <ui-row />
          </ui-table>,
          none: () => <ui-text class="none" color="grey" part="roles_section">Nobody's been named yet.</ui-text>
        })}
      </ui-stack>
    )
  }

  drawDesignersSection() {
    return (
      <ui-stack class="designers" part="designers_section">
        <ui-header size="medium">Who designs what</ui-header>
        <ui-text color="grey">
          {"They change a space's pages, whatever their role there;  its Managers publish them."}
        </ui-text>
        <ui-form class="add" prop:value={this.newDesigner}>
          <ui-stack class="row" direction="horizontal" align="center" wrap={true}>
            <ui-select name="person" placeholder="Who" aria-label="Who">
              {core.drawRead(async () => await core.savedThings(Member, { sort: [{ field: "name" }] }, "as drawn"), (member: Member) => <ui-item value={member.person} part="designers_section">{member.name}</ui-item>)}
            </ui-select>
            <ui-select name="space" placeholder="Designs" aria-label="Designs">
              {core.drawRead(async () => await core.savedThings(OrgProfile, {}, "as drawn"), (org: OrgProfile) => <ui-item value={org.space} part="designers_section">{org.name}</ui-item>)}
              {core.drawRead(async () => await core.savedThings(Team, { sort: [{ field: "name" }] }, "as drawn"), (team: Team) => <ui-item value={team.space} part="designers_section">{team.name}</ui-item>)}
              {core.drawRead(async () => await core.savedThings(Project, { sort: [{ field: "name" }] }, "as drawn"), (project: Project) => <ui-item value={project.space} part="designers_section">{project.name}</ui-item>)}
            </ui-select>
            <ui-button class="design" color="primary" title="Let them change this space's pages" disabled={this.newDesigner.person === ""} onClick={core.pressed(this, () => this.addTheNewDesigner())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Let them design it
            </ui-button>
          </ui-stack>
        </ui-form>
        {core.drawRead(async () => await core.savedThings(Designer, {}, "as drawn"), (designer: Designer) => <>
          <ui-cell data-column="Who" title={designer.person}>{designer.personName}</ui-cell>
          <ui-cell data-column="Designs">
            <ui-text color="grey">{designer.space}</ui-text>
          </ui-cell>
          <ui-cell data-column="">
            <ui-button class="undesign" icon="close" size="mini" appearance="transparent" aria-label="No longer designs it" title="No longer designs it:  their drafts stay, for a Manager" onClick={core.pressed(this, () => core.removeSaved(designer))} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
          </ui-cell>
        </>, {
          waiting: () => <ui-loader visible={true} inline={true} text={true} part="designers_section">
            {"Finding who designs what"}
          </ui-loader>,
          items: () => <ui-table appearance="very-basic" selectable={true} unstackable={true} part="designers_section">
            <ui-row />
          </ui-table>,
          none: () => <ui-text class="none" color="grey" part="designers_section">Only each space's Managers, so far.</ui-text>
        })}
      </ui-stack>
    )
  }

  drawAppsSection() {
    return (
      <ui-stack class="apps" part="apps_section">
        <ui-header size="medium">Approved apps</ui-header>
        <ui-form class="add" prop:value={this.newApp}>
          <ui-stack class="row" direction="horizontal" align="center" wrap={true}>
            <ui-input name="name" placeholder="@spell/sign-up-sheet" aria-label="App" fluid={true} />
            <ui-input name="version" placeholder="1.0.0" aria-label="Version" />
            <ui-button class="approve" color="primary" title="Let this org's spaces install it" disabled={this.newApp.name === ""} onClick={core.pressed(this, () => this.approveTheNewApp())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Approve
            </ui-button>
          </ui-stack>
        </ui-form>
        {core.drawRead(async () => await core.savedThings(ApprovedApp, {}, "as drawn"), (app: ApprovedApp) => <>
          <ui-cell data-column="App">{app.name}</ui-cell>
          <ui-cell data-column="Version">{app.version}</ui-cell>
          <ui-cell data-column="">
            <ui-button class="unapprove" icon="close" size="mini" appearance="transparent" aria-label="Take it off the list" title="Take it off the list" onClick={core.pressed(this, () => core.removeSaved(app))} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
          </ui-cell>
        </>, {
          waiting: () => <ui-loader visible={true} inline={true} text={true} part="apps_section">
            {"Finding the approved apps"}
          </ui-loader>,
          items: () => <ui-table appearance="very-basic" selectable={true} unstackable={true} part="apps_section">
            <ui-row />
          </ui-table>,
          none: () => <ui-text class="none" color="grey" part="apps_section">No apps approved yet.</ui-text>
        })}
      </ui-stack>
    )
  }

  drawStagesSection() {
    return (
      <ui-stack class="stages" part="stages_section">
        <ui-header size="medium">Event stages</ui-header>
        <ui-form class="add" prop:value={this.newStage}>
          <ui-stack class="row" direction="horizontal" align="center" wrap={true}>
            <ui-input name="name" placeholder="A stage:  Rehearsal" aria-label="Stage" fluid={true} />
            <ui-select name="moves to" placeholder="Moves to" aria-label="Moves to">
              {core.drawRead(async () => await core.savedThings(Stage, {}, "as drawn"), (stage: Stage) => <ui-item value={stage.id} part="stages_section">{stage.name}</ui-item>)}
            </ui-select>
            <ui-select name="moved by" placeholder="Moved by" aria-label="Moved by">
              <ui-item value="the team">The team</ui-item>
              <ui-item value="its organizers">Its organizers</ui-item>
            </ui-select>
            <ui-button class="stage-it" color="primary" title="Add this stage, or change the one of that name" disabled={this.newStage.name === ""} onClick={core.pressed(this, () => this.addTheNewStage())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Add or change
            </ui-button>
          </ui-stack>
        </ui-form>
        {core.drawRead(async () => await core.savedThings(Stage, {}, "as drawn"), (stage: Stage) => <>
          <ui-cell data-column="Stage">{stage.name}</ui-cell>
          <ui-cell data-column="Moves to">
            <ui-text color="grey">{stage.movesTo}</ui-text>
          </ui-cell>
          <ui-cell data-column="Moved by">{stage.movedBy}</ui-cell>
          <ui-cell data-column="">
            <ui-button class="unstage" icon="close" size="mini" appearance="transparent" aria-label="Remove this stage" title="Remove this stage:  not while an event is in it, or another moves to it" onClick={core.pressed(this, () => core.removeSaved(stage))} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
          </ui-cell>
        </>, { waiting: () => <ui-loader visible={true} inline={true} text={true} part="stages_section">
          {"Finding the event stages"}
        </ui-loader>, items: () => <ui-table appearance="very-basic" selectable={true} unstackable={true} part="stages_section">
          <ui-row />
        </ui-table> })}
      </ui-stack>
    )
  }

  drawLogSection() {
    return (
      <ui-stack class="log" part="log_section">
        <ui-header size="medium">Log</ui-header>
        {core.drawRead(async () => await core.savedThings(RoleChange, { sort: [{ field: "at", descending: true }] }, "as drawn"), (change: RoleChange) => <>
          <ui-cell data-column="When">
            <ui-text color="grey">{change.at}</ui-text>
          </ui-cell>
          <ui-cell data-column="Who">{change.who}</ui-cell>
          <ui-cell data-column="Did">
            <ui-label size="small">{change.did}</ui-label>
          </ui-cell>
          <ui-cell data-column="What">{change.what}</ui-cell>
          <ui-cell data-column="Why">{change.why}</ui-cell>
        </>, {
          waiting: () => <ui-loader visible={true} inline={true} text={true} part="log_section">{"Reading the log"}</ui-loader>,
          items: () => <ui-table appearance="very-basic" unstackable={true} part="log_section">
            <ui-row />
          </ui-table>,
          none: () => <ui-text class="none" color="grey" part="log_section">Nothing's changed yet.</ui-text>
        })}
      </ui-stack>
    )
  }
}

/**
 * `<test-project-app>`:  an org admin, drawn in its own element, e.g. by `draw the org admin`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its org admin's properties;  its methods call its org admin's.
 * - What every view's element does, e.g. drawing its org admin, is `SpellElement`'s.
 */
export class OrgAdminElement extends SpellElement<OrgAdmin> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "org admin", [
    { name: "new-member", kind: "json", description: "Its newMember." },
    { name: "new-team", kind: "json", description: "Its newTeam." },
    { name: "new-project", kind: "json", description: "Its newProject." },
    { name: "new-term", kind: "json", description: "Its newTerm." },
    { name: "new-app", kind: "json", description: "Its newApp." },
    { name: "new-designer", kind: "json", description: "Its newDesigner." },
    { name: "new-stage", kind: "json", description: "Its newStage." }
  ])

  addTheNewMember() {
    return this.currentThing?.addTheNewMember()
  }

  addTheNewTeam() {
    return this.currentThing?.addTheNewTeam()
  }

  addTheNewProject() {
    return this.currentThing?.addTheNewProject()
  }

  giveTheNewTerm() {
    return this.currentThing?.giveTheNewTerm()
  }

  approveTheNewApp() {
    return this.currentThing?.approveTheNewApp()
  }

  addTheNewDesigner() {
    return this.currentThing?.addTheNewDesigner()
  }

  addTheNewStage() {
    return this.currentThing?.addTheNewStage()
  }

  drawPeopleSection() {
    return this.currentThing?.drawPeopleSection()
  }

  drawTeamsSection() {
    return this.currentThing?.drawTeamsSection()
  }

  drawRolesSection() {
    return this.currentThing?.drawRolesSection()
  }

  drawDesignersSection() {
    return this.currentThing?.drawDesignersSection()
  }

  drawAppsSection() {
    return this.currentThing?.drawAppsSection()
  }

  drawStagesSection() {
    return this.currentThing?.drawStagesSection()
  }

  drawLogSection() {
    return this.currentThing?.drawLogSection()
  }
}
core.useElement(OrgAdmin, OrgAdminElement)
export const orgAdmin = new OrgAdmin()
// -----------
core.installStyles(undefined, `/* The page takes the theme's colours and type, light or dark, as its controls do. */¬.org-admin {¬  min-height: 100%;¬  color: CanvasText;¬  background: var(--ui-background);¬  font-family: var(--ui-font-family);¬}¬¬/* The section showing stands a little apart from the list of them. */¬.org-admin ui-tab {¬  margin-inline-start: 1rem;¬}¬¬/* The toolbar:  a rule below it, its title over the sections' labels. */¬.org-admin .top-bar {¬  padding-inline: 15px 0;¬  border-block-end: var(--ui-border-width, 1px) solid var(--ui-border-color);¬  margin-block-end: 0.75rem;¬  --ui-menu-item-padding: 0.5em 0.6em;¬}¬.org-admin .top-bar::part(menu) {¬  margin-block: 0;¬}¬.org-admin .top-bar::part(title) {¬  margin-inline-end: 12px;¬}¬¬/* Tables scroll inside themselves on a narrow page, rather than breaking a date in two. */¬.org-admin ui-row > ui-cell {¬  color: CanvasText;¬  white-space: nowrap;¬  min-inline-size: max-content;¬}¬¬/* An add form:  its button keeps its size as the row wraps. */¬.org-admin .add .row > ui-button {¬  flex: none;¬}¬¬/* A row's take-away button stays quiet until the row is pointed at, or the button has the keyboard. */¬.org-admin ui-table ui-button[icon="close"] {¬  opacity: 0;¬}¬.org-admin ui-table ui-row:hover ui-button[icon="close"],¬.org-admin ui-table ui-button[icon="close"]:focus-within {¬  opacity: 1;¬}¬¬/* A phone has nothing to point with. */¬@media (hover: none) {¬  .org-admin ui-table ui-button[icon="close"] {¬    opacity: 1;¬  }¬}¬¬/* Too narrow for the sections to sit beside what they show:  they go above it. */¬@media (max-width: 640px) {¬  .org-admin ui-tab {¬    min-width: 100%;¬    margin-inline-start: 0;¬    margin-block-start: 0.75rem;¬  }¬}¬`)
// -----------
if (!core.isCarryingOver) orgAdmin.start()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `OrgAdminElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
