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
 * The person at THIS machine, whose space its own projects are in:  `owen@spell`, `alice@acme`
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
 * - SIDE EFFECT:  `SpellSetup` lists `alice@acme` in place of the old address.
 */
export function setLocalPerson(person: { id: string; org: string }): void {
  const group = PROJECT_GROUPS[0]!
  const was = group.path
  localPerson.id = person.id
  localPerson.org = person.org
  if (was === localPerson.address) return
  group.path = localPerson.address as SP.ProjectRootPath
  group.space = localPerson.address
  // the same place in the registry's order, as every list of the groups shows it:  first
  const roots = Object.values(SpellSetup.projectRoots)
  for (const path of Object.keys(SpellSetup.projectRoots)) delete SpellSetup.projectRoots[path as SP.ProjectRootPath]
  for (const spec of roots) SpellSetup.addProjectRoot(spec)
}

/**
 * A person's id, made from what they typed or from their email:
 * `Alice Smith` and `alice.smith@acme.com` are both `alice-smith`;  `""` when nothing's left.
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
 * The groups whose projects people open AS EXAMPLES (epic `mockup` T52):  the examples and the guides,
 * the Spanish ones among them.
 * - Opened as they are, never copied;  a person's edits are their draft of it, never its files,
 *   so it stays the same for everyone else.
 * - Leaving one with a draft asks what to keep:  their own copy, nothing, or (`@spell`'s managers) the example itself.
 */
export const EXAMPLE_GROUPS = ["@spell/examples", "@spell/guides"] as const

/** Is project `projectPath` one people open as an example (`EXAMPLE_GROUPS`):  `@spell/examples/Solitaire`? */
export function isExampleProject(projectPath: string): boolean {
  return EXAMPLE_GROUPS.some((group) => projectPath.startsWith(`${group}/`))
}

/**
 * A project of a group's list, as the home page reads it:  `SP.ProjectListEntry`, and what only the home page needs.
 */
export type ProjectListEntryWithHome = SP.ProjectListEntry & {
  /**
   * `false` when its project file says so (epic `notebook` P10):
   * the home page's rows and the Hero's first-guide button skip it.
   */
  onHome?: false
  /** It has a picture of its app running, `PROJECT_THUMBNAIL` in its folder, for its card (epic `mockup` P18). */
  hasThumbnail?: true
  /** Made from a start card and not kept yet:  its project file's `unsaved` (`UnsavedApp`, epic `mockup` I42). */
  unsaved?: UnsavedApp
}

/**
 * Where a project made from a start card is, before it's one of your apps for good (epic `mockup` I42):
 * its project file's `unsaved`, gone once it's kept.
 * - `"untouched"`:  nothing changed yet.
 *   The home page shows no card for it, and leaving it deletes it, no question asked.
 * - `"changed"`:  changed, but no version saved yet.
 *   On the home page;  leaving it asks whether to keep it, and "Don't Save" deletes it.
 * - Its first change makes it `"changed"`:  a save of one of its files, a file made, renamed or deleted, a rename,
 *   its settings (the server's `noteAppChanged()`).
 * - Kept for good, the key gone:  "Save" as you leave it, Publish, or Versions' Save Current Changes.
 * - Owen (epic `mockup` I42):  "Don't save it until I start making changes ... if it has no versions and I say
 *   don't save draft -- don't save it at all."
 */
export type UnsavedApp = "untouched" | "changed"

/**
 * A project's picture of its app running by itself, for its card on the home page:  `__thumbnail.png`, in its folder.
 * - Taken by the app folder's `yarn examples:readme` (epic `mockup` P18);  no file, no picture:  its letter instead.
 * - A `.png` is never in a project's file list, so the editor doesn't show it.
 */
export const PROJECT_THUMBNAIL = "__thumbnail.png"

/**
 * A project's line on its home page card:  its description's first phrase,
 * up to its first `:`, `;` or sentence's end.
 * - `"A to-do list:  type a task and add it ..."` => `"A to-do list"`.
 * - Kept to `CARD_LINE_LENGTH` for every example, so it's whole in two lines at the card's narrowest
 *   (epic `mockup` I48);  the card cuts a longer one off after two lines, with an ellipsis.
 */
export function cardLineOf(description: string | undefined): string | undefined {
  return description?.split(/[:;]\s|\.\s/)[0]?.trim() || undefined
}

/**
 * The longest an example's card line may be:  56 characters.
 * - Measured (epic `mockup` I48):  the narrowest card's line is 230px wide, at a 560px window;
 *   the longest example's, 55 characters, takes two lines there.
 */
export const CARD_LINE_LENGTH = 56

/**
 * Spell's project GROUPS:  where projects live, each a list the editor shows (`SpellProjectRoot`).
 * - Each one's `path` is its address;  its folder comes from that (`SP.SpellUrls.folderFor()`):
 *   - `@spell/examples`, `@spell/guides`, `@spell/sites`, `@spell/library`:
 *     the `@spell` space's built-ins, `spaces/@spell/<group>/`, committed
 *   - `@spell/editor`:  the editor's own Spell, one project, `spell-editor` (epic `editor` P22, P29), committed
 *   - `@spell/test`:  the test projects, beside them in `spaces/@spell/test/`, committed and frozen
 *   - `owen@spell`:  this machine's person's own (`localPerson`), `<spell-spaces>/@<org>/<person>@/`, outside git
 *   - an org's own groups in spell.spaces, `@acme/tools`:  added as the server finds them (`addOrgGroups()`)
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
 * `owen@acme` for `owen@acme/dashboard`, in `<spell-spaces>/@acme/owen@/`;  `undefined` for anything else.
 * - found by its address, as `orgProgramGroup()` finds an org's:  so the editor OPENS its projects
 *   (`/edit/owen@acme/dashboard`), but doesn't list them;  only this machine's person's space is a listed group
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

/** An org's group kept in spell.spaces:  `@acme/tools`, a folder of projects in the org's folder. */
const ORG_GROUP = /^@([a-z][a-z0-9_]*)\/([a-z][a-z0-9_-]*)$/i

/**
 * The groups of this machine's person's org that the server found in spell.spaces, by address:
 * `@acme/tools` (epic `repo-split` P27).
 * - The home page lists each, after the person's own projects.
 */
export const orgGroups: SP.ProjectRootPath[] = []

/**
 * Add `paths`, an org's own groups in spell.spaces (`@acme/tools`), as LISTED groups (`orgGroups`),
 * so `@acme/tools/dashboard` is a project in `@acme/tools`, not a file of the org's programs.
 * - Each:  the org's folder's own sub-folder holding projects, in `<spell-spaces>/@acme/tools/`
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
