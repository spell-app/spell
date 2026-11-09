import { core, Thing, App, Place, h } from "@spell/core"

core.heading("Org Admin:  where an org's roles are kept")
///////////////////////////////////////////////
// ## Org Admin:  where an org's roles are kept
///////////////////////////////////////////////

/** The org itself, for the page's title and as a space to design. */
export class OrgProfile extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 647, end: 665 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "space" is text
  static { this.declareProp("space", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 669, end: 688 } }) }
  get space() { return this.getProp("space") }
  set space(value) { this.setProp("space", value) }

  static savedIn = {
    place: "admin_roles",
    collection: "org_profiles",
    times: ["created", "modified"], select: ["name", "space"] }

  // - it lives in admin roles
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 620, end: 643 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in admin roles
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 620, end: 643 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Member extends Thing {
  // - its "person" is text
  static { this.declareProp("person", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 743, end: 763 } }) }
  get person() { return this.getProp("person") }
  set person(value) { this.setProp("person", value) }

  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 767, end: 785 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "role" is text
  static { this.declareProp("role", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 789, end: 807 } }) }
  get role() { return this.getProp("role") }
  set role(value) { this.setProp("role", value) }

  // - its "role name" is text
  static { this.declareProp("roleName", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 811, end: 834 } }) }
  get roleName() { return this.getProp("roleName") }
  set roleName(value) { this.setProp("roleName", value) }

  static savedIn = {
    place: "admin_roles",
    collection: "members",
    times: ["created", "modified"]
  }

  // - it lives in admin roles
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 716, end: 739 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in admin roles
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 716, end: 739 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Team extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 887, end: 905 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "space" is text
  static { this.declareProp("space", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 909, end: 928 } }) }
  get space() { return this.getProp("space") }
  set space(value) { this.setProp("space", value) }

  static savedIn = {
    place: "admin_roles",
    collection: "teams",
    times: ["created", "modified"]
  }

  // - it lives in admin roles
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 860, end: 883 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in admin roles
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 860, end: 883 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Project extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 984, end: 1002 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "team" is text
  static { this.declareProp("team", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1006, end: 1024 } }) }
  get team() { return this.getProp("team") }
  set team(value) { this.setProp("team", value) }

  // - its "space" is text
  static { this.declareProp("space", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1028, end: 1047 } }) }
  get space() { return this.getProp("space") }
  set space(value) { this.setProp("space", value) }

  static savedIn = {
    place: "admin_roles",
    collection: "projects",
    times: ["created", "modified"]
  }

  // - it lives in admin roles
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 957, end: 980 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in admin roles
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 957, end: 980 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class OrgRole extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1105, end: 1123 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "manages" is text
  static { this.declareProp("manages", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1127, end: 1148 } }) }
  get manages() { return this.getProp("manages") }
  set manages(value) { this.setProp("manages", value) }

  static savedIn = {
    place: "admin_roles",
    collection: "org_roles",
    times: ["created", "modified"], select: ["name", "manages"] }

  // - it lives in admin roles
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 1078, end: 1101 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in admin roles
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 1078, end: 1101 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Term extends Thing {
  // - its "role" is text
  static { this.declareProp("role", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1201, end: 1219 } }) }
  get role() { return this.getProp("role") }
  set role(value) { this.setProp("role", value) }

  // - its "holder" is text
  static { this.declareProp("holder", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1223, end: 1243 } }) }
  get holder() { return this.getProp("holder") }
  set holder(value) { this.setProp("holder", value) }

  // - its "manages" is text
  static { this.declareProp("manages", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1247, end: 1268 } }) }
  get manages() { return this.getProp("manages") }
  set manages(value) { this.setProp("manages", value) }

  // - its "role name" is text
  static { this.declareProp("roleName", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1272, end: 1295 } }) }
  get roleName() { return this.getProp("roleName") }
  set roleName(value) { this.setProp("roleName", value) }

  // - its "holder name" is text
  static { this.declareProp("holderName", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1299, end: 1324 } }) }
  get holderName() { return this.getProp("holderName") }
  set holderName(value) { this.setProp("holderName", value) }

  // - its "manages name" is text
  static { this.declareProp("managesName", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1328, end: 1354 } }) }
  get managesName() { return this.getProp("managesName") }
  set managesName(value) { this.setProp("managesName", value) }

  // - its "starts" is text
  static { this.declareProp("starts", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1358, end: 1378 } }) }
  get starts() { return this.getProp("starts") }
  set starts(value) { this.setProp("starts", value) }

  // - its "ends" is text
  static { this.declareProp("ends", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1382, end: 1400 } }) }
  get ends() { return this.getProp("ends") }
  set ends(value) { this.setProp("ends", value) }

  static savedIn = {
    place: "admin_roles",
    collection: "terms",
    times: ["created", "modified"]
  }

  // - it lives in admin roles
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 1174, end: 1197 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in admin roles
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 1174, end: 1197 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class ApprovedApp extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1462, end: 1480 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "version" is text
  static { this.declareProp("version", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1484, end: 1505 } }) }
  get version() { return this.getProp("version") }
  set version(value) { this.setProp("version", value) }

  static savedIn = {
    place: "admin_roles",
    collection: "approved_apps",
    times: ["created", "modified"]
  }

  // - it lives in admin roles
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 1435, end: 1458 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in admin roles
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 1435, end: 1458 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

/** A designer changes a space's pages and source, whatever their role there:  a Manager publishes them. */
export class Designer extends Thing {
  // - its "person" is text
  static { this.declareProp("person", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1666, end: 1686 } }) }
  get person() { return this.getProp("person") }
  set person(value) { this.setProp("person", value) }

  // - its "space" is text
  static { this.declareProp("space", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1690, end: 1709 } }) }
  get space() { return this.getProp("space") }
  set space(value) { this.setProp("space", value) }

  // - its "person name" is text
  static { this.declareProp("personName", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1713, end: 1738 } }) }
  get personName() { return this.getProp("personName") }
  set personName(value) { this.setProp("personName", value) }

  static savedIn = {
    place: "admin_roles",
    collection: "designers",
    times: ["created", "modified"]
  }

  // - it lives in admin roles
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 1639, end: 1662 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in admin roles
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 1639, end: 1662 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

/** An event's stages, in order (its place calls them event stages):  who moves an event into each is "the team" or "its organizers". */
export class Stage extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1925, end: 1943 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "moves to" is text
  static { this.declareProp("movesTo", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1947, end: 1969 } }) }
  get movesTo() { return this.getProp("movesTo") }
  set movesTo(value) { this.setProp("movesTo", value) }

  // - its "moved by" is text
  static { this.declareProp("movedBy", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1973, end: 1995 } }) }
  get movedBy() { return this.getProp("movedBy") }
  set movedBy(value) { this.setProp("movedBy", value) }

  static savedIn = {
    place: "admin_roles",
    collection: "stages",
    times: ["created", "modified"]
  }

  // - it lives in admin roles
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 1898, end: 1921 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in admin roles
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 1898, end: 1921 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class RoleChange extends Thing {
  // - its "at" is text
  static { this.declareProp("at", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 2055, end: 2071 } }) }
  get at() { return this.getProp("at") }
  set at(value) { this.setProp("at", value) }

  // - its "who" is text
  static { this.declareProp("who", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 2075, end: 2092 } }) }
  get who() { return this.getProp("who") }
  set who(value) { this.setProp("who", value) }

  // - its "did" is text
  static { this.declareProp("did", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 2096, end: 2113 } }) }
  get did() { return this.getProp("did") }
  set did(value) { this.setProp("did", value) }

  // - its "what" is text
  static { this.declareProp("what", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 2117, end: 2135 } }) }
  get what() { return this.getProp("what") }
  set what(value) { this.setProp("what", value) }

  // - its "why" is text
  static { this.declareProp("why", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 2139, end: 2156 } }) }
  get why() { return this.getProp("why") }
  set why(value) { this.setProp("why", value) }

  static savedIn = {
    place: "admin_roles",
    collection: "role_changes",
    times: ["created", "modified"], select: ["at", "who", "did", "what", "why"] }

  // - it lives in admin roles
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 2028, end: 2051 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in admin roles
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/OrgAdmin.api.spell", start: 2028, end: 2051 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
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
  static { this.declareProp("newMember", { init: () => new Member(), early: true }) }
  get newMember() { return this.getProp("newMember") }
  set newMember(value) { this.setProp("newMember", value) }

  /** A new standing team, by its name */
  // - its "new team" is a new team
  static { this.declareProp("newTeam", { init: () => new Team(), early: true }) }
  get newTeam() { return this.getProp("newTeam") }
  set newTeam(value) { this.setProp("newTeam", value) }

  /** A new project, under a team or, with none picked, the org itself */
  // - its "new project" is a new project
  static { this.declareProp("newProject", { init: () => new Project(), early: true }) }
  get newProject() { return this.getProp("newProject") }
  set newProject(value) { this.setProp("newProject", value) }

  // - its "new term" is a new term
  static { this.declareProp("newTerm", { init: () => new Term(), early: true }) }
  get newTerm() { return this.getProp("newTerm") }
  set newTerm(value) { this.setProp("newTerm", value) }

  // - its "new app" is a new approved app
  static { this.declareProp("newApp", { init: () => new ApprovedApp(), early: true }) }
  get newApp() { return this.getProp("newApp") }
  set newApp(value) { this.setProp("newApp", value) }

  /** Who designs which space's pages */
  // - its "new designer" is a new designer
  static { this.declareProp("newDesigner", { init: () => new Designer(), early: true }) }
  get newDesigner() { return this.getProp("newDesigner") }
  set newDesigner(value) { this.setProp("newDesigner", value) }

  /** A stage an event goes through:  its name changes the stage of that name, or adds one before the last */
  // - its "new stage" is a new stage
  static { this.declareProp("newStage", { init: () => new Stage(), early: true }) }
  get newStage() { return this.getProp("newStage") }
  set newStage(value) { this.setProp("newStage", value) }

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
  draw() {
    return h("ui-stack", { class: "org-admin", spacing: "none" },
      h("ui-toolbar", { class: "top-bar", appearance: "text", "aria-label": "Org Admin" },
        () => core.drawRead(async () => await core.savedThings(OrgProfile, {}, "as drawn"), (org) => h("ui-text", { slot: "title", size: "large" }, () => org.name, " Admin")),
        h("ui-item", { link: "OrgChat" }, "Chat"),
        h("ui-item", { link: "OrgFeed" }, "Feed"),
        h("ui-item", { link: "Inbox" }, "Inbox"),
        h("ui-stack", { slot: "right", direction: "horizontal" }, () => core.signInMenu())
      ),
      h("ui-tabs", {
        class: "body",
        parameter: "section",
        direction: "vertical",
        appearance: "secondary",
        "aria-label": "Sections"
      },
        h("ui-tab", { label: "People", icon: "users", value: "people" }, () => this.drawPeopleSection()),
        h("ui-tab", { label: "Teams and projects", icon: "sitemap", value: "teams" },
          () => this.drawTeamsSection()
        ),
        h("ui-tab", { label: "Who manages what", icon: "user tie", value: "roles" },
          () => this.drawRolesSection()
        ),
        h("ui-tab", { label: "Who designs what", icon: "paint brush", value: "designers" },
          () => this.drawDesignersSection()
        ),
        h("ui-tab", { label: "Approved apps", icon: "check circle outline", value: "apps" },
          () => this.drawAppsSection()
        ),
        h("ui-tab", { label: "Event stages", icon: "stream", value: "stages" },
          () => this.drawStagesSection()
        ),
        h("ui-tab", { label: "Log", icon: "history", value: "log" }, () => this.drawLogSection())
      )
    )
  }

  drawPeopleSection() {
    return h("ui-stack", { class: "people", part: "people_section" },
      h("ui-header", { size: "medium" }, "People"),
      h("ui-form", { class: "add", "prop:value": () => this.newMember },
        h("ui-input", {
          name: "person",
          placeholder: "Add someone, by their address:  ana@rs",
          "aria-label": "Add someone, by their address",
          fluid: true,
          action: true
        },
          h("ui-button", {
            class: "add",
            slot: "action",
            color: "primary",
            disabled: () => this.newMember.person === "",
            title: "Add them to the org",
            onClick: core.pressed(this, () => this.addTheNewMember()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Add")
        )
      ),
      () => core.drawRead(async () => await core.savedThings(Member, { sort: [{ field: "name" }] }, "as drawn"), (member) => [
        h("ui-cell", { "data-column": "Name" }, () => member.name),
        h("ui-cell", { "data-column": "Address" }, h("ui-text", { color: "grey" }, () => member.person)),
        h("ui-cell", { "data-column": "Role" }, h("ui-label", { size: "small" }, () => member.roleName)),
        h("ui-cell", { "data-column": "" },
          h("ui-button", {
            class: "remove",
            icon: "close",
            size: "mini",
            appearance: "transparent",
            "aria-label": "Take them out of the org",
            title: "Take them out of the org",
            onClick: core.pressed(this, () => core.removeSaved(member)),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          })
        )
      ], {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "people_section" },
          "Finding the org's people"
        ),
        items: () => h("ui-table", { appearance: "very-basic", selectable: true, unstackable: true, part: "people_section" },
          h("ui-row")
        ),
        none: () => h("ui-text", { class: "none", color: "grey", part: "people_section" }, "Nobody yet."),
        failed: () => h("ui-text", { color: "red", part: "people_section" }, "We can't read the org's people right now.")
      })
    )
  }

  drawTeamsSection() {
    return h("ui-stack", { class: "teams", part: "teams_section" },
      h("ui-header", { size: "medium" }, "Teams"),
      h("ui-form", { class: "add new-team", "prop:value": () => this.newTeam },
        h("ui-input", {
          name: "name",
          placeholder: "A new team:  Events Team",
          "aria-label": "A new team",
          fluid: true,
          action: true
        },
          h("ui-button", {
            class: "add",
            slot: "action",
            color: "primary",
            disabled: () => this.newTeam.name === "",
            title: "Add this team",
            onClick: core.pressed(this, () => this.addTheNewTeam()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Add team")
        )
      ),
      () => core.drawRead(async () => await core.savedThings(Team, { sort: [{ field: "name" }] }, "as drawn"), (team) => [
        h("ui-cell", { "data-column": "Name" }, () => team.name),
        h("ui-cell", { "data-column": "Space" }, h("ui-text", { color: "grey" }, () => team.space))
      ], {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "teams_section" },
          "Finding the teams"
        ),
        items: () => h("ui-table", { appearance: "very-basic", selectable: true, unstackable: true, part: "teams_section" },
          h("ui-row")
        ),
        none: () => h("ui-text", { class: "none", color: "grey", part: "teams_section" }, "No teams yet.")
      }),
      h("ui-header", { size: "medium" }, "Projects"),
      h("ui-form", { class: "add new-project", "prop:value": () => this.newProject },
        h("ui-stack", { class: "row", direction: "horizontal", align: "center", wrap: true },
          h("ui-input", { name: "name", placeholder: "A new project:  2026 Q4", "aria-label": "A new project", fluid: true }),
          h("ui-select", { name: "team", placeholder: "Under the org itself", "aria-label": "Under the team" },
            () => core.drawRead(async () => await core.savedThings(Team, { sort: [{ field: "name" }] }, "as drawn"), (team) => h("ui-item", { value: () => team.id, part: "teams_section" }, () => team.name))
          ),
          h("ui-button", {
            class: "add-project",
            color: "primary",
            title: "Add this project",
            disabled: () => this.newProject.name === "",
            onClick: core.pressed(this, () => this.addTheNewProject()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Add project")
        )
      ),
      () => core.drawRead(async () => await core.savedThings(Project, { sort: [{ field: "name" }] }, "as drawn"), (project) => [
        h("ui-cell", { "data-column": "Name" }, () => project.name),
        h("ui-cell", { "data-column": "Under" }, () => project.team),
        h("ui-cell", { "data-column": "Space" }, h("ui-text", { color: "grey" }, () => project.space))
      ], {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "teams_section" },
          "Finding the projects"
        ),
        items: () => h("ui-table", { appearance: "very-basic", selectable: true, unstackable: true, part: "teams_section" },
          h("ui-row")
        ),
        none: () => h("ui-text", { class: "none", color: "grey", part: "teams_section" }, "No projects yet.")
      })
    )
  }

  drawRolesSection() {
    return h("ui-stack", { class: "roles", part: "roles_section" },
      h("ui-header", { size: "medium" }, "Who manages what"),
      h("ui-form", { class: "add", "prop:value": () => this.newTerm },
        h("ui-stack", { class: "row", direction: "horizontal", align: "center", wrap: true },
          h("ui-select", { name: "holder", placeholder: "Who", "aria-label": "Who:  a person, or a team" },
            () => core.drawRead(async () => await core.savedThings(Member, { sort: [{ field: "name" }] }, "as drawn"), (member) => h("ui-item", { value: () => member.person, part: "roles_section" }, () => member.name)),
            () => core.drawRead(async () => await core.savedThings(Team, { sort: [{ field: "name" }] }, "as drawn"), (team) => h("ui-item", { value: () => team.id, part: "roles_section" }, () => team.name))
          ),
          h("ui-select", { name: "role", placeholder: "Role", "aria-label": "Role" },
            () => core.drawRead(async () => await core.savedThings(OrgRole, {}, "as drawn"), (one) => h("ui-item", { value: () => one.id, part: "roles_section" }, () => one.name))
          ),
          h("ui-select", { name: "manages", placeholder: "The whole org", "aria-label": "Of" },
            () => core.drawRead(async () => await core.savedThings(Team, { sort: [{ field: "name" }] }, "as drawn"), (team) => h("ui-item", { value: () => team.id, part: "roles_section" }, () => team.name)),
            () => core.drawRead(async () => await core.savedThings(Project, { sort: [{ field: "name" }] }, "as drawn"), (project) => h("ui-item", { value: () => project.id, part: "roles_section" }, () => project.name))
          ),
          h("ui-input", { name: "ends", type: "date", "aria-label": "Until" }),
          h("ui-button", {
            class: "give",
            color: "primary",
            title: "Give them this role",
            disabled: () => this.newTerm.holder === "",
            onClick: core.pressed(this, () => this.giveTheNewTerm()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Name them")
        )
      ),
      () => core.drawRead(async () => await core.savedThings(Term, {}, "as drawn"), (term) => [
        h("ui-cell", { class: "holder", "data-column": "Who", title: () => term.holder },
          () => term.holderName
        ),
        h("ui-cell", { "data-column": "Role" }, h("ui-label", { size: "small" }, () => term.roleName)),
        h("ui-cell", { "data-column": "Of" }, () => term.managesName),
        h("ui-cell", { "data-column": "Since" }, () => term.starts),
        h("ui-cell", { "data-column": "Until" }, () => term.ends),
        h("ui-cell", { "data-column": "" },
          h("ui-button", {
            class: "end",
            icon: "close",
            size: "mini",
            appearance: "transparent",
            "aria-label": "End this term",
            title: "End this term:  its record stays in the log",
            onClick: core.pressed(this, () => core.removeSaved(term)),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          })
        )
      ], {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "roles_section" },
          "Finding who manages what"
        ),
        items: () => h("ui-table", { appearance: "very-basic", selectable: true, unstackable: true, part: "roles_section" },
          h("ui-row")
        ),
        none: () => h("ui-text", { class: "none", color: "grey", part: "roles_section" }, "Nobody's been named yet.")
      })
    )
  }

  drawDesignersSection() {
    return h("ui-stack", { class: "designers", part: "designers_section" },
      h("ui-header", { size: "medium" }, "Who designs what"),
      h("ui-text", { color: "grey" },
        "They change a space's pages, whatever their role there;  its Managers publish them."
      ),
      h("ui-form", { class: "add", "prop:value": () => this.newDesigner },
        h("ui-stack", { class: "row", direction: "horizontal", align: "center", wrap: true },
          h("ui-select", { name: "person", placeholder: "Who", "aria-label": "Who" },
            () => core.drawRead(async () => await core.savedThings(Member, { sort: [{ field: "name" }] }, "as drawn"), (member) => h("ui-item", { value: () => member.person, part: "designers_section" }, () => member.name))
          ),
          h("ui-select", { name: "space", placeholder: "Designs", "aria-label": "Designs" },
            () => core.drawRead(async () => await core.savedThings(OrgProfile, {}, "as drawn"), (org) => h("ui-item", { value: () => org.space, part: "designers_section" }, () => org.name)),
            () => core.drawRead(async () => await core.savedThings(Team, { sort: [{ field: "name" }] }, "as drawn"), (team) => h("ui-item", { value: () => team.space, part: "designers_section" }, () => team.name)),
            () => core.drawRead(async () => await core.savedThings(Project, { sort: [{ field: "name" }] }, "as drawn"), (project) => h("ui-item", { value: () => project.space, part: "designers_section" }, () => project.name))
          ),
          h("ui-button", {
            class: "design",
            color: "primary",
            title: "Let them change this space's pages",
            disabled: () => this.newDesigner.person === "",
            onClick: core.pressed(this, () => this.addTheNewDesigner()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Let them design it")
        )
      ),
      () => core.drawRead(async () => await core.savedThings(Designer, {}, "as drawn"), (designer) => [
        h("ui-cell", { "data-column": "Who", title: () => designer.person }, () => designer.personName),
        h("ui-cell", { "data-column": "Designs" }, h("ui-text", { color: "grey" }, () => designer.space)),
        h("ui-cell", { "data-column": "" },
          h("ui-button", {
            class: "undesign",
            icon: "close",
            size: "mini",
            appearance: "transparent",
            "aria-label": "No longer designs it",
            title: "No longer designs it:  their drafts stay, for a Manager",
            onClick: core.pressed(this, () => core.removeSaved(designer)),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          })
        )
      ], {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "designers_section" },
          "Finding who designs what"
        ),
        items: () => h("ui-table", { appearance: "very-basic", selectable: true, unstackable: true, part: "designers_section" },
          h("ui-row")
        ),
        none: () => h("ui-text", { class: "none", color: "grey", part: "designers_section" },
          "Only each space's Managers, so far."
        )
      })
    )
  }

  drawAppsSection() {
    return h("ui-stack", { class: "apps", part: "apps_section" },
      h("ui-header", { size: "medium" }, "Approved apps"),
      h("ui-form", { class: "add", "prop:value": () => this.newApp },
        h("ui-stack", { class: "row", direction: "horizontal", align: "center", wrap: true },
          h("ui-input", { name: "name", placeholder: "@spell/sign-up-sheet", "aria-label": "App", fluid: true }),
          h("ui-input", { name: "version", placeholder: "1.0.0", "aria-label": "Version" }),
          h("ui-button", {
            class: "approve",
            color: "primary",
            title: "Let this org's spaces install it",
            disabled: () => this.newApp.name === "",
            onClick: core.pressed(this, () => this.approveTheNewApp()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Approve")
        )
      ),
      () => core.drawRead(async () => await core.savedThings(ApprovedApp, {}, "as drawn"), (app) => [
        h("ui-cell", { "data-column": "App" }, () => app.name),
        h("ui-cell", { "data-column": "Version" }, () => app.version),
        h("ui-cell", { "data-column": "" },
          h("ui-button", {
            class: "unapprove",
            icon: "close",
            size: "mini",
            appearance: "transparent",
            "aria-label": "Take it off the list",
            title: "Take it off the list",
            onClick: core.pressed(this, () => core.removeSaved(app)),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          })
        )
      ], {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "apps_section" },
          "Finding the approved apps"
        ),
        items: () => h("ui-table", { appearance: "very-basic", selectable: true, unstackable: true, part: "apps_section" },
          h("ui-row")
        ),
        none: () => h("ui-text", { class: "none", color: "grey", part: "apps_section" }, "No apps approved yet.")
      })
    )
  }

  drawStagesSection() {
    return h("ui-stack", { class: "stages", part: "stages_section" },
      h("ui-header", { size: "medium" }, "Event stages"),
      h("ui-form", { class: "add", "prop:value": () => this.newStage },
        h("ui-stack", { class: "row", direction: "horizontal", align: "center", wrap: true },
          h("ui-input", { name: "name", placeholder: "A stage:  Rehearsal", "aria-label": "Stage", fluid: true }),
          h("ui-select", { name: "moves to", placeholder: "Moves to", "aria-label": "Moves to" },
            () => core.drawRead(async () => await core.savedThings(Stage, {}, "as drawn"), (stage) => h("ui-item", { value: () => stage.id, part: "stages_section" }, () => stage.name))
          ),
          h("ui-select", { name: "moved by", placeholder: "Moved by", "aria-label": "Moved by" },
            h("ui-item", { value: "the team" }, "The team"),
            h("ui-item", { value: "its organizers" }, "Its organizers")
          ),
          h("ui-button", {
            class: "stage-it",
            color: "primary",
            title: "Add this stage, or change the one of that name",
            disabled: () => this.newStage.name === "",
            onClick: core.pressed(this, () => this.addTheNewStage()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Add or change")
        )
      ),
      () => core.drawRead(async () => await core.savedThings(Stage, {}, "as drawn"), (stage) => [
        h("ui-cell", { "data-column": "Stage" }, () => stage.name),
        h("ui-cell", { "data-column": "Moves to" }, h("ui-text", { color: "grey" }, () => stage.movesTo)),
        h("ui-cell", { "data-column": "Moved by" }, () => stage.movedBy),
        h("ui-cell", { "data-column": "" },
          h("ui-button", {
            class: "unstage",
            icon: "close",
            size: "mini",
            appearance: "transparent",
            "aria-label": "Remove this stage",
            title: "Remove this stage:  not while an event is in it, or another moves to it",
            onClick: core.pressed(this, () => core.removeSaved(stage)),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          })
        )
      ], { waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "stages_section" },
        "Finding the event stages"
      ), items: () => h("ui-table", { appearance: "very-basic", selectable: true, unstackable: true, part: "stages_section" },
        h("ui-row")
      ) })
    )
  }

  drawLogSection() {
    return h("ui-stack", { class: "log", part: "log_section" },
      h("ui-header", { size: "medium" }, "Log"),
      () => core.drawRead(async () => await core.savedThings(RoleChange, { sort: [{ field: "at", descending: true }] }, "as drawn"), (change) => [
        h("ui-cell", { "data-column": "When" }, h("ui-text", { color: "grey" }, () => change.at)),
        h("ui-cell", { "data-column": "Who" }, () => change.who),
        h("ui-cell", { "data-column": "Did" }, h("ui-label", { size: "small" }, () => change.did)),
        h("ui-cell", { "data-column": "What" }, () => change.what),
        h("ui-cell", { "data-column": "Why" }, () => change.why)
      ], {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "log_section" }, "Reading the log"),
        items: () => h("ui-table", { appearance: "very-basic", unstackable: true, part: "log_section" }, h("ui-row")),
        none: () => h("ui-text", { class: "none", color: "grey", part: "log_section" }, "Nothing's changed yet.")
      })
    )
  }
}
export const orgAdmin = new OrgAdmin()
// -----------
core.installStyles(undefined, `/* The page takes the theme's colours and type, light or dark, as its controls do. */¬.org-admin {¬  min-height: 100%;¬  color: CanvasText;¬  background: var(--ui-background);¬  font-family: var(--ui-font-family);¬}¬¬/* The section showing stands a little apart from the list of them. */¬.org-admin ui-tab {¬  margin-inline-start: 1rem;¬}¬¬/* The toolbar:  a rule below it, its title over the sections' labels. */¬.org-admin .top-bar {¬  padding-inline: 15px 0;¬  border-block-end: var(--ui-border-width, 1px) solid var(--ui-border-color);¬  margin-block-end: 0.75rem;¬  --ui-menu-item-padding: 0.5em 0.6em;¬}¬.org-admin .top-bar::part(menu) {¬  margin-block: 0;¬}¬.org-admin .top-bar::part(title) {¬  margin-inline-end: 12px;¬}¬¬/* Tables scroll inside themselves on a narrow page, rather than breaking a date in two. */¬.org-admin ui-row > ui-cell {¬  color: CanvasText;¬  white-space: nowrap;¬  min-inline-size: max-content;¬}¬¬/* An add form:  its button keeps its size as the row wraps. */¬.org-admin .add .row > ui-button {¬  flex: none;¬}¬¬/* A row's take-away button stays quiet until the row is pointed at, or the button has the keyboard. */¬.org-admin ui-table ui-button[icon="close"] {¬  opacity: 0;¬}¬.org-admin ui-table ui-row:hover ui-button[icon="close"],¬.org-admin ui-table ui-button[icon="close"]:focus-within {¬  opacity: 1;¬}¬¬/* A phone has nothing to point with. */¬@media (hover: none) {¬  .org-admin ui-table ui-button[icon="close"] {¬    opacity: 1;¬  }¬}¬¬/* Too narrow for the sections to sit beside what they show:  they go above it. */¬@media (max-width: 640px) {¬  .org-admin ui-tab {¬    min-width: 100%;¬    margin-inline-start: 0;¬    margin-block-start: 0.75rem;¬  }¬}¬`)
// -----------
if (!core.isCarryingOver) orgAdmin.start()
