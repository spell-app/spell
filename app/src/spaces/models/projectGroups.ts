import type { SP } from "spell/parser/spell"
import { initialCaps, slug } from "spell/util/string"
// Import directly:  `<spell-viewer>` loads this file alone, without spell's barrel and its parser
import { SpellSetup } from "spell/parser/spell/SpellSetup"

/**
 * Spell's own org, `spell`:  where Spell accounts are (`ana@spell`), and Spell admins (`spell-admin` there).
 * - A person read with no org is in it (`Person#owen` is `owen@spell`).
 * - Its space's built-ins are the app folder's `spaces/@spell/`.
 * - NOT necessarily this machine's person's org:  that's `localPerson.org`.
 */
export const SPELL_ORG = "spell"

/**
 * The person at THIS machine, whose space its own projects are in:  `owen@spell`, `kim-lee@acme`
 * (epic `repo-split` P27).
 * - So a project of theirs, `my-app`, is `owen@spell/my-app`, in spell-spaces' `@spell/owen@/my-app/`.
 * - Their own file is `@spell/owen@/__me.json5`:
 *   the people store reads it, and the app's "You" panel changes it (epic `people-and-orgs` P9).
 * - Who it is, the server says (`thisMachinesPerson()`, spaces' node `localPerson.ts`):
 *   the app's settings name the org, the app's own folder remembers the person.
 *   - The server sets it as it loads;  the editor, from `GET /api/people/local`, before it draws anything.
 *   - Until then:  `owen@spell`, Owen's kit's person, as before P27.
 * - In the editor's static build, the public preview, it's `you@spell`:  a visitor's projects are kept in their browser.
 * - Change it with `setLocalPerson()`, never by hand:  its group moves with it.
 */
export const localPerson = {
  /** their id in their org:  `owen` */
  id: import.meta.env?.MODE === "static" ? "you" : "owen",
  /** their org:  `spell`, or the app's own (its `package.json`'s `"spell": { "org" }`) */
  org: SPELL_ORG,
  /** their address, and their space's:  `owen@spell` */
  get address(): string {
    return `${this.id}@${this.org}`
  }
}

/**
 * Make `person` this machine's person:  their own projects' group, the first of `PROJECT_GROUPS`, moves to their space.
 * - SIDE EFFECT:  `SpellSetup` lists `kim-lee@acme` in place of the old address.
 */
export function setLocalPerson(person: { id: string; org: string }): void {
  const group = PROJECT_GROUPS[0]!
  delete SpellSetup.projectRoots[group.path]
  localPerson.id = person.id
  localPerson.org = person.org
  group.path = localPerson.address as SP.ProjectRootPath
  group.space = localPerson.address
  SpellSetup.addProjectRoot(group)
}

/**
 * A person's id, made from what they typed or from their email:
 * `Kim Lee` and `kim.lee@acme.com` are both `kim-lee`;  `""` when nothing's left.
 * - lower case, ASCII, a dash between words (`slug()`);  starts with a letter
 */
export function personIdFor(text: string): string {
  return slug(text.replace(/@.*$/, "")).replace(/^[^a-z]+/, "")
}

/**
 * Spell UI's component pages, one site of notebooks in the Guides group (epic `notebook` P10).
 * - Its project file says `"onHome": false`, so the home page shows no card for it.
 */
export const SPELL_UI_SITE_PROJECT = "@spell/guides/SpellUI"

/**
 * A project of a group's list, as the home page reads it:  `SP.ProjectListEntry`, and what only the home page needs.
 */
export type ProjectListEntryWithHome = SP.ProjectListEntry & {
  /**
   * `false` when its project file says so (epic `notebook` P10):
   * the home page's rows and the Hero's first-guide button skip it.
   */
  onHome?: false
  /** Its project file's `category`, which row of the examples it's in (epic `mockup` P18). */
  category?: string
  /** It has a picture of its app running, `PROJECT_THUMBNAIL` in its folder, for its card (epic `mockup` P18). */
  hasThumbnail?: true
}

/**
 * A project's picture of its app running by itself, for its card on the home page:  `__thumbnail.png`, in its folder.
 * - Taken by the app folder's `yarn examples:readme` (epic `mockup` P18);  no file, no picture:  its letter instead.
 * - A `.png` is never in a project's file list, so the editor doesn't show it.
 */
export const PROJECT_THUMBNAIL = "__thumbnail.png"

/**
 * The home page's rows of examples, in order, by each project file's `category` (epic `mockup` P18).
 * - Their titles are the editor's texts, `category.<id>`:  "First steps", "Games" ...
 * - A project with none, or one not here, comes after them.
 * - The org apps have no category:  they're the library's, its own row.
 */
export const EXAMPLE_CATEGORIES = ["first-steps", "games", "everyday", "web-data", "sites"] as const

/** One of `EXAMPLE_CATEGORIES`. */
export type ExampleCategory = (typeof EXAMPLE_CATEGORIES)[number]

/**
 * Spell's project GROUPS:  where projects live, each a list the editor shows (`SpellProjectRoot`).
 * - Each one's `path` is its address;  its folder comes from that (`SP.SpellUrls.folderFor()`):
 *   - `@spell/examples`, `@spell/guides`, `@spell/sites`, `@spell/library`:
 *     the `@spell` space's built-ins, `spaces/@spell/<group>/`, committed
 *   - `@spell/editor`:  the editor's own Spell, one project, `spell-editor` (epic `editor` P22, P29), committed
 *   - `@spell/test`:  the test projects, beside them in `spaces/@spell/test/`, committed and frozen
 *   - `owen@spell`:  this machine's person's own (`localPerson`), `<spell-spaces>/@<org>/<person>@/`, outside git
 *   - an org's own groups in spell.spaces, `@acme/harbor`:  added as the server finds them (`addOrgGroups()`)
 * - A project in one is its address, a slash and the project's folder name:  `@spell/examples/Solitaire`.
 *   Built-in projects' names are lower-kebab (decision Q39).
 * - Each group's `icon` is its projects' icon everywhere the editor shows one:
 *   the project dropdown and its trigger, the program's header, the landing page's cards.
 *   - folder:  your projects;  lightbulb:  examples;  open book:  guides;  sitemap:  sites;  sticky note:  notebooks;
 *     puzzle piece:  libraries;  pencil:  the editor's own pieces;  flask:  tests
 * - SIDE EFFECT:  loading this file registers them with spell (`SpellSetup.addProjectRoot()`).
 *   - Every program that reads a spell address loads it first:  through `spell/app/spaces`, spaces' disk reader,
 *     or this file alone.
 */
export const PROJECT_GROUPS: SP.ProjectRootSpec[] = [
  {
    path: localPerson.address as SP.ProjectRootPath,
    space: localPerson.address,
    domain: "projects",
    title: "Projects",
    Type: "Project",
    type: "project",
    description: "Your own projects",
    icon: "folder"
  },
  {
    path: "@spell/examples",
    space: "@spell",
    domain: "examples",
    title: "Examples",
    Type: "Example",
    type: "example",
    description: "Example projects",
    icon: "lightbulb"
  },
  {
    path: "@spell/guides",
    space: "@spell",
    domain: "guides",
    title: "Guides",
    Type: "Guide",
    type: "guide",
    description: "Usage guides",
    icon: "book open"
  },
  {
    path: "@spell/sites",
    space: "@spell",
    domain: "sites",
    title: "Sites",
    Type: "Site",
    type: "site",
    description: "Sites of Spell's own, mapped page by page",
    icon: "sitemap"
  },
  {
    path: "@spell/library",
    space: "@spell",
    domain: "library",
    title: "Libraries",
    Type: "Library",
    type: "library",
    description: "Libraries other projects import, e.g. `@spell/library/people` in a project file",
    icon: "puzzle piece"
  },
  {
    path: "@spell/editor",
    space: "@spell",
    domain: "editor",
    title: "The editor",
    Type: "Piece",
    type: "piece",
    description: "The editor's own pieces in Spell:  its panes, top bar, menus and file tabs, each a project",
    icon: "pencil alternate",
    devOnly: true
  },
  {
    path: "@spell/test",
    space: "@spell",
    domain: "fixtures",
    title: "Test fixtures",
    Type: "Fixture",
    type: "fixture",
    description: "Frozen projects tests run against -- edit one, then `yarn spell:test:fixtures:bless`",
    icon: "flask",
    devOnly: true
  }
]

for (const group of PROJECT_GROUPS) SpellSetup.addProjectRoot(group)

/** An org's group, `@rs`, or a program in its shared space, `@rs/OrgAdmin`:  never Spell's own folders, `@rs/__admin`. */
const ORG_PROGRAM = /^(@[a-z][a-z0-9_]*)(?:$|\/(?!__))/

/** Orgs with an address of their own that isn't a project group:  Spell's built-ins, and an editor's local folders. */
const NOT_AN_ORG_GROUP = new Set([`@${SPELL_ORG}`, "@local"])

/**
 * The project group of an org's own programs, `@rs` for `@rs/OrgAdmin` (epic `atmosphere` I14):
 * found by its address, as orgs can't be listed up front;  `undefined` for anything else.
 * - Not one of `PROJECT_GROUPS`, so the editor doesn't list it.
 * - Only their programs:  a data folder's address reads the same, and never asks.
 */
function orgProgramGroup(place: string): SP.ProjectRootSpec | undefined {
  const org = ORG_PROGRAM.exec(place)?.[1] as SP.ProjectRootPath | undefined
  if (!org || NOT_AN_ORG_GROUP.has(org)) return undefined
  return {
    path: org,
    space: org,
    domain: "org",
    title: "Org programs",
    Type: "Program",
    type: "program",
    description: "An org's own programs, in its shared space",
    icon: "building"
  }
}

SpellSetup.addProjectRootFinder(orgProgramGroup)

/** A person's space in an org, `owen@acme`, or a project in it:  never its own folders, `ana@rs/__inbox`. */
const PERSON_SPACE = /^([a-z][a-z0-9_-]*@[a-z][a-z0-9_]*)(?:$|\/(?!__))/

/**
 * The project group of a person's space in an org other than this machine's person's (epic `repo-split` P26):
 * `owen@acme` for `owen@acme/harbor-new`, in `<spell-spaces>/@acme/owen@/`;  `undefined` for anything else.
 * - found by its address, as `orgProgramGroup()` finds an org's:  so the editor OPENS its projects
 *   (`/edit/owen@acme/harbor-new`), but doesn't list them;  only this machine's person's space is a listed group
 * - only projects:  a data folder's address reads the same, and never asks
 */
function personSpaceGroup(place: string): SP.ProjectRootSpec | undefined {
  const space = PERSON_SPACE.exec(place)?.[1] as SP.ProjectRootPath | undefined
  if (!space || space === localPerson.address) return undefined
  return {
    path: space,
    space,
    domain: "projects",
    title: "Projects",
    Type: "Project",
    type: "project",
    description: `${space}'s projects`,
    icon: "folder"
  }
}

SpellSetup.addProjectRootFinder(personSpaceGroup)

/** An org's group kept in spell.spaces:  `@acme/harbor`, a folder of projects in the org's folder. */
const ORG_GROUP = /^@([a-z][a-z0-9_]*)\/([a-z][a-z0-9_-]*)$/i

/**
 * The groups of this machine's person's org that the server found in spell.spaces, by address:
 * `@acme/harbor` (epic `repo-split` P27).
 * - The home page lists each, after the person's own projects.
 */
export const orgGroups: SP.ProjectRootPath[] = []

/**
 * Add `paths`, an org's own groups in spell.spaces (`@acme/harbor`), as LISTED groups (`orgGroups`),
 * so `@acme/harbor/harbor-new` is a project in `@acme/harbor`, not a file of the org's programs.
 * - Each:  the org's folder's own sub-folder holding projects, in `<spell-spaces>/@acme/harbor/`
 *   (the server finds them:  spaces' node `localPerson.ts`)
 * - SIDE EFFECT:  registered with `SpellSetup`;  one already there is left as it is
 * - throws a `TypeError` for an address that isn't `@<org>/<group>`
 */
export function addOrgGroups(paths: string[]): void {
  for (const path of paths) {
    const match = ORG_GROUP.exec(path)
    if (!match) throw new TypeError(`addOrgGroups():  ${path} isn't an org's group, \`@<org>/<group>\``)
    const [, org, name] = match as unknown as [string, string, string]
    SpellSetup.addProjectRoot({
      path: path as SP.ProjectRootPath,
      space: `@${org}`,
      domain: name,
      title: initialCaps(name.replace(/[-_]+/g, " ")),
      Type: "Project",
      type: "project",
      description: `@${org}'s ${name} projects`,
      icon: "building"
    })
    if (!orgGroups.includes(path as SP.ProjectRootPath)) orgGroups.push(path as SP.ProjectRootPath)
  }
}
