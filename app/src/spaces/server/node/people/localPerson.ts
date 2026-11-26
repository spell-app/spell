import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs"
import { dirname, isAbsolute, join, relative, resolve } from "path"
import JSON5 from "json5"

import { findUp } from "spell/util/node/findUp"
import { Git } from "spell/server/Git"
import { SP } from "spell/parser/spell"
import type { LocalPersonAnswer } from "spell/app/spaces/models/people"
import {
  addOrgGroups,
  localPerson,
  orgGroups,
  personIdFor,
  setLocalPerson,
  SPELL_ORG
} from "spell/app/spaces/models/projectGroups"
import {
  groupHasOwnPage,
  isSourceCheckout,
  moreSpaces,
  repoDir,
  spellSpacesDir,
  type MoreSpaces
} from "spell/app/spaces/server/node/spellSpacesDir"

/**
 * WHO IS AT THIS MACHINE, on the server (epic `repo-split` P27):  the person whose space its own projects are in,
 * and their org.
 * - The org:  the APP's setting, its `package.json`'s `"spell": { "org": "acme" }`;  left out, `spell`.
 * - The person:  remembered in the app's own folder, git-ignored, `.spell/me.json5`:  `{ person: "alice" }`
 *   (`ME_FILE`).
 *   - No such file, in a source checkout (the kit):  `owen`, Owen's own, so his setup never asks.
 *   - No such file, from an npm install:  nobody yet;  the editor asks their name first (`POST /api/people/local`).
 * - The APP is the project the page server was started for:
 *   - `SPELL_APP_DIR`, when set
 *   - a source checkout, started inside it:  the kit's root, the app folder's parent
 *   - a source checkout another project links in (`"spell": "portal:../spell"`):  that project, as an install's
 *   - an install:  the project whose `package.json` is nearest where it was started (`INIT_CWD`, the folder `yarn`
 *     ran in;  else the process's own), e.g. `acme-spell`
 * - Read ONCE, the first time anything asks (`thisMachinesPerson()`), then set on spaces' models (`setLocalPerson()`),
 *   which every route reads;  so is every org group it serves (`servedOrgGroups()`, `addOrgGroups()`):
 *   the org's own in spell.spaces, and every org's in the more spaces folders (`moreOrgGroups()`).
 * - Node only:  the browser asks `GET /api/people/local` (spaces' people routes).
 * - Owen, 2026-11-16:  "We need to get the `someone else is not owen@spell` working before we can release".
 */

/** Where the app keeps who's at this machine, from its folder:  `.spell/me.json5`, git-ignored. */
export const ME_FILE = ".spell/me.json5"

/** Who's at this machine when nobody says so, in a source checkout:  Owen. */
const KIT_PERSON = "owen"

/** Has `thisMachinesPerson()` read the settings yet? */
let isRead = false
/** Is somebody named:  a me file, or a source checkout's default?  Not yet, on an install's first start. */
let isNamed = false

/**
 * This machine's person, read from the app's settings and me file the first time (see the file's docs):
 * `localPerson`, `{ id: "alice", org: "acme", address: "alice@acme" }`.
 * - SIDE EFFECT, the first time:  sets spaces' `localPerson`, and adds every org group served (`servedOrgGroups()`).
 * - Nobody named yet (an install's first start):  `you@<org>`, a stand-in nothing writes to, until the editor asks.
 * - NEVER throws:  a me file that won't read is nobody named, with a line in the log.
 */
export function thisMachinesPerson(): typeof localPerson {
  if (isRead) return localPerson
  isRead = true
  const org = appOrg()
  const id = mePerson() ?? (isSourceCheckout ? KIT_PERSON : undefined)
  isNamed = !!id
  setLocalPerson({ id: id ?? "you", org })
  servedOrgGroups()
  return localPerson
}

/**
 * EVERY org group this program serves, by address, found ONCE (epic `editor` P47, Q97 A):
 * the ONE answer the page server, the compile it starts and the `spell` command each read.
 * - spell.spaces:  this machine's person's org's (`orgGroupsIn()`), `@acme/tools` for `<spell.spaces>/@acme/tools/`
 * - each more spaces folder (`moreOrgGroups()`):  every org it serves, whatever this machine's person's org
 * - A program that guessed the app or the spaces folder its own way lost them, one program at a time:
 *   the compile, the language worker, the run page, `spell lint` by a project's folder (the analysis's table).
 * - SIDE EFFECT, the first time:  each registered as a listed group (`addOrgGroups()`), so
 *   `@acme/tools/dashboard` is a project of `@acme/tools` wherever it's read.
 * - Read again only with `fresh`:  a test's folders, set after it first ran.
 */
export function servedOrgGroups({ fresh = false }: { fresh?: boolean } = {}): string[] {
  if (served && !fresh) return served
  served = [...new Set([...orgGroupsIn(spellSpacesDir, thisMachinesPerson().org), ...moreOrgGroups()])]
  addOrgGroups(served)
  return served
}

/** `servedOrgGroups()`' answer, once it's worked out. */
let served: string[] | undefined

/**
 * The org groups `groups` (default:  every one served) that hold their OWN PAGE, a project named `home`
 * (`GROUP_PAGE_PROJECT`;  epic `editor` P47, Q99 B):  `@acme/org-spell` for `@acme/org-spell/home/`.
 * - Looked at each time it's asked:  a group's page made while the server runs counts at once.
 */
export function groupPagesOf(groups: readonly string[] = servedOrgGroups()): string[] {
  return groups.filter((group) => groupHasOwnPage(group))
}

/**
 * The org groups in the more spaces folders (`moreSpaces`, `~/.spell/more-spaces.json5`):  every org each holds,
 * whatever this machine's person's org, `@acme/tools` for `<acme-app>/spaces/@acme/tools/`.
 * - So `@acme/tools/dashboard` is a project of `@acme/tools`, not file `dashboard` of the org's programs (`@acme`),
 *   on the server and, through `GET /api/people/local`'s `orgGroups`, in the browser and its language worker.
 */
export function moreOrgGroups(more: MoreSpaces[] = moreSpaces): string[] {
  return more.flatMap(({ dir, orgs }) => orgs.flatMap((org) => orgGroupsIn(dir, org)))
}

/**
 * What `GET /api/people/local` answers:  who's here, their org, every org group served and which hold their own page,
 * the org's people here, git's email.
 */
export function localPersonAnswer(): LocalPersonAnswer {
  const person = thisMachinesPerson()
  const email = Git.config("user.email", appDir())
  return {
    ...(isNamed ? { id: person.id } : {}),
    org: person.org,
    orgGroups: [...orgGroups],
    groupPages: groupPagesOf(orgGroups),
    people: peopleIn(spellSpacesDir, person.org),
    ...(email ? { email } : {})
  }
}

/**
 * Make `id` this machine's person:  written into the app's me file (`ME_FILE`), and set at once.
 * - `id` is made an id first (`personIdFor()`:  `Alice Smith` => `alice-smith`)
 * - throws a `TypeError` when nothing's left of it
 */
export function nameThisMachinesPerson(id: string): typeof localPerson {
  const person = personIdFor(id)
  if (!person) throw new TypeError(`nameThisMachinesPerson():  "${id}" has no letters to make a name of`)
  const file = join(appDir(), ME_FILE)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, meFileText(person))
  thisMachinesPerson()
  isNamed = true
  setLocalPerson({ id: person, org: localPerson.org })
  return localPerson
}

/** The me file's text:  who's at this machine, and a line saying what it is. */
function meFileText(person: string): string {
  return [
    "// Who's at this machine, as Spell's editor asked on its first start (spell's spaces, localPerson.ts).",
    "// Never committed:  each person's own.",
    `${JSON.stringify({ person }, null, 2)}\n`
  ].join("\n")
}

////////////////
// ## The app
////////////////

/** The app's folder:  see the file's docs. */
export function appDir(): string {
  if (process.env.SPELL_APP_DIR) return resolve(process.env.SPELL_APP_DIR)
  const kit = dirname(repoDir)
  const from = process.env.INIT_CWD ?? process.cwd()
  const project = findUp(from, "package.json") ?? from
  // A project linking a kit checkout in (`"spell": "portal:../spell"`) is still its own app
  return isSourceCheckout && isInside(project, kit) ? kit : project
}

/** Whether `dir` is `folder` or inside it. */
function isInside(dir: string, folder: string): boolean {
  const path = relative(folder, dir)
  return !path.startsWith("..") && !isAbsolute(path)
}

/** The app's org:  its `package.json`'s `"spell": { "org" }`, else `spell`. */
export function appOrg(dir = appDir()): string {
  try {
    const settings = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as { spell?: { org?: unknown } }
    const org = settings.spell?.org
    return typeof org === "string" && org ? org : SPELL_ORG
  } catch {
    return SPELL_ORG
  }
}

/** The person the app's me file names, `alice`;  `undefined` with none, or one that won't read. */
export function mePerson(dir = appDir()): string | undefined {
  const file = join(dir, ME_FILE)
  if (!existsSync(file)) return undefined
  try {
    const { person } = JSON5.parse(readFileSync(file, "utf8")) as { person?: unknown }
    return typeof person === "string" && personIdFor(person) ? personIdFor(person) : undefined
  } catch (error) {
    console.error(`${file} won't read, so nobody's named:`, error)
    return undefined
  }
}

////////////////
// ## The org's folder
////////////////

/**
 * The org's own GROUPS in spell.spaces, by address:  `@acme/tools`, for `<spaces>/@acme/tools/`.
 * - a folder of the org's that isn't a project itself (no project file) and holds at least one project
 * - never a person's or a paired space (`alice@`, `events_team@`), nor one of spaces' own (`__admin`)
 */
export function orgGroupsIn(spacesDir: string, org: string): string[] {
  const orgDir = join(spacesDir, `@${org}`)
  return foldersIn(orgDir)
    .filter((name) => !name.includes("@") && !name.startsWith("_") && !name.startsWith("."))
    .filter((name) => !isProject(join(orgDir, name)))
    .filter((name) => foldersIn(join(orgDir, name)).some((project) => isProject(join(orgDir, name, project))))
    .map((name) => `@${org}/${name}`)
}

/** The people with a space in `org` in spell.spaces, by id:  `<spaces>/@acme/alice@/` is `alice`. */
export function peopleIn(spacesDir: string, org: string): string[] {
  return foldersIn(join(spacesDir, `@${org}`))
    .filter((name) => /^[a-z][a-z0-9_-]*@$/.test(name))
    .map((name) => name.slice(0, -1))
}

/** Is `dir` a project's folder:  does it hold a project file? */
function isProject(dir: string): boolean {
  return existsSync(join(dir, SP.PROJECT_FILE))
}

/** The folders in `dir`, by name;  none when it isn't there. */
function foldersIn(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
}
