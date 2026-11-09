import { Thing, List, prop } from "spell/parser/core/model"

///////////////////////////////////////////////////////////////////////////////////////
// ## People and orgs, and what they keep about each other (epic `people-and-orgs`, P7)
///////////////////////////////////////////////////////////////////////////////////////
// The library the app, the people store and the spell command share:  `@spell/library/people`.
// A person and an org are each saved in a file of their own:  a person's is `__me.json5` in their space,
// an org's `__org.json5` in its.  Everything else is saved inside what holds it.
// Every thing has an `id`, built in:  nobody declares it.

export class Person extends Thing {
  static savedInFile = true

  // - it has names as text
  @prop({ type: "text" })
  accessor names!: string

  // - it has a nickname as text
  @prop({ type: "text" })
  accessor nickname!: string

  /** Its AT Protocol id, a DID, once its account is on Spell's Spaces host:  its handle's look-up answers it (epic `atmosphere` P16). */
  // - it has a did as text
  @prop({ type: "text" })
  accessor did!: string

  /** The atmosphere (Bluesky) account they sign in with, linked to this one:  its DID, and its handle for show (epic `atmosphere` P19). */
  // - it has a sign-in-did as text
  @prop({ type: "text" })
  accessor signInDid!: string

  // - it has a sign-in-handle as text
  @prop({ type: "text" })
  accessor signInHandle!: string

  // - its "emails" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }) })
  accessor emails!: List<string>

  // - its "dates" is a list of dated-events
  @prop({ itemType: "DatedEvent", init: () => new List<DatedEvent>({ instanceType: "DatedEvent" }) })
  accessor dates!: List<DatedEvent>

  // - its "friend-lists" is a list of friend-lists
  @prop({ itemType: "FriendList", init: () => new List<FriendList>({ instanceType: "FriendList" }) })
  accessor friendLists!: List<FriendList>

  // - its "notes" is a list of notes
  @prop({ itemType: "Note", init: () => new List<Note>({ instanceType: "Note" }) })
  accessor notes!: List<Note>
}

/** What a person keeps */
export class DatedEvent extends Thing {
  // - it has a label as text
  @prop({ type: "text" })
  accessor label!: string

  // - it has a day as a date
  @prop({ type: "date" })
  accessor day!: Date

  // - its "notes" is a list of notes
  @prop({ itemType: "Note", init: () => new List<Note>({ instanceType: "Note" }) })
  accessor notes!: List<Note>
}

export class Note extends Thing {
  // - it has a title as text
  @prop({ type: "text" })
  accessor title!: string

  // - it has a body as text
  @prop({ type: "text" })
  accessor body!: string

  // - it has created as a date
  @prop({ type: "date" })
  accessor created!: Date

  // - it has a modified as date
  @prop({ type: "date" })
  accessor modified!: Date
}

export class Relationship extends Thing {
  // - it has a kind as text
  @prop({ type: "text" })
  accessor kind!: string

  // - it has a person as a person
  @prop({ type: "Person" })
  accessor person!: Person

  // - its "notes" is a list of notes
  @prop({ itemType: "Note", init: () => new List<Note>({ instanceType: "Note" }) })
  accessor notes!: List<Note>
}

export class FriendList extends Thing {
  // - it has a name as text
  @prop({ type: "text" })
  accessor name!: string

  // - its "relationships" is a list of relationships
  @prop({ itemType: "Relationship", init: () => new List<Relationship>({ instanceType: "Relationship" }) })
  accessor relationships!: List<Relationship>
}

/////////////////////////////
// ## Orgs, and who's in them
/////////////////////////////
/**
 * A membership is its own thing:  a person and their role in one org.
 * A spell-admin may change the `@spell` org's own files, once there's a permissions UI (T8).
 */
export class Org extends Thing {
  static savedInFile = true

  // - it has a name as text
  @prop({ type: "text" })
  accessor name!: string

  /** Its own domain, `rs.org`, when it has one:  its people's handles are `ana.rs.org`, not `ana.rs.spell.space` (epic `atmosphere` P16). */
  // - it has a domain as text
  @prop({ type: "text" })
  accessor domain!: string

  // - its "members" is a list of memberships
  @prop({ itemType: "Membership", init: () => new List<Membership>({ instanceType: "Membership" }) })
  accessor members!: List<Membership>
}

export type Role = (typeof Membership.Roles)[number]

/**
 * Their role in the org's spaces (epic `atmosphere` P20, Q20 A, Q21 D):  a viewer reads, an editor writes, a manager
 * also adds people.  A spell-admin is Spell's own:  a manager anywhere, who may also save into Spell UI.
 * Older files' guest, member and admin are still read:  as viewer, editor and manager.
 */
export class Membership extends Thing {
  // - it has a person as a person
  @prop({ type: "Person" })
  accessor person!: Person

  // - its "role" is one of viewer, editor, manager, spell-admin, guest, member, admin
  static Roles = ["viewer", "editor", "manager", "spell-admin", "guest", "member", "admin"] as const
  @prop({ oneOf: () => Membership.Roles })
  accessor role!: Role
}

/////////////////////////////////////////////////////////////
// ## Who manages what in an org (epic `atmosphere` P20, Q28)
/////////////////////////////////////////////////////////////
/**
 * Kept in the org's Admin space, `@rs/__admin/roster.json5`:  the ONE list of who holds each role.
 * Everything asks it, every time:  a project names "the Events Team", never the people on it today.
 */
export class Roster extends Thing {
  static savedInFile = true

  // - its "roles" is a list of org-roles
  @prop({ itemType: "OrgRole", init: () => new List<OrgRole>({ instanceType: "OrgRole" }) })
  accessor roles!: List<OrgRole>

  // - its "teams" is a list of teams
  @prop({ itemType: "Team", init: () => new List<Team>({ instanceType: "Team" }) })
  accessor teams!: List<Team>

  // - its "projects" is a list of org-projects
  @prop({ itemType: "OrgProject", init: () => new List<OrgProject>({ instanceType: "OrgProject" }) })
  accessor projects!: List<OrgProject>

  // - its "terms" is a list of terms
  @prop({ itemType: "Term", init: () => new List<Term>({ instanceType: "Term" }) })
  accessor terms!: List<Term>
}

/**
 * A standing team, the Events Team:  no members of its own;  its people are those holding a Team Manager term of it.
 * Its folder names its spaces in the org, and is how everything finds it:  `events_team`.
 */
export class Team extends Thing {
  // - it has a folder as text
  @prop({ type: "text" })
  accessor folder!: string

  // - it has a name as text
  @prop({ type: "text" })
  accessor name!: string
}

/** A project, under a standing team, or the org itself (no team);  never under another project. */
export class OrgProject extends Thing {
  // - it has a folder as text
  @prop({ type: "text" })
  accessor folder!: string

  // - it has a name as text
  @prop({ type: "text" })
  accessor name!: string

  // - it has a team as a team
  @prop({ type: "Team" })
  accessor team!: Team
}

export type Manages = (typeof OrgRole.Manages)[number]

/**
 * A role the org has:  the Board (the org's Org Managers), the Admins, Team Manager, Project Manager (each its id),
 * renamed as the org likes, or one of its own.
 * What it manages says which spaces its holders manage:  "nothing", for a title (Treasurer).
 * Its key is how everything finds it, whatever it's called:  `board`, `admins`, `team-manager`, `project-manager`,
 * or the org's own;  an older file's `team-lead` and `project-lead` are read as these (Q28).
 * Who may hold it:  people on these teams, or these people;  anyone in the org when both are empty.
 */
export class OrgRole extends Thing {
  // - it has a key as text
  @prop({ type: "text" })
  accessor key!: string

  // - it has a name as text
  @prop({ type: "text" })
  accessor name!: string

  // - its "manages" is one of the-org, the-admin-space, a-team, a-project, nothing
  static Manages = ["the-org", "the-admin-space", "a-team", "a-project", "nothing"] as const
  @prop({ oneOf: () => OrgRole.Manages })
  accessor manages!: Manages

  // - its "eligible-teams" is a list of teams
  @prop({ itemType: "Team", init: () => new List<Team>({ instanceType: "Team" }) })
  accessor eligibleTeams!: List<Team>

  // - its "eligible-people" is a list of people
  @prop({ itemType: "Person", init: () => new List<Person>({ instanceType: "Person" }) })
  accessor eligiblePeople!: List<Person>

  // Before Q28 (2026-11-06) what a role managed was what it "led".
  static v2RenamesLeads = "manages"
}

/**
 * Someone holding a role for a while:  a person, or a whole team ("the Events Team" manages a project).
 * It manages a team or a project when its role manages one;  it starts on its start, and ends on its end, if it has one.
 */
export class Term extends Thing {
  // - it has a role as an org-role
  @prop({ type: "OrgRole" })
  accessor role!: OrgRole

  // - it has a person as a person
  @prop({ type: "Person" })
  accessor person!: Person

  // - it has a holder-team as a team
  @prop({ type: "Team" })
  accessor holderTeam!: Team

  // - it has a team as a team
  @prop({ type: "Team" })
  accessor team!: Team

  // - it has a project as an org-project
  @prop({ type: "OrgProject" })
  accessor project!: OrgProject

  // - it has a start as a date
  @prop({ type: "date" })
  accessor start!: Date

  // - it has an end as a date
  @prop({ type: "date" })
  accessor end!: Date
}