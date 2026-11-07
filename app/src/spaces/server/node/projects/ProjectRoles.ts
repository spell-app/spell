/**
 * Who may change a project's OWN files, by their role in its space (epic `atmosphere` P25, people-and-orgs' T8, J100):
 * the page server's file operations ask it before each save, new file, rename and delete.
 * - What each change takes (`SPACE_ROLES`):
 *   - saving a file Spell doesn't draft (a data file, a picture):  `canWrite`, an editor
 *   - drafting and saving its pages and source:  `canDesign`, a manager, or anyone the org lets design its space
 *     (T47, J117;  `OrgRoles.designs()`):  a space role decides its DATA, this its PROGRAM
 *   - a new file, a page:  `canCreate`, a manager
 *   - a rename or a delete:  `canManage`, a manager
 *   - publishing its pages:  `canPublish`, a manager (P26;  `ProjectDrafts`)
 * - Whose role:  the person's in the space the project is in (`SpaceMembers`, its address the project's):
 *   `ana@rs` in `@rs/minutes/Agenda`'s space, `@rs`.
 * - THIS MACHINE'S PERSON (`SPACES.LOCAL_PERSON`) changes anything this machine serves:  it's theirs, as Publish's
 *   so is anyone, until they sign in (`prefsPersonFor()`).
 * - A PERSON'S OWN SPACE in an org (`ana@rs/about`, epic `atmosphere` P28) holds documents and approved apps, never
 *   code:  a page runs as whoever views it (`mayHoldOrDie()`).
 * - A refusal is `SRV.HttpError(403)`, naming the role it takes;  the editor hides what you can't do first
 *   ("New File", `mayCreate`).
 * - Node only;  the routes (`project-utils.ts`) are its one caller.
 */
import { SRV } from "spell/server"
import { SPACES } from "spell/app/spaces"
import {
  SPACE_ROLES,
  leastRoleFor,
  spaceRoleFor,
  type Role,
  type SpaceRole,
  type SpaceRoleRights
} from "spell/app/spaces/models/people"
import type { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"
import { peopleStore } from "spell/app/spaces/server/node/people/peopleRoutes"
import { OrgRoles } from "spell/app/spaces/server/node/people/OrgRoles"
import { SpaceMembers, withArticle } from "spell/app/spaces/server/node/places/SpaceMembers"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

/** What's done to a project's own file, and the right each takes (`SpaceRoleRights`). */
const RIGHT_FOR = {
  save: "canWrite",
  design: "canDesign",
  create: "canCreate",
  rename: "canManage",
  delete: "canManage",
  publish: "canPublish"
} as const satisfies Record<string, keyof Omit<SpaceRoleRights, "things">>

/** What's done to a project's own file:  see `RIGHT_FOR`. */
export type ProjectFileChange = keyof typeof RIGHT_FOR

/** The words each change says in a refusal. */
const CHANGE_WORDS: Record<ProjectFileChange, string> = {
  save: "save a file",
  design: "change its pages",
  create: "make a page",
  rename: "rename a file",
  delete: "delete a file",
  publish: "publish its pages"
}

/**
 * What's CODE, which a person's own space in an org never holds (P28):  a program, a script, a web page or a picture
 * that can run one.  A page (`.spellml`) is a document unless it acts (`ACTS`).
 */
const CODE_FILE = /\.(spell|[cm]?[jt]sx?|py|html?|svg)$/i

/** A page that ACTS:  its own actions or scripts, which run as whoever views it. */
const ACTS = /<(action|script)\b/i

/** This machine's person, by address:  `owen@spell`. */
export const THIS_MACHINES_PERSON = `${SPACES.LOCAL_PERSON}@${SPACES.HOME_ORG}`

/****************
 * ### `ProjectRoles`
 * One person's rights over one project's own files:  see the file's docs.
 ****************/
export class ProjectRoles {
  /** The project's address:  `@rs/minutes/Agenda`. */
  readonly projectId: string
  /** Who's asking, by address:  `ana@rs`. */
  readonly person: string
  /** The project's folder on disk, its space's settings among its files. */
  private readonly folder: string
  /** People and orgs:  spell.spaces', unless a test hands its own. */
  private readonly people: PeopleStore
  /** Its org's roles:  who designs its space (`designs()`). */
  private readonly orgRoles: OrgRoles

  constructor({
    projectId,
    person,
    folder,
    people = peopleStore(),
    orgRoles = new OrgRoles({ people })
  }: ProjectRolesProps) {
    this.projectId = projectId
    this.person = person
    this.folder = folder
    this.people = people
    this.orgRoles = orgRoles
  }

  /** Their role in the project's space:  `undefined` for someone who isn't in it.  This machine's person:  a manager. */
  async role(): Promise<SpaceRole | undefined> {
    if (this.person === THIS_MACHINES_PERSON) return "manager"
    const members = new SpaceMembers({
      address: this.projectId,
      storage: new DiskStorage(this.folder),
      people: this.people
    })
    const role = (await members.memberOf(this.person))?.role
    return role === undefined ? undefined : spaceRoleFor(role as Role)
  }

  /** May they `change` the project's own files? */
  async may(change: ProjectFileChange): Promise<boolean> {
    const role = await this.role()
    if (role && SPACE_ROLES[role][RIGHT_FOR[change]]) return true
    return change === "design" && (await this.isDesigner())
  }

  /** Does the org let them design the project's space, whatever their role there (T47)?  Never outside an org. */
  private async isDesigner(): Promise<boolean> {
    const space = await this.orgRoles.spaceAt(this.projectId)
    return !!space && (await this.orgRoles.designs(this.person, space))
  }

  /**
   * - throws `SRV.HttpError(403)` when the project is in a person's own space in an org (P28) and `filePath` is code
   *   (`CODE_FILE`), or a page whose `contents` act (`ACTS`):  it holds documents and approved apps alone
   */
  async mayHoldOrDie(filePath: string, contents?: unknown): Promise<void> {
    const memberSpace = await this.orgRoles.memberSpaceAt(this.projectId)
    if (!memberSpace) return
    const isCode = CODE_FILE.test(filePath) || (typeof contents === "string" && ACTS.test(contents))
    if (!isCode) return
    throw new SRV.HttpError(
      403,
      `${this.projectId} is ${memberSpace.person}'s own space:  it holds documents and approved apps, never code, ` +
        `which runs as whoever views the page (${filePath})`
    )
  }

  /** - throws `SRV.HttpError(403)` unless they may `change` the project's own files, naming the role it takes */
  async mayOrDie(change: ProjectFileChange): Promise<void> {
    if (await this.may(change)) return
    const role = await this.role()
    const needs = change === "save" ? leastRoleFor("file", "change", false) : "manager"
    const youAre = role ? `you're ${withArticle(role)} there` : "you aren't in its space"
    const takes = change === "design" ? "a manager, or someone its org lets design it" : withArticle(needs)
    throw new SRV.HttpError(
      403,
      `You can't ${CHANGE_WORDS[change]} in ${this.projectId}:  ${youAre}, and it takes ${takes}`
    )
  }
}

/** Constructor props of `ProjectRoles`. */
export type ProjectRolesProps = {
  /** The project's address:  `@rs/minutes/Agenda`. */
  projectId: string
  /** Who's asking, by address:  `ana@rs`. */
  person: string
  /** The project's folder on disk. */
  folder: string
  /** People and orgs;  default spell.spaces' own (`peopleStore()`). */
  people?: PeopleStore
  /** Its org's roles;  default over `people`. */
  orgRoles?: OrgRoles
}
