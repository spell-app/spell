import { core, Thing, App, Place, h } from "@spell/core"

core.heading("Org Admin:  where an org's roles are kept")
///////////////////////////////////////////////
// ## Org Admin:  where an org's roles are kept
///////////////////////////////////////////////

export class Member extends Thing {
  // - its "person" is text
  static { this.declareProp("person", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 542, end: 562 } }) }
  get person() { return this.getProp("person") }
  set person(value) { this.setProp("person", value) }

  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 566, end: 584 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "role" is text
  static { this.declareProp("role", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 588, end: 606 } }) }
  get role() { return this.getProp("role") }
  set role(value) { this.setProp("role", value) }

  draw() {
    return h("ui-stack", { class: "member", direction: "horizontal", spacing: "md", align: "center", wrap: true },
      h("ui-text", () => this.name),
      h("ui-text", { color: "grey" }, () => this.person),
      h("ui-text", () => this.role),
      h("ui-button", {
        class: "remove",
        icon: "close",
        size: "mini",
        appearance: "transparent",
        "aria-label": "Take them out of the org",
        title: "Take them out of the org",
        onClick: core.pressed(this, () => core.removeSaved(this)),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
      })
    )
  }

  static savedIn = { place: "admin_roles", collection: "members" }
}

export class Team extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 659, end: 677 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  draw() {
    return h("ui-stack", { class: "team", direction: "horizontal", spacing: "md", align: "center", wrap: true },
      h("ui-text", () => this.name)
    )
  }

  static savedIn = { place: "admin_roles", collection: "teams" }
}

export class Project extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 733, end: 751 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "team" is text
  static { this.declareProp("team", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 755, end: 773 } }) }
  get team() { return this.getProp("team") }
  set team(value) { this.setProp("team", value) }

  draw() {
    return h("ui-stack", { class: "project", direction: "horizontal", spacing: "md", align: "center", wrap: true },
      h("ui-text", () => this.name),
      h("ui-text", () => this.team)
    )
  }

  static savedIn = { place: "admin_roles", collection: "projects" }
}

export class OrgRole extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 831, end: 849 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "manages" is text
  static { this.declareProp("manages", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 853, end: 874 } }) }
  get manages() { return this.getProp("manages") }
  set manages(value) { this.setProp("manages", value) }

  static savedIn = { place: "admin_roles", collection: "org_roles" }
}

export class Term extends Thing {
  // - its "role" is text
  static { this.declareProp("role", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 927, end: 945 } }) }
  get role() { return this.getProp("role") }
  set role(value) { this.setProp("role", value) }

  // - its "holder" is text
  static { this.declareProp("holder", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 949, end: 969 } }) }
  get holder() { return this.getProp("holder") }
  set holder(value) { this.setProp("holder", value) }

  // - its "manages" is text
  static { this.declareProp("manages", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 973, end: 994 } }) }
  get manages() { return this.getProp("manages") }
  set manages(value) { this.setProp("manages", value) }

  // - its "starts" is text
  static { this.declareProp("starts", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 998, end: 1018 } }) }
  get starts() { return this.getProp("starts") }
  set starts(value) { this.setProp("starts", value) }

  // - its "ends" is text
  static { this.declareProp("ends", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1022, end: 1040 } }) }
  get ends() { return this.getProp("ends") }
  set ends(value) { this.setProp("ends", value) }

  draw() {
    return h("ui-stack", { class: "term", direction: "horizontal", spacing: "md", align: "center", wrap: true },
      h("ui-text", () => this.holder),
      h("ui-text", () => this.role),
      h("ui-text", () => this.manages),
      h("ui-text", () => this.starts),
      h("ui-text", () => this.ends),
      h("ui-button", {
        class: "end",
        icon: "close",
        size: "mini",
        appearance: "transparent",
        "aria-label": "End this term",
        title: "End this term:  its record stays in the log",
        onClick: core.pressed(this, () => core.removeSaved(this)),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
      })
    )
  }

  static savedIn = { place: "admin_roles", collection: "terms" }
}

export class ApprovedApp extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1102, end: 1120 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "version" is text
  static { this.declareProp("version", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1124, end: 1145 } }) }
  get version() { return this.getProp("version") }
  set version(value) { this.setProp("version", value) }

  draw() {
    return h("ui-stack", { class: "app", direction: "horizontal", spacing: "md", align: "center", wrap: true },
      h("ui-text", () => this.name),
      h("ui-text", () => this.version),
      h("ui-button", {
        class: "unapprove",
        icon: "close",
        size: "mini",
        appearance: "transparent",
        "aria-label": "Take it off the list",
        title: "Take it off the list",
        onClick: core.pressed(this, () => core.removeSaved(this)),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
      })
    )
  }

  static savedIn = { place: "admin_roles", collection: "approved_apps" }
}

export class RoleChange extends Thing {
  // - its "at" is text
  static { this.declareProp("at", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1205, end: 1221 } }) }
  get at() { return this.getProp("at") }
  set at(value) { this.setProp("at", value) }

  // - its "who" is text
  static { this.declareProp("who", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1225, end: 1242 } }) }
  get who() { return this.getProp("who") }
  set who(value) { this.setProp("who", value) }

  // - its "did" is text
  static { this.declareProp("did", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1246, end: 1263 } }) }
  get did() { return this.getProp("did") }
  set did(value) { this.setProp("did", value) }

  // - its "what" is text
  static { this.declareProp("what", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1267, end: 1285 } }) }
  get what() { return this.getProp("what") }
  set what(value) { this.setProp("what", value) }

  // - its "why" is text
  static { this.declareProp("why", { type: "text", declaredAt: { path: "/OrgAdmin.api.spell", start: 1289, end: 1306 } }) }
  get why() { return this.getProp("why") }
  set why(value) { this.setProp("why", value) }

  draw() {
    return h("ui-stack", { class: "change", direction: "horizontal", spacing: "md", align: "center", wrap: true },
      h("ui-text", { color: "grey" }, () => this.at),
      h("ui-text", () => this.who),
      h("ui-label", { size: "tiny" }, () => this.did),
      h("ui-text", () => this.what),
      h("ui-text", () => this.why)
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
  checkedEvery: 30, firstReads: () => [[Member], [Team], [Project], [Term], [ApprovedApp], [RoleChange]] })

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
  static { this.declareProp("newMember", { init: () => new Member(), early: true }) }
  get newMember() { return this.getProp("newMember") }
  set newMember(value) { this.setProp("newMember", value) }

  /** A new standing team, by its name */
  // - its "new team" is a new team
  static { this.declareProp("newTeam", { init: () => new Team(), early: true }) }
  get newTeam() { return this.getProp("newTeam") }
  set newTeam(value) { this.setProp("newTeam", value) }

  /** A new project, under a team (by its folder) or, with none, the org itself */
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

  draw() {
    return h("ui-container", { class: "org-admin" },
      h("ui-stack",
        h("ui-header", { size: "large" }, "Org Admin"),
        h("ui-text", { color: "grey" },
          "Who's in the org, who manages what, and every change, with who made it."
        ),
        h("ui-segment", { class: "people" },
          h("ui-header", { size: "medium" }, "People"),
          h("ui-form", { "prop:value": () => this.newMember },
            h("ui-input", {
              name: "person",
              placeholder: "ana@rs",
              "aria-label": "Add someone, by their address",
              fluid: true,
              action: true
            },
              h("ui-button", {
                class: "add",
                slot: "action",
                color: "primary",
                disabled: () => this.newMember.person === "",
                onClick: core.pressed(this, () => this.addTheNewMember()),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "Add")
            )
          ),
          h("ui-stack", { class: "members", spacing: "sm" },
            () => core.drawRead(async () => await core.savedThings(Member, {}, "as drawn"), (member) => core.drawThing(member), {
              waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Finding the org's people"),
              none: () => h("ui-text", { class: "none", color: "grey" }, "Nobody yet."),
              failed: () => h("ui-text", { color: "red" }, "We can't read the org's people right now.")
            })
          )
        ),
        h("ui-segment", { class: "teams" },
          h("ui-header", { size: "medium" }, "Teams and projects"),
          h("ui-form", { class: "new-team", "prop:value": () => this.newTeam },
            h("ui-input", { name: "name", placeholder: "Events Team", "aria-label": "A new team", fluid: true, action: true },
              h("ui-button", {
                class: "add",
                slot: "action",
                color: "primary",
                disabled: () => this.newTeam.name === "",
                onClick: core.pressed(this, () => this.addTheNewTeam()),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "Add team")
            )
          ),
          h("ui-form", { class: "new-project", "prop:value": () => this.newProject },
            h("ui-stack", { direction: "horizontal" },
              h("ui-input", { name: "name", placeholder: "2026 Q4", "aria-label": "A new project", fluid: true }),
              h("ui-input", { name: "team", placeholder: "events_team", "aria-label": "Under the team" })
            )
          ),
          h("ui-button", {
            class: "add-project",
            color: "primary",
            disabled: () => this.newProject.name === "",
            onClick: core.pressed(this, () => this.addTheNewProject()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Add project"),
          h("ui-header", { size: "small" }, "Teams"),
          h("ui-stack", { class: "teams", spacing: "sm" },
            () => core.drawRead(async () => await core.savedThings(Team, {}, "as drawn"), (team) => core.drawThing(team), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Finding the teams") })
          ),
          h("ui-header", { size: "small" }, "Projects"),
          h("ui-stack", { class: "projects", spacing: "sm" },
            () => core.drawRead(async () => await core.savedThings(Project, {}, "as drawn"), (project) => core.drawThing(project), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Finding the projects") })
          )
        ),
        h("ui-segment", { class: "roles" },
          h("ui-header", { size: "medium" }, "Who manages what"),
          h("ui-form", { "prop:value": () => this.newTerm },
            h("ui-stack", { direction: "horizontal", wrap: true },
              h("ui-input", { name: "holder", placeholder: "bo@rs", "aria-label": "Who:  a person, or a team" }),
              h("ui-input", { name: "role", placeholder: "team-manager", "aria-label": "Role" }),
              h("ui-input", { name: "manages", placeholder: "events_team", "aria-label": "Of" }),
              h("ui-input", { name: "ends", placeholder: "2027-06-30", "aria-label": "Until" })
            )
          ),
          h("ui-button", {
            class: "give",
            color: "primary",
            disabled: () => this.newTerm.holder === "",
            onClick: core.pressed(this, () => this.giveTheNewTerm()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Name them"),
          h("ui-stack", { class: "terms", spacing: "sm" },
            () => core.drawRead(async () => await core.savedThings(Term, {}, "as drawn"), (term) => core.drawThing(term), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Finding who manages what") })
          )
        ),
        h("ui-segment", { class: "apps" },
          h("ui-header", { size: "medium" }, "Approved apps"),
          h("ui-form", { "prop:value": () => this.newApp },
            h("ui-stack", { direction: "horizontal" },
              h("ui-input", { name: "name", placeholder: "@spell/sign-up-sheet", "aria-label": "App", fluid: true }),
              h("ui-input", { name: "version", placeholder: "1.0.0", "aria-label": "Version" })
            )
          ),
          h("ui-button", {
            class: "approve",
            color: "primary",
            disabled: () => this.newApp.name === "",
            onClick: core.pressed(this, () => this.approveTheNewApp()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Approve"),
          h("ui-stack", { class: "approved", spacing: "sm" },
            () => core.drawRead(async () => await core.savedThings(ApprovedApp, {}, "as drawn"), (app) => core.drawThing(app), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Finding the approved apps") })
          )
        ),
        h("ui-segment", { class: "log" },
          h("ui-header", { size: "medium" }, "Log"),
          h("ui-stack", { class: "changes", spacing: "sm" },
            () => core.drawRead(async () => await core.savedThings(RoleChange, {}, "as drawn"), (change) => core.drawThing(change), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Reading the log") })
          )
        )
      )
    )
  }
}
export const orgAdmin = new OrgAdmin()
// -----------
if (!core.isCarryingOver) orgAdmin.start()
