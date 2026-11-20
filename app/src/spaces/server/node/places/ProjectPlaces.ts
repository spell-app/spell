import { readdir, readFile } from "fs/promises"
import { join, relative, resolve } from "path"

import { AUTHENTICATED_PLACES_PREFIX } from "spell/places/places.types"
import type { AuthenticatedPlace, AuthenticatedPlaceSource, FoundPlace } from "spell/server/places"
import { SP } from "spell/parser/spell"
import environment from "spell/app/spaces/server/node/environment"
import { buildFolderFor, loadProjectFile } from "spell/app/spaces/server/node/projects/project-utils"

/** Folders under `build/` that hold no project's own declarations:  a person's drafts' builds. */
const NOT_A_PROJECTS_BUILD = /(^|\/)__draft(\/|$)/

/****************
 * ### `ProjectPlaces`
 * Every project's authenticated places, for the page server to read for its pages:
 * a source of the kit's `AuthenticatedPlaces`.
 * - Read from what each project compiled to, its declarations (`SP.DeclaredPlace.served`):  the place's address,
 *   kind, and the NAME of its secret.  The page server parses nothing, and a page can say none of it.
 * - Each place's deployment, picked as `spell run` picks it (`SP.SpellProject.deploymentsIn()`), by
 *   `SPELL_DEPLOYMENT`:  its address, its secret's name, read only or not.
 *   - A deployment its project file doesn't list:  the place reads as its line says, and the log says so once.
 * - Every place for the secrets that aren't set:  every project's declarations under `build/`, built when the page
 *   server last compiled it (`ProjectBuild`), drafts' builds left out.
 * - Node only;  imported by path, by the app's route module.
 ****************/
export class ProjectPlaces implements AuthenticatedPlaceSource {
  /** Where secrets are found, by name, and `SPELL_DEPLOYMENT`:  the environment. */
  private readonly from: Readonly<Record<string, string | undefined>>
  /** The build folder its declarations are read from. */
  private readonly buildDir: string
  /** Projects whose deployment was said not to be listed:  said once each. */
  private readonly saidUnlisted = new Set<string>()

  constructor({ from = process.env, buildDir = environment.buildDir }: ProjectPlacesProps = {}) {
    this.from = from
    this.buildDir = buildDir
  }

  /** The place a request's path names (`@acme/jobs/jobs/jobs/12`), from its project's declarations. */
  async placeIn(path: string): Promise<FoundPlace | undefined> {
    const { projectId, rest } = projectOf(path) ?? {}
    if (!projectId || rest === undefined) return undefined
    const [name = "", ...more] = rest.split("/")
    const location = SP.SpellLocation.getProjectLocation(projectId)
    const file = join(
      buildFolderFor(location.serverPath, { ...environment, buildDir: this.buildDir }),
      `${location.projectName}${SP.DECLARATIONS_JSON_SUFFIX}`
    )
    const place = (await this.placesIn(file, projectId)).find((each) => each.name === name)
    if (!place) return undefined
    return { place, served: `${projectId}/${name}`, rest: more.length ? `/${more.join("/")}` : "" }
  }

  /** Every place of every project built here. */
  async every(): Promise<AuthenticatedPlace[]> {
    const files = await declarationsUnder(this.buildDir)
    const lists = await Promise.all(files.map((file) => this.placesIn(file)))
    return lists.flat()
  }

  /**
   * The authenticated places a project's declarations file says, each in its deployment:  none for a file that isn't there.
   * - `projectId`:  left out, each place's own, from where a page reads it.
   */
  private async placesIn(file: string, projectId?: string): Promise<AuthenticatedPlace[]> {
    const text = await readFile(file, "utf8").catch(() => "")
    const served = (SP.SpellDeclarations.read(text)?.statements ?? []).flatMap(({ place }) =>
      place?.served ? [{ name: place.name, served: place.served }] : []
    )
    if (!served.length) return []
    const project = projectId ?? projectIn(served[0]!.served.servedAt, served[0]!.name)
    const deployments = await this.deploymentsOf(project)
    return served.map(({ name, served: { at, kind, keyNamed, keyGoes, tokenFrom, readOnly } }) => {
      const deployed = deployments[name]
      const token = deployed?.tokenFrom ?? tokenFrom
      return {
        project,
        name,
        kind,
        at: deployed?.at ?? at,
        keyNamed: deployed?.key ?? keyNamed,
        ...(keyGoes && { keyGoes }),
        ...(token !== undefined && { tokenFrom: token }),
        ...((readOnly || deployed?.readOnly) && { readOnly: true })
      }
    })
  }

  /**
   * Each place's deployment `SPELL_DEPLOYMENT` names, from `projectId`'s project file:  none when it names none.
   * - NEVER throws:  a project file that lists no such deployment reads as its lines say, said once.
   */
  private async deploymentsOf(projectId: string): Promise<ReturnType<typeof SP.SpellProject.deploymentsIn>> {
    const deployment = this.from[SP.DEPLOYMENT_VARIABLE]
    if (!deployment) return {}
    try {
      const { places } = await loadProjectFile(projectId)
      return SP.SpellProject.deploymentsIn(places, deployment, projectId)
    } catch (error) {
      if (!this.saidUnlisted.has(projectId)) console.warn(`places:  ${(error as Error).message}`)
      this.saidUnlisted.add(projectId)
      return {}
    }
  }
}

/** Constructor props of `ProjectPlaces`. */
export type ProjectPlacesProps = {
  /** Where secrets and `SPELL_DEPLOYMENT` are found;  default the environment. */
  from?: Readonly<Record<string, string | undefined>>
  /** The build folder;  default the checkout's. */
  buildDir?: string
}

/** The project a request's path starts with, and the rest:  `undefined` for one no project group holds. */
function projectOf(path: string): { projectId: string; rest: string } | undefined {
  try {
    return SP.SpellUrls.split(path)
  } catch {
    return undefined
  }
}

/** The project a place is in, from where a page reads it:  `/api/places/projects/@acme/jobs/jobs` => `@acme/jobs`. */
function projectIn(servedAt: string, name: string): string {
  const encoded = servedAt.slice(AUTHENTICATED_PLACES_PREFIX.length + 1, -(name.length + 1))
  return encoded.split("/").map(decodeURIComponent).join("/")
}

/** Every declarations file under `folder`, drafts' builds left out. */
async function declarationsUnder(folder: string): Promise<string[]> {
  const entries = await readdir(folder, { recursive: true }).catch(() => [] as string[])
  return entries
    .filter((entry) => entry.endsWith(SP.DECLARATIONS_JSON_SUFFIX))
    .map((entry) => resolve(folder, entry))
    .filter((file) => !NOT_A_PROJECTS_BUILD.test(relative(folder, file)))
}
