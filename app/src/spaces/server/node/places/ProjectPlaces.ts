import { readdir, readFile } from "fs/promises"
import { homedir } from "os"
import { join, relative, resolve, sep } from "path"

import { AUTHENTICATED_PLACES_PREFIX } from "spell/places/places.types"
import type { AuthenticatedPlace, AuthenticatedPlaceSource, FoundPlace } from "spell/server/places"
import { SP } from "spell/parser/spell"
import environment from "spell/app/spaces/server/node/environment"
import {
  buildFolderFor,
  loadProjectFile,
  SPACES_BUILD,
  spacesBuildDir
} from "spell/app/spaces/server/node/projects/project-utils"

/** Folders under `build/` that hold no project's own declarations:  a person's drafts' builds. */
const NOT_A_PROJECTS_BUILD = /(^|\/)__draft(\/|$)/

/****************
 * ### `ProjectPlaces`
 * Every project's authenticated places, for the page server to read for its pages:
 * a source of the kit's `AuthenticatedPlaces`.
 * - Read from what each project compiled to, its declarations (`SP.DeclaredPlace.served`):  the place's address,
 *   kind, and the NAME of its secret.  The page server parses nothing, and a page can say none of it.
 * - Each place's deployment, picked as `spell run` picks it (`SP.SpellProject.deploymentsIn()`), by
 *   `SPELL_DEPLOYMENT`:  its address, its secret's name, read only or not;  its saved answers' folder (`fixtures`,
 *   under the project's folder unless it starts `/` or `~`) and whether it's `offline`.
 *   - A deployment its project file doesn't list:  every place of that project is REFUSED, in
 *     `SP.UnlistedDeploymentError`'s words, at startup and on every read (from-console J104).
 *     Never read as its line says:  that would read the wrong server quietly.
 * - Every place for the secrets that aren't set:  every project's declarations under `build/`, built when the page
 *   server last compiled it (`ProjectBuild`), drafts' builds and other spaces folders' builds left out.
 * - Node only;  imported by path, by the app's route module.
 ****************/
export class ProjectPlaces implements AuthenticatedPlaceSource {
  /** Where secrets are found, by name, and `SPELL_DEPLOYMENT`:  the environment. */
  private readonly from: Readonly<Record<string, string | undefined>>
  /** The build folder its declarations are read from. */
  private readonly buildDir: string
  /** Reads a project's file, by its address. */
  private readonly projectFileOf: (projectId: string) => Promise<Pick<SP.ProjectManifestJSON5, "places">>
  /** Projects whose file couldn't be read:  said once each. */
  private readonly saidUnreadable = new Set<string>()
  /** A project's folder on disk, by its address. */
  private readonly projectFolderOf: (projectId: string) => string

  constructor({
    from = process.env,
    buildDir = environment.buildDir,
    projectFileOf = loadProjectFile,
    projectFolderOf = (projectId) => SP.SpellLocation.getProjectLocation(projectId).serverPath
  }: ProjectPlacesProps = {}) {
    this.from = from
    this.buildDir = buildDir
    this.projectFileOf = projectFileOf
    this.projectFolderOf = projectFolderOf
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

  /**
   * Every place of every project built here, for the spaces this server serves:  never another spaces folder's
   * build (`spacesBuildDir()`), which a project's other checkouts, on this kit, write.
   */
  async every(): Promise<AuthenticatedPlace[]> {
    const own = relative(this.buildDir, spacesBuildDir({ ...environment, buildDir: this.buildDir }))
    const files = (await declarationsUnder(this.buildDir)).filter((file) => {
      const [top = ""] = relative(this.buildDir, file).split(sep)
      return top === own || (top !== SPACES_BUILD && !top.startsWith(`${SPACES_BUILD}.`))
    })
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
    const { deployments, refusal } = await this.deploymentsOf(project)
    return served.map(({ name, served: { at, kind, keyNamed, keyGoes, tokenFrom, renewsAt, readOnly, writes, asks } }) => {
      const deployed = deployments[name]
      const token = deployed?.tokenFrom ?? tokenFrom
      const fixtures = typeof deployed?.fixtures === "string" ? this.folderIn(project, deployed.fixtures) : undefined
      const offline = deployed?.offline === true || Array.isArray(deployed?.offline) ? deployed.offline : undefined
      return {
        project,
        name,
        kind,
        at: deployed?.at ?? at,
        keyNamed: deployed?.key ?? keyNamed,
        ...(keyGoes && { keyGoes }),
        ...(token !== undefined && { tokenFrom: token }),
        ...(renewsAt !== undefined && { renewsAt }),
        ...(fixtures !== undefined && { fixtures }),
        ...(offline !== undefined && { offline }),
        ...((readOnly || deployed?.readOnly) && { readOnly: true }),
        ...(refusal !== undefined && { refusal }),
        ...(writes && { writes }),
        ...(asks && { asks })
      }
    })
  }

  /** `folder`, whole:  under the project's own folder, unless it starts `/`, or `~` (your home). */
  private folderIn(projectId: string, folder: string): string {
    if (folder === "~" || folder.startsWith("~/")) return join(homedir(), folder.slice(1))
    return resolve(this.projectFolderOf(projectId), folder)
  }

  /**
   * Each place's deployment `SPELL_DEPLOYMENT` names, from `projectId`'s project file:  none when it names none.
   * - `refusal`:  a deployment the file doesn't list, in `SP.UnlistedDeploymentError`'s words.
   * - NEVER throws:  a project file that can't be read reads as its lines say, logged once.
   */
  private async deploymentsOf(projectId: string): Promise<ProjectDeployments> {
    const deployment = this.from[SP.DEPLOYMENT_VARIABLE]
    if (!deployment) return { deployments: {} }
    try {
      const { places } = await this.projectFileOf(projectId)
      return { deployments: SP.SpellProject.deploymentsIn(places, deployment, projectId) }
    } catch (error) {
      if (error instanceof SP.UnlistedDeploymentError) return { deployments: {}, refusal: error.message }
      if (!this.saidUnreadable.has(projectId))
        console.error(`ProjectPlaces:  can't read ${projectId}'s project file`, error)
      this.saidUnreadable.add(projectId)
      return { deployments: {} }
    }
  }
}

/** Constructor props of `ProjectPlaces`. */
export type ProjectPlacesProps = {
  /** Where secrets and `SPELL_DEPLOYMENT` are found;  default the environment. */
  from?: Readonly<Record<string, string | undefined>>
  /** The build folder;  default the checkout's. */
  buildDir?: string
  /** Reads a project's file, by its address;  default from disk (`loadProjectFile()`). */
  projectFileOf?: (projectId: string) => Promise<Pick<SP.ProjectManifestJSON5, "places">>
  /** A project's folder on disk, by its address:  where its saved answers' folder is found. */
  projectFolderOf?: (projectId: string) => string
}

/** A project's places' deployments, picked by `SPELL_DEPLOYMENT`, or why none can be. */
type ProjectDeployments = {
  /** Each place's, by its name as compiled code names it. */
  deployments: ReturnType<typeof SP.SpellProject.deploymentsIn>
  /** Why its places are refused:  a deployment its file doesn't list. */
  refusal?: string
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
