import type { SP } from "spell/parser/spell"
// Import directly:  `<spell-viewer>` loads this file alone, without spell's barrel and its parser
import { SpellSetup } from "spell/parser/spell/SpellSetup"

/**
 * The person whose space this machine's own projects are in:  `owen@spell`.
 * - So a project of theirs, `my-app`, is `owen@spell/my-app`, in spell-spaces' `@spell/owen@/my-app/`.
 * - Their own file is `@spell/owen@/__me.json5`:
 *   the people store reads it, and the app's "You" panel changes it (epic `people-and-orgs` P9).
 * - WHO they are is still this name, until a machine can have more than one person.
 * - In the editor's static build, the public preview, it's `you`:  a visitor's projects are kept in their browser.
 */
export const LOCAL_PERSON = import.meta.env?.MODE === "static" ? "you" : "owen"

/**
 * The org every person on this machine is in, for now:
 * `owen@spell` is `Person#owen@spell`, their space `@spell/owen@/`.
 * - The people store files them there;  their preferences are kept there too (`SpacePrefs`).
 */
export const HOME_ORG = "spell"

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
 *   - `owen@spell`:  this machine's person's own, `<spell-spaces>/@spell/<person>@/`, outside git
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
    path: `${LOCAL_PERSON}@${HOME_ORG}`,
    space: `${LOCAL_PERSON}@${HOME_ORG}`,
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
const NOT_AN_ORG_GROUP = new Set([`@${HOME_ORG}`, "@local"])

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
const PERSON_SPACE = /^([a-z][a-z0-9_]*@[a-z][a-z0-9_]*)(?:$|\/(?!__))/

/**
 * The project group of a person's space in an org other than this machine's person's (epic `repo-split` P26):
 * `owen@acme` for `owen@acme/harbor-new`, in `<spell-spaces>/@acme/owen@/`;  `undefined` for anything else.
 * - found by its address, as `orgProgramGroup()` finds an org's:  so the editor OPENS its projects
 *   (`/edit/owen@acme/harbor-new`), but doesn't list them;  only this machine's person's space is a listed group
 * - only projects:  a data folder's address reads the same, and never asks
 */
function personSpaceGroup(place: string): SP.ProjectRootSpec | undefined {
  const space = PERSON_SPACE.exec(place)?.[1] as SP.ProjectRootPath | undefined
  if (!space || space === `${LOCAL_PERSON}@${HOME_ORG}`) return undefined
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
