import { existsSync } from "fs"
import { mkdir, readdir, readFile, writeFile } from "fs/promises"
import { join } from "path"

import { SRV } from "spell/server"
import * as People from "spell/app/spaces/@spell/library/people/people.lib.ts"
import { ADMIN_SPACE, PRIVATE_SPACE } from "spell/app/spaces/models/spaceNames"
import { SpellAccounts } from "spell/app/spaces/server/node/people/SpellAccounts"
import { folderForPlace } from "spell/app/spaces/server/node/projects/project-utils"
import type { OrgRoles } from "./OrgRoles"
import type { PeopleStore } from "./PeopleStore"

/** An org's id:  a folder's name, lower case, as `rs` or `rock_society`. */
const ORG_ID = /^[a-z][a-z0-9_]*$/

/** The built-in programs every org gets its own copy of, in its shared space. */
const ORG_PAGES = ["OrgAdmin", "Inbox", "OrgFeed", "OrgChat"]

/** Where the built-in programs are, by name. */
const PAGE_GROUP = "@spell/examples"

/** How the built-in programs name the org they're written for:  its address, and its name in their comments. */
const SAMPLE_ORG = /@rs\b/g
const SAMPLE_NAME = /\b(?:the Rock Society|Rock Society|RS)\b/g

/** The role an org's first Admins hold in its own file:  they manage its shared space. */
const ADMIN_MEMBERSHIP = "manager"

/****************
 * ### `OrgSetup`
 * Setting up an org on Spell's own server, in one go (epic `atmosphere` P35, Q29):
 * what `spell space org create rs --name "RS" --admin ana@example.org` does.
 * - What it makes, each only when it's not there yet, so running it again doubles nothing:
 *   - an account for each first Admin, by their email (`SpellAccounts.invite()`):  `ana@spell`
 *   - the org's file, its name, its first Admins in it as managers
 *   - its Admin space (`OrgRoles.setUp()`):  the four built-in roles;  the first Admin its first Board
 *   - every first Admin holding the Admins role
 *   - each standing team asked for (`--team "Events Team"`)
 *   - the folders of its paired spaces:  the org's own, the Admins', each team's, shared and private
 *   - its own copies of the Admin, Inbox, Feed and Chat programs, in its shared space, each naming the org:
 *     `/apps/@rs/OrgAdmin` on Spell's cloud;  a copy that's there already is left as it is, edited or not
 * - Nobody needs to know anything of AT Protocol:  every space is a folder on Spell's server.
 * - What it leaves for people to do, as `next`:
 *   - recovery codes (`spell space org codes`):  they need at least two holders, and the first Admin alone is one
 *   - the invite's mail, when Spell's cloud isn't running to send it (the command's)
 * - NEVER sends mail, NEVER touches the network:  the command asks the running cloud for the invites' mail.
 * - Node only.
 ****************/
export class OrgSetup {
  /** People, orgs and rosters. */
  private readonly people: PeopleStore
  /** Who manages what:  the one every folder's members ask (`SpaceFolders.orgRoles`). */
  private readonly roles: OrgRoles
  /** Where an address's folder is on disk. */
  private readonly folderFor: (address: string) => string
  /** Where a built-in program's folder is on disk:  always the real ones, a test's org or not. */
  private readonly builtInAt: (name: string) => string

  constructor({ people, roles, folderFor = folderForPlace }: OrgSetupProps) {
    this.people = people
    this.roles = roles
    this.folderFor = folderFor
    this.builtInAt = (name) => folderForPlace(`${PAGE_GROUP}/${name}`)
  }

  /**
   * SIDE EFFECT:  set up org `org`, or finish setting it up:  see the class.
   * - throws `HttpError(400)` for an id that's no folder's name, or no Admin
   */
  async create({ org, name, admins, teams = [] }: OrgSetupAsk): Promise<OrgSetupReport> {
    org = org.replace(/^@/, "")
    if (!ORG_ID.test(org)) {
      throw new SRV.HttpError(400, `"${org}" can't be an org's id:  lower case letters, digits and _, as "rs"`)
    }
    if (!admins.length) throw new SRV.HttpError(400, `say who its first Admin is:  --admin ana@example.org`)
    const report: OrgSetupReport = { org, made: [], already: [], admins: [], next: [] }
    const said = (done: boolean, line: string) => (done ? report.made : report.already).push(line)

    //////
    // The first Admins' accounts
    //////
    const accounts = new SpellAccounts(this.people)
    for (const email of admins) {
      const known = await accounts.accountFor(email)
      const address = known ?? (await accounts.invite(email))
      report.admins.push({ email, address })
      said(!known, `${address}'s account, for ${email}`)
    }

    //////
    // The org's file, the Admins in it
    //////
    let file = await this.people.org(org)
    said(!file, `@${org}'s file, named "${file?.name || name || org}"`)
    if (!file) {
      file = new People.Org({ id: org, name: name || org })
      await this.people.save(file)
    }
    for (const { address } of report.admins) {
      if (await this.roles.isInOrg(org, address)) {
        report.already.push(`${address} in @${org}`)
        continue
      }
      const [id, home] = address.split("@") as [string, string]
      const { person } = await this.people.person(id, home)
      if (!person) throw new SRV.HttpError(404, `OrgSetup.create():  ${address} has no file`)
      await this.people.setRole(file, person, ADMIN_MEMBERSHIP)
      report.made.push(`${address} in @${org}, as a manager`)
    }

    //////
    // Its Admin space, its Board and Admins
    //////
    const first = report.admins[0]!.address
    const hasRoster = !!(await this.people.roster(org))
    said(!hasRoster, `@${org}'s Admin space, ${first} its first Board`)
    if (!hasRoster) await this.roles.setUp(org, { board: first })
    const terms = await this.roles.terms(org)
    for (const { address } of report.admins) {
      const held = terms.some((term) => term.role === "admins" && term.person === address)
      said(!held, `${address} one of @${org}'s Admins`)
      if (!held) await this.roles.give(org, { role: "admins", person: address }, {})
    }

    //////
    // Its standing teams
    //////
    const roster = await this.people.roster(org)
    const folders: string[] = []
    for (const teamName of teams) {
      const team = folderOf(teamName)
      const known = roster?.teams.items.some((each) => each.folder === team)
      said(!known, `the ${teamName} (${team}@${org})`)
      if (!known) await this.roles.addTeam(org, { id: team, name: teamName }, {})
      folders.push(team)
    }

    //////
    // Its paired spaces' folders
    //////
    for (const address of spacesOf(org, [
      ...new Set([...(roster?.teams.items ?? []).map((each) => each.folder), ...folders])
    ])) {
      await mkdir(this.folderFor(address), { recursive: true })
      report.spaces = [...(report.spaces ?? []), address]
    }

    //////
    // Its own copies of the org's pages
    //////
    const orgName = file.name || name || org
    for (const page of ORG_PAGES) {
      said(await this.copyPage(page, org, orgName), `@${org}/${page}, its own copy of the built-in program`)
    }
    report.next.push(`its pages, on Spell's cloud:  ${ORG_PAGES.map((page) => `/apps/@${org}/${page}`).join("  ")}`)

    const holders = report.admins.length
    report.next.push(
      holders > 1
        ? `its recovery codes:  spell space org codes ${org} ${report.admins.map((each) => each.address).join(" ")}`
        : `its recovery codes, once it has another person to hold a part:  spell space org codes ${org} ${first} <someone>`
    )
    await this.roles.changed(org)
    return report
  }

  /**
   * SIDE EFFECT:  the built-in program `page` copied into org `org`'s shared space, naming the org instead of its sample:
   * `true`.  `false`, changing nothing, when the org has one of that name already:  it may have been edited.
   */
  private async copyPage(page: string, org: string, orgName: string): Promise<boolean> {
    const to = this.folderFor(`@${org}/${page}`)
    if (existsSync(to)) return false
    const from = this.builtInAt(page)
    await mkdir(to, { recursive: true })
    for (const entry of await readdir(from, { withFileTypes: true })) {
      if (!entry.isFile() || entry.name.startsWith(".")) continue
      const text = await readFile(join(from, entry.name), "utf8")
      await writeFile(join(to, entry.name), text.replace(SAMPLE_ORG, `@${org}`).replace(SAMPLE_NAME, orgName))
    }
    return true
  }
}

/** Constructor props of `OrgSetup`. */
export type OrgSetupProps = {
  /** People, orgs and rosters. */
  people: PeopleStore
  /** Who manages what (`SpaceFolders.orgRoles`). */
  roles: OrgRoles
  /** Where an address's folder is on disk:  `folderForPlace()`, unless a test says. */
  folderFor?: (address: string) => string
}

/** What `OrgSetup.create()` is asked to make. */
export type OrgSetupAsk = {
  /** Its id:  `rs`. */
  org: string
  /** What people call it:  "RS";  its id, left out. */
  name?: string
  /** Its first Admins, by email:  the first is its first Board too. */
  admins: string[]
  /** Its standing teams, by name:  "Events Team". */
  teams?: string[]
}

/** What `OrgSetup.create()` did, and what it leaves for people to do. */
export type OrgSetupReport = {
  /** The org's id. */
  org: string
  /** What it made, one line each. */
  made: string[]
  /** What was there already, one line each. */
  already: string[]
  /** Its first Admins:  each one's email, and their account. */
  admins: { email: string; address: string }[]
  /** Its paired spaces' addresses, each one's folder ready. */
  spaces?: string[]
  /** What's left for people, one line each, with its command. */
  next: string[]
}

////////////////
// ## Helpers
////////////////

/** A team's folder, from its name:  "Events Team" is `events_team`. */
function folderOf(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

/** Org `org`'s paired spaces (epic `atmosphere` P22):  the org's own, the Admins', each of `teams`', shared then private. */
function spacesOf(org: string, teams: string[]): string[] {
  const pairs = [`@${org}`, ...["admins", ...teams].map((each) => `${each}@${org}`)]
  return pairs.flatMap((shared) =>
    shared === `admins@${org}` ? [shared, `@${org}/${ADMIN_SPACE}`] : [shared, `${shared}/${PRIVATE_SPACE}`]
  )
}
