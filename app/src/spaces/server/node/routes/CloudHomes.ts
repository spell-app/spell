import type { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"
import type { NamedSpace } from "spell/app/spaces/server/node/people/OrgRoles"
import type { SpaceFolders } from "spell/app/spaces/server/node/places/SpaceFolders"
import { readJSON5 } from "spell/app/spaces/server/node/storage/json5"

/** The file that makes a folder a program. */
export const PROJECT_FILE = "__project.json5"

/** What an org's id looks like:  anything else in an address is no org's, and is never looked for on the disk. */
const ORG_ID = /^[a-z0-9][a-z0-9_-]*$/i

/** Where the cloud shows a program. */
const APPS_PREFIX = "/apps"

/****************
 * ### `CloudHomes`
 * What the cloud's two kinds of home page list (epic `atmosphere` T59), each only what the person asking may read:
 * - the spaces home, `/` (`spacesFor()`)
 * - an org's home, `/@willzalone` (`orgFor()`)
 *
 * - WHICH SPACES:  the rule is `SpaceFolders.mayReadSpace()`'s, asked of every one, so a stranger can't find out
 *   what an org has.
 *   - An org someone reads is ONE line, linking to its home, which lists the rest.
 *   - An org they don't read:  only the spaces in it they do, a public one or one whose list names them.
 *   - Their own space, always.
 * - Only an org's own home has a page yet:  every other space is listed with no link (`HomeSpace.link`).
 * - Other people's own spaces in an org aren't listed:  everyone in the org reads them, so the list would be the org's
 *   whole membership.
 * - Node only;  knows nothing of HTTP or pages:  `SpellCloud` answers with these.
 ****************/
export class CloudHomes {
  /** Every project data folder:  who reads what. */
  private readonly folders: SpaceFolders
  /** People and orgs, and the files under each org's folder. */
  private readonly people: PeopleStore

  constructor({ folders, people }: CloudHomesProps) {
    this.folders = folders
    this.people = people
  }

  /** Every space on the spaces home for `person` (`undefined`:  nobody signed in).  See the class. */
  async spacesFor(person: string | undefined): Promise<HomeSpace[]> {
    const spaces = new Map<string, HomeSpace>()
    if (person && (await this.folders.mayReadSpace(person, person))) {
      spaces.set(person, { address: person, name: "Your space", kind: "your space" })
    }
    const { orgs } = await this.people.orgs()
    for (const org of orgs) {
      const address = `@${org.id}`
      if (await this.folders.mayReadSpace(address, person)) {
        spaces.set(address, { address, name: org.name || org.id, kind: "org", link: `/${address}` })
        continue
      }
      for (const space of await this.readableSpacesOf(org.id, person)) {
        if (!spaces.has(space.address)) spaces.set(space.address, space)
      }
    }
    return [...spaces.values()]
  }

  /**
   * Org `org`'s home for `person`:  `undefined` for anyone who can't read it and for an org that isn't there,
   * so the two can't be told apart.
   */
  async orgFor(org: string, person: string | undefined): Promise<OrgHome | undefined> {
    if (!ORG_ID.test(org) || !(await this.people.hasOrg(org))) return undefined
    if (!(await this.folders.mayReadSpace(`@${org}`, person))) return undefined
    return {
      id: org,
      name: (await this.people.org(org))?.name || org,
      programs: await this.programsOf(org),
      spaces: await this.readableSpacesOf(org, person)
    }
  }

  /**
   * The programs in org `org`'s shared space, the ones the cloud serves (`SpellCloud.sharedProgramAt()`):
   * a folder straight in it with a project file.  None for an org with no Admin space.
   */
  private async programsOf(org: string): Promise<HomeProgram[]> {
    const space = await this.folders.orgRoles.spaceAt(`@${org}`)
    if (space?.side !== "shared" || space.of.kind !== "the-org") return []
    const { storage } = this.people
    const programs: HomeProgram[] = []
    for (const entry of await storage.list(`@${org}`)) {
      if (!entry.endsWith("/") || entry.startsWith("__") || entry.startsWith(".")) continue
      const folder = entry.slice(0, -1)
      const project = await readJSON5<ProjectTitle>(storage, `@${org}/${folder}/${PROJECT_FILE}`)
      if (project) programs.push({ name: project.title || folder, link: `${APPS_PREFIX}/@${org}/${folder}` })
    }
    return programs
  }

  /** Every space under org `org`'s, but the org's own, that `person` may read:  each named, as people call it. */
  private async readableSpacesOf(org: string, person: string | undefined): Promise<HomeSpace[]> {
    const named = await this.folders.orgRoles.pairedSpacesOf(org)
    const nameOf = new Map(named.map((space) => [space.address, nameShown(space)]))
    const addresses = new Set([...nameOf.keys(), ...(await this.folders.lists.spacesOf(org))])
    addresses.delete(`@${org}`)
    const readable: HomeSpace[] = []
    for (const address of addresses) {
      if (await this.folders.mayReadSpace(address, person)) {
        const kind = (await this.folders.isPublicSpace(address)) ? "public" : "members"
        readable.push({ address, name: nameOf.get(address) ?? address, kind })
      }
    }
    return readable
  }
}

/** Constructor props of `CloudHomes`. */
export type CloudHomesProps = {
  /** Every project data folder:  who reads what. */
  folders: SpaceFolders
  /** People and orgs. */
  people: PeopleStore
}

/** One line of a home page's list of spaces. */
export type HomeSpace = {
  /** Its address:  `@rs`, `events_team@rs`, `ana@spell`. */
  address: string
  /** What people call it. */
  name: string
  /** What it is, for the page to say. */
  kind: HomeSpaceKind
  /** Where it opens:  left out for a space with no page of its own yet. */
  link?: string
}

/**
 * What a space on a home page is:
 * - `org`:  an org the person reads
 * - `your space`:  the person's own
 * - `public`:  anyone reads it
 * - `members`:  the people on its list, the person among them
 */
export type HomeSpaceKind = "org" | "your space" | "public" | "members"

/** One program on an org's home. */
export type HomeProgram = {
  /** Its title. */
  name: string
  /** Where it opens:  `/apps/@rs/OrgAdmin`. */
  link: string
}

/** What an org's home shows (`CloudHomes.orgFor()`). */
export type OrgHome = {
  /** The org's id:  `rs`. */
  id: string
  /** What it's called. */
  name: string
  /** Its programs. */
  programs: HomeProgram[]
  /** Its other spaces that the person asking may read. */
  spaces: HomeSpace[]
}

/** The one thing read from a program's project file. */
type ProjectTitle = {
  /** As people call it:  `Org Admin`. */
  title?: string
}

/** `space`'s name on a page:  its private side says so. */
function nameShown(space: NamedSpace): string {
  return space.side === "private" ? `${space.name} (private)` : space.name
}
