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
import { isSourceCheckout, repoDir, spellSpacesDir } from "spell/app/spaces/server/node/spellSpacesDir"

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
 *   which every route reads;  so is the org's own groups' list in spell.spaces (`addOrgGroups()`).
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
 * - SIDE EFFECT, the first time:  sets spaces' `localPerson`, and adds the org's own groups (`addOrgGroups()`).
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
  addOrgGroups(orgGroupsIn(spellSpacesDir, org))
  return localPerson
}

/** What `GET /api/people/local` answers:  who's here, their org, its groups and people here, git's email. */
export function localPersonAnswer(): LocalPersonAnswer {
  const person = thisMachinesPerson()
  const email = Git.config("user.email", appDir())
  return {
    ...(isNamed ? { id: person.id } : {}),
    org: person.org,
    orgGroups: [...orgGroups],
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
