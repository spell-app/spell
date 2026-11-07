import { core, Thing, App, Place, prop, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Org Admin:  where an org's roles are kept")
///////////////////////////////////////////////
// ## Org Admin:  where an org's roles are kept
///////////////////////////////////////////////

export class Member extends Thing {
  // - its "person" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 542, end: 562 } })
  accessor person!: string

  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 566, end: 584 } })
  accessor name!: string

  // - its "role" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 588, end: 606 } })
  accessor role!: string

  @drawn draw() {
    return (
      <ui-stack class="member" direction="horizontal" spacing="md" align="center" wrap={true}>
        <ui-text>{this.name}</ui-text>
        <ui-text color="grey">{this.person}</ui-text>
        <ui-text>{this.role}</ui-text>
        <ui-button class="remove" icon="close" size="mini" appearance="transparent" aria-label="Take them out of the org" title="Take them out of the org" onClick={core.pressed(this, () => core.removeSaved(this))} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
      </ui-stack>
    )
  }

  static savedIn = { place: "admin_roles", collection: "members" }
}

export class Team extends Thing {
  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 659, end: 677 } })
  accessor name!: string

  @drawn draw() {
    return (
      <ui-stack class="team" direction="horizontal" spacing="md" align="center" wrap={true}>
        <ui-text>{this.name}</ui-text>
      </ui-stack>
    )
  }

  static savedIn = { place: "admin_roles", collection: "teams" }
}

export class Project extends Thing {
  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 733, end: 751 } })
  accessor name!: string

  // - its "team" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 755, end: 773 } })
  accessor team!: string

  @drawn draw() {
    return (
      <ui-stack class="project" direction="horizontal" spacing="md" align="center" wrap={true}>
        <ui-text>{this.name}</ui-text>
        <ui-text>{this.team}</ui-text>
      </ui-stack>
    )
  }

  static savedIn = { place: "admin_roles", collection: "projects" }
}

export class OrgRole extends Thing {
  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 831, end: 849 } })
  accessor name!: string

  // - its "manages" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 853, end: 874 } })
  accessor manages!: string

  static savedIn = { place: "admin_roles", collection: "org_roles" }
}

export class Term extends Thing {
  // - its "role" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 927, end: 945 } })
  accessor role!: string

  // - its "holder" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 949, end: 969 } })
  accessor holder!: string

  // - its "manages" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 973, end: 994 } })
  accessor manages!: string

  // - its "starts" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 998, end: 1018 } })
  accessor starts!: string

  // - its "ends" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1022, end: 1040 } })
  accessor ends!: string

  @drawn draw() {
    return (
      <ui-stack class="term" direction="horizontal" spacing="md" align="center" wrap={true}>
        <ui-text>{this.holder}</ui-text>
        <ui-text>{this.role}</ui-text>
        <ui-text>{this.manages}</ui-text>
        <ui-text>{this.starts}</ui-text>
        <ui-text>{this.ends}</ui-text>
        <ui-button class="end" icon="close" size="mini" appearance="transparent" aria-label="End this term" title="End this term:  its record stays in the log" onClick={core.pressed(this, () => core.removeSaved(this))} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
      </ui-stack>
    )
  }

  static savedIn = { place: "admin_roles", collection: "terms" }
}

export class ApprovedApp extends Thing {
  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1102, end: 1120 } })
  accessor name!: string

  // - its "version" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1124, end: 1145 } })
  accessor version!: string

  @drawn draw() {
    return (
      <ui-stack class="app" direction="horizontal" spacing="md" align="center" wrap={true}>
        <ui-text>{this.name}</ui-text>
        <ui-text>{this.version}</ui-text>
        <ui-button class="unapprove" icon="close" size="mini" appearance="transparent" aria-label="Take it off the list" title="Take it off the list" onClick={core.pressed(this, () => core.removeSaved(this))} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
      </ui-stack>
    )
  }

  static savedIn = { place: "admin_roles", collection: "approved_apps" }
}

/** A designer changes a space's pages and source, whatever their role there:  a Manager publishes them. */
export class Designer extends Thing {
  // - its "person" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1306, end: 1326 } })
  accessor person!: string

  // - its "space" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1330, end: 1349 } })
  accessor space!: string

  @drawn draw() {
    return (
      <ui-stack class="designer" direction="horizontal" spacing="md" align="center" wrap={true}>
        <ui-text>{this.person}</ui-text>
        <ui-text>{this.space}</ui-text>
        <ui-button class="undesign" icon="close" size="mini" appearance="transparent" aria-label="No longer designs it" title="No longer designs it:  their drafts stay, for a Manager" onClick={core.pressed(this, () => core.removeSaved(this))} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
      </ui-stack>
    )
  }

  static savedIn = { place: "admin_roles", collection: "designers" }
}

export class RoleChange extends Thing {
  // - its "at" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1409, end: 1425 } })
  accessor at!: string

  // - its "who" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1429, end: 1446 } })
  accessor who!: string

  // - its "did" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1450, end: 1467 } })
  accessor did!: string

  // - its "what" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1471, end: 1489 } })
  accessor what!: string

  // - its "why" is text
  @prop({ type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1493, end: 1510 } })
  accessor why!: string

  @drawn draw() {
    return (
      <ui-stack class="change" direction="horizontal" spacing="md" align="center" wrap={true}>
        <ui-text color="grey">{this.at}</ui-text>
        <ui-text>{this.who}</ui-text>
        <ui-label size="tiny">{this.did}</ui-label>
        <ui-text>{this.what}</ui-text>
        <ui-text>{this.why}</ui-text>
      </ui-stack>
    )
  }

  static savedIn = { place: "admin_roles", collection: "role_changes" }
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
  checkedEvery: 30, firstReads: () => [[Member], [Team], [Project], [Term], [Designer], [ApprovedApp], [RoleChange]] })

// -----------
core.heading("Org Admin")
///////////////
// ## Org Admin
///////////////
// An org's Admin page:  who's in it, its teams and projects, who manages what and until when, which apps its spaces may
// install, and the log of every change.
// Where they're kept is in OrgAdmin.api.spell, and only its first line knows.
// Each change goes through Spell's server, under the org's rules:  one you can't make says why, and changes nothing.

core.heading("A row for each:  what it is, and a button to take it away")
//## A row for each:  what it is, and a button to take it away

core.heading("The page:  a section each, with a form to add one at its top")
//## The page:  a section each, with a form to add one at its top

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

  /** A new project, under a team (by its folder) or, with none, the org itself */
  // - its "new project" is a new project
  @prop({ init: () => new Project(), early: true })
  accessor newProject!: Project

  // - its "new term" is a new term
  @prop({ init: () => new Term(), early: true })
  accessor newTerm!: Term

  // - its "new app" is a new approved app
  @prop({ init: () => new ApprovedApp(), early: true })
  accessor newApp!: ApprovedApp

  /** Who designs which space's pages:  ana@rs, picnic@rs */
  // - its "new designer" is a new designer
  @prop({ init: () => new Designer(), early: true })
  accessor newDesigner!: Designer

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

  @drawn draw() {
    return (
      <ui-container class="org-admin">
        <ui-stack>
          <ui-header size="large">Org Admin</ui-header>
          <ui-text color="grey">Who's in the org, who manages what, and every change, with who made it.</ui-text>
          <ui-segment class="people">
            <ui-header size="medium">People</ui-header>
            <ui-form prop:value={this.newMember}>
              <ui-input name="person" placeholder="ana@rs" aria-label="Add someone, by their address" fluid={true} action={true}>
                <ui-button class="add" slot="action" color="primary" disabled={this.newMember.person === ""} onClick={core.pressed(this, () => this.addTheNewMember())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  Add
                </ui-button>
              </ui-input>
            </ui-form>
            <ui-stack class="members" spacing="sm">
              {core.drawRead(async () => await core.savedThings(Member, {}, "as drawn"), (member: Member) => core.drawThing(member), {
                waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Finding the org's people"}</ui-loader>,
                none: () => <ui-text class="none" color="grey">Nobody yet.</ui-text>,
                failed: () => <ui-text color="red">We can't read the org's people right now.</ui-text>
              })}
            </ui-stack>
          </ui-segment>
          <ui-segment class="teams">
            <ui-header size="medium">Teams and projects</ui-header>
            <ui-form class="new-team" prop:value={this.newTeam}>
              <ui-input name="name" placeholder="Events Team" aria-label="A new team" fluid={true} action={true}>
                <ui-button class="add" slot="action" color="primary" disabled={this.newTeam.name === ""} onClick={core.pressed(this, () => this.addTheNewTeam())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  Add team
                </ui-button>
              </ui-input>
            </ui-form>
            <ui-form class="new-project" prop:value={this.newProject}>
              <ui-stack direction="horizontal">
                <ui-input name="name" placeholder="2026 Q4" aria-label="A new project" fluid={true} />
                <ui-input name="team" placeholder="events_team" aria-label="Under the team" />
              </ui-stack>
            </ui-form>
            <ui-button class="add-project" color="primary" disabled={this.newProject.name === ""} onClick={core.pressed(this, () => this.addTheNewProject())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Add project
            </ui-button>
            <ui-header size="small">Teams</ui-header>
            <ui-stack class="teams" spacing="sm">
              {core.drawRead(async () => await core.savedThings(Team, {}, "as drawn"), (team: Team) => core.drawThing(team), { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Finding the teams"}</ui-loader> })}
            </ui-stack>
            <ui-header size="small">Projects</ui-header>
            <ui-stack class="projects" spacing="sm">
              {core.drawRead(async () => await core.savedThings(Project, {}, "as drawn"), (project: Project) => core.drawThing(project), { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Finding the projects"}</ui-loader> })}
            </ui-stack>
          </ui-segment>
          <ui-segment class="roles">
            <ui-header size="medium">Who manages what</ui-header>
            <ui-form prop:value={this.newTerm}>
              <ui-stack direction="horizontal" wrap={true}>
                <ui-input name="holder" placeholder="bo@rs" aria-label="Who:  a person, or a team" />
                <ui-input name="role" placeholder="team-manager" aria-label="Role" />
                <ui-input name="manages" placeholder="events_team" aria-label="Of" />
                <ui-input name="ends" placeholder="2027-06-30" aria-label="Until" />
              </ui-stack>
            </ui-form>
            <ui-button class="give" color="primary" disabled={this.newTerm.holder === ""} onClick={core.pressed(this, () => this.giveTheNewTerm())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Name them
            </ui-button>
            <ui-stack class="terms" spacing="sm">
              {core.drawRead(async () => await core.savedThings(Term, {}, "as drawn"), (term: Term) => core.drawThing(term), { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Finding who manages what"}</ui-loader> })}
            </ui-stack>
          </ui-segment>
          <ui-segment class="designers">
            <ui-header size="medium">Who designs what</ui-header>
            <ui-text color="grey">
              {"They change a space's pages, whatever their role there;  its Managers publish them."}
            </ui-text>
            <ui-form prop:value={this.newDesigner}>
              <ui-stack direction="horizontal">
                <ui-input name="person" placeholder="ana@rs" aria-label="Who" fluid={true} />
                <ui-input name="space" placeholder="picnic@rs" aria-label="Designs" />
              </ui-stack>
            </ui-form>
            <ui-button class="design" color="primary" disabled={this.newDesigner.person === ""} onClick={core.pressed(this, () => this.addTheNewDesigner())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Let them design it
            </ui-button>
            <ui-stack class="designers" spacing="sm">
              {core.drawRead(async () => await core.savedThings(Designer, {}, "as drawn"), (designer: Designer) => core.drawThing(designer), { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Finding who designs what"}</ui-loader> })}
            </ui-stack>
          </ui-segment>
          <ui-segment class="apps">
            <ui-header size="medium">Approved apps</ui-header>
            <ui-form prop:value={this.newApp}>
              <ui-stack direction="horizontal">
                <ui-input name="name" placeholder="@spell/sign-up-sheet" aria-label="App" fluid={true} />
                <ui-input name="version" placeholder="1.0.0" aria-label="Version" />
              </ui-stack>
            </ui-form>
            <ui-button class="approve" color="primary" disabled={this.newApp.name === ""} onClick={core.pressed(this, () => this.approveTheNewApp())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Approve
            </ui-button>
            <ui-stack class="approved" spacing="sm">
              {core.drawRead(async () => await core.savedThings(ApprovedApp, {}, "as drawn"), (app: ApprovedApp) => core.drawThing(app), { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Finding the approved apps"}</ui-loader> })}
            </ui-stack>
          </ui-segment>
          <ui-segment class="log">
            <ui-header size="medium">Log</ui-header>
            <ui-stack class="changes" spacing="sm">
              {core.drawRead(async () => await core.savedThings(RoleChange, {}, "as drawn"), (change: RoleChange) => core.drawThing(change), { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Reading the log"}</ui-loader> })}
            </ui-stack>
          </ui-segment>
        </ui-stack>
      </ui-container>
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
    { name: "new-designer", kind: "json", description: "Its newDesigner." }
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
}
core.useElement(OrgAdmin, OrgAdminElement)
export const orgAdmin = new OrgAdmin()
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
