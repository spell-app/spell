import { JSON5File, LoadableFile, getDier, KnownFormat } from "spell/util"
import { after } from "spell/util/timing"
import { SP } from "spell/parser/spell"

import { LOCAL_PERSON } from "./projectGroups"
import { ProjectFiles } from "./ProjectFiles"
import {
  PROJECT_ARCHIVE_FORMAT,
  STARTER_PROGRAMS,
  freeProjectId,
  type ProjectArchive,
  type ProjectArchiveFile,
  type StarterProgram
} from "./starterProjects"

/**
 * A project GROUP's list of projects, e.g. `@spell/examples`.
 * - Loadable, and it creates, copies, renames and deletes the group's projects.
 *   - Each asks spaces' server through `LoadableFile.fetch`, as the list itself is read:
 *     whoever answers files answers these, e.g. the editor's static build, which keeps them in the browser (`StaticFiles`).
 * - One per group:  `new SpellProjectRoot("@spell/examples")` answers the one already made.
 * - Its groups are spaces' (`PROJECT_GROUPS`):  loading this file registers them with spell.
 * - It was spell's, until epic `people-and-orgs` P15 (decision Q20):  spell never lists projects.
 */
export class SpellProjectRoot extends JSON5File<SP.ProjectList> {
  /**
   * Format of what the editor sends:  JSON, as `application/json`, so the server parses it.
   * - It was a bare `"json"`, which the server took for no body at all:
   *   every create, copy, rename and delete of a project or a file failed with "Path must be a string"
   *   (found in epic `people-and-orgs` P15).
   */
  static REQUEST_FORMAT_JSON = KnownFormat.json

  /** Singleton `owen@spell` root:  this machine's person's own projects. */
  static get projects(): SpellProjectRoot {
    return new SpellProjectRoot(`${LOCAL_PERSON}@spell`)
  }
  /** Singleton `@spell/examples` root. */
  static get examples(): SpellProjectRoot {
    return new SpellProjectRoot("@spell/examples")
  }
  /** Singleton `@spell/guides` root. */
  static get guides(): SpellProjectRoot {
    return new SpellProjectRoot("@spell/guides")
  }
  /** Singleton `@spell/test` root -- frozen projects tests run against;  listed in the UI in dev only. */
  static get fixtures(): SpellProjectRoot {
    return new SpellProjectRoot("@spell/test")
  }
  /** Singleton `@spell/editor` root -- the editor's own pieces in Spell (epic `editor` P22);  listed in the UI in dev only. */
  static get editorPieces(): SpellProjectRoot {
    return new SpellProjectRoot("@spell/editor")
  }
  /** Singleton `@spell/library` root -- projects others import, e.g. `@spell/library/people` in a project file. */
  static get library(): SpellProjectRoot {
    return new SpellProjectRoot("@spell/library")
  }

  /** Return EXISTING singleton root for projectRoot `path` or `undefined`. */
  static rootForPath(rootPath: SP.ProjectRootPath) {
    return this.registry.get(rootPath)
  }

  /** Return singleton root associated with `name` string. */
  static getRoot(name: string | undefined): SpellProjectRoot | undefined {
    if (typeof name !== "string") return undefined
    if (name.startsWith("project")) return SpellProjectRoot.projects
    if (name.startsWith("examples")) return SpellProjectRoot.examples
    if (name.startsWith("guides")) return SpellProjectRoot.guides
    if (name.startsWith("library")) return SpellProjectRoot.library
    if (name.startsWith("fixtures")) return SpellProjectRoot.fixtures
    if (name.startsWith("editor")) return SpellProjectRoot.editorPieces
    return undefined
  }

  // From `src/projectSetup.js`
  /*@writeOnce path*/
  /*@writeOnce space*/
  /*@writeOnce domain*/
  /*@writeOnce title*/
  /*@writeOnce Type*/
  /*@writeOnce type*/
  /*@writeOnce description*/
  /*@writeOnce icon*/
  /*@writeOnce location*/

  /** Its address, e.g. `@spell/examples` or `owen@spell`:  see `SP.ProjectRootSpec.path`. */
  declare path: SP.ProjectRootPath
  /** Its space, as `@spell` or `owen@spell`. */
  declare space: string
  /** Its short name, as `projects`, `examples` or `guides`. */
  declare domain: string
  /** User-friendly title of project. */
  declare title: string
  /** Type of project for string concatenation, as `Project`, `Example` or `Guide`. */
  declare Type: string
  /** Type of project for string concatenation, as `project`, `example` or `guide`. */
  declare type: string
  /** User-friendly description of project. */
  declare description: string
  /** Semantic UI icon of project. */
  declare icon: string
  /** Listed in the app's UI only in dev, e.g. `@spell/test` -- see `SP.ProjectRootSpec.devOnly`. */
  declare devOnly?: boolean
  /** Immutable `location` object which we use to get various bits of the path. */
  declare location: SP.SpellLocation

  /** Registry of known instances. */
  static registry = new Map<string, SpellProjectRoot>()

  /**
   * Given `projectRoot` as `@spell/examples` etc, return a singleton `SpellProjectRoot`.
   * - throws if `projectRoot` is not in `SpellSetup.projectRoots`
   * - TODO: Calling this with `new ()` will return existing record.
   *   This violates the principle of least surprise, move to `rootForProjectRootPath()`?
   */
  constructor(path: SP.ProjectRootPath) {
    // Return immediately from registry if already present.
    const existing = SpellProjectRoot.registry.get(path)
    if (existing) return existing

    const setup = SP.SpellSetup.projectSpectForRootPath(path)
    super({})
    // CLAUDE TODO: can this just be super(setup)
    Object.assign(this, setup)
    this.location = new SP.SpellLocation(this.path)
    SpellProjectRoot.registry.set(this.path, this)
  }

  /** URL to load the project list:  `/api/projects/list/<group's address>` (`SP.SpellUrls.listUrl()`). */
  get url(): string {
    return SP.SpellUrls.listUrl(this.path)
  }

  /** Load our index if necessary, calling `die()` if something goes wrong. */
  async loadOrDie(die: ReturnType<typeof getDier>): Promise<void> {
    if (this.isLoaded) return
    try {
      await this.load(undefined)
    } catch (e) {
      die("Error loading project list", e)
    }
  }

  /**
   * List of paths for all available `SpellProject`s.
   * - SIDE EFFECT:  notes each one's title, if the list gave one, for `SpellProject.title` (decision Q45).
   */
  /*@memoizeForProp("contents")*/
  get projectPaths(): SP.ProjectPathList {
    return this.derivedFrom(
      "projectPaths",
      () =>
        (this.contents || []).map(({ path, title }) => {
          if (title) SP.SpellProject.listedTitles.set(path, title)
          else SP.SpellProject.listedTitles.delete(path)
          return path
        }),
      [this.contents]
    )
  }

  /**
   * Pointers to all available `SpellProject`s.
   * - NOTE: this will throw if server sends invalid paths!!!
   * - TODOC: it's tricky to use this in a component!
   */
  /*@memoizeForProp("projectPaths")*/
  get projects(): SP.SpellProject[] {
    return this.derivedFrom("projects", () => this.projectPaths.map((path) => new SP.SpellProject(path)), [
      this.contents
    ])
  }

  /**
   * Assuming we're loaded, return a known project by `path`.
   * Returns `undefined` if not found.
   */
  getProject(path: string): SP.SpellProject | undefined {
    return this.projects?.find((p) => p.path === path)
  }

  ////////////////
  // ## Project CRUD
  ////////////////

  /**
   * The project id for a name someone typed, beside project `basedOn` (which MUST be valid) or in this group.
   * - The editor asks for the name:  models never show a dialog.
   * - Returns `undefined` for a name with nothing left in it.
   * - SIDE EFFECT:  notes the title typed for it, in `titlesTyped`.
   */
  projectIdForName(name: string, basedOn?: string): string | undefined {
    const originalLocation = basedOn ? new SP.SpellLocation(basedOn) : undefined
    // lower-kebab, as every project's name (decision Q39):  `My Thing` => `my-thing`
    const typed = name.trim()
    const projectName = SP.SpellLocation.kebab(typed)
    if (!projectName) return undefined
    const newProjectId = `${originalLocation?.projectRoot ?? this.path}/${projectName}`
    this.titlesTyped.set(newProjectId, SP.SpellLocation.titleFor(projectName) === typed ? null : typed)
    return newProjectId
  }

  /**
   * The title typed for each project `projectIdForName()` named, by its id:
   * sent with its create, copy or rename (decision Q45).
   * - text:  what was typed, when the name made from the folder can't say it, `Todos - Form Based`
   * - `null`:  it can, so the project file keeps no title
   * - none:  no name typed;  the project file's title stays as it is
   */
  protected titlesTyped = new Map<string, string | null>()

  /**
   * Create a new project at `projectId`, starting as `first` (default:  a blank app, with a drawing to add things to).
   * Returns new project, or throws on error.
   */
  async createApp(projectId: string, first?: { filePath: string; contents: string }): Promise<SP.SpellProject> {
    const die = getDier(this, `creating ${this.type}`, { projectId })

    const location = new SP.SpellLocation(projectId, die)
    if (!location.isProjectPath) die("You must pass a projectId.")

    await this.loadOrDie(die)
    if (this.getProject(projectId)) die(`${this.Type} already exists.`)

    // Tell the server to create the project, which returns new projects list
    try {
      const newContents = await LoadableFile.fetch<SP.ProjectList>({
        url: `/api/projects/create/project`,
        contents: {
          projectId,
          title: this.titlesTyped.get(projectId),
          filePath: first?.filePath ?? STARTER_PROGRAMS.blank.fileName,
          contents: first?.contents ?? STARTER_PROGRAMS.blank.contents(titleFor(location))
        },
        requestFormat: SpellProjectRoot.REQUEST_FORMAT_JSON,
        format: "json"
      })
      this.contents = newContents
    } catch (e) {
      die(`Server error creating ${this.type}`, e)
    }
    // Return the new project
    return this.getProject(projectId) || die(`Server didn't create the new ${this.type}.`)
  }

  /**
   * Create a project from starter program `starter`, named for it, with no question asked.
   * - Returns the new project;  throws on error.
   */
  async createFrom(starter: StarterProgram): Promise<SP.SpellProject> {
    await this.load(undefined)
    const { name, fileName, contents } = STARTER_PROGRAMS[starter]
    const projectId = freeProjectId(this.path, name, this.projectPaths)
    const title = titleFor(new SP.SpellLocation(projectId))
    return (await this.createApp(projectId, { filePath: fileName, contents: contents(title) }))!
  }

  /**
   * Copy project `sourceId`, of any group, into this one, under its own name, with no question asked.
   * - Returns the copy;  throws on error.
   */
  async copyHere(sourceId: string): Promise<SP.SpellProject> {
    const die = getDier(this, `copying into ${this.type}`, { sourceId })
    await this.loadOrDie(die)
    const newProjectId = freeProjectId(this.path, new SP.SpellLocation(sourceId, die).projectName!, this.projectPaths)
    try {
      this.contents = await LoadableFile.fetch<SP.ProjectList>({
        url: `/api/projects/duplicate/project`,
        contents: { projectId: sourceId, newProjectId },
        requestFormat: SpellProjectRoot.REQUEST_FORMAT_JSON,
        format: "json"
      })
    } catch (e) {
      die(`Server error copying ${sourceId}`, e)
    }
    return this.getProject(newProjectId) || die(`Couldn't copy ${sourceId}.`)
  }

  /**
   * Project `project` as one file's worth of text, to keep or to move:  `importApp()` reads it back.
   * - Only its text files:  a picture stays behind.
   * - throws if a file can't be read
   */
  async exportApp(project: SP.SpellProject): Promise<ProjectArchive> {
    const files: ProjectArchiveFile[] = []
    for (const file of project.files) {
      const contents = file.contents ?? (await file.load(undefined))
      if (typeof contents === "string" && file.filePath) files.push({ path: file.filePath, contents })
    }
    const title = project.contents?.title
    return { format: PROJECT_ARCHIVE_FORMAT, name: project.projectName!, ...(title && { title }), files }
  }

  /**
   * Make a project in this group from `archive`, under its own name, or the next one free.
   * - Returns the new project;  throws on error.
   */
  async importApp(archive: ProjectArchive): Promise<SP.SpellProject> {
    await this.load(undefined)
    const projectId = freeProjectId(this.path, archive.name, this.projectPaths)
    if (archive.title) this.titlesTyped.set(projectId, archive.title)
    const [first, ...others] = archive.files as [ProjectArchiveFile, ...ProjectArchiveFile[]]
    const project = (await this.createApp(projectId, { filePath: first.path, contents: first.contents }))!
    await project.load(undefined)
    const files = new ProjectFiles(project)
    for (const { path, contents } of others) await files.create(path, contents)
    return project
  }

  /**
   * Duplicate an existing project.
   * Returns new project, `undefined` if cancelled, or throws on error.
   */
  async duplicateApp(projectId: string, newProjectId: string): Promise<SP.SpellProject> {
    const die = getDier(this, `duplicating ${this.type}`, { projectId, newProjectId })

    new SP.SpellLocation(projectId, die)

    await this.loadOrDie(die)
    if (!this.getProject(projectId)) die(`${this.Type} does not exist.`)

    const newLocation = new SP.SpellLocation(newProjectId, die)
    if (!newLocation.isProjectPath) die("You must pass a newProjectId.")
    if (this.getProject(newProjectId)) die(`New ${this.type} already exists.`)

    // Tell the server to duplicate the project, which returns new projects list
    try {
      const newContents = await LoadableFile.fetch<SP.ProjectList>({
        url: `/api/projects/duplicate/project`,
        contents: { projectId, newProjectId, title: this.titlesTyped.get(newProjectId) },
        requestFormat: SpellProjectRoot.REQUEST_FORMAT_JSON,
        format: "json"
      })
      this.contents = newContents
    } catch (e) {
      die(`Server error duplicating ${this.type}`, e)
    }
    // Return the new project
    return this.getProject(newProjectId) || die(`Couldn't create new ${this.type}`)
  }

  /**
   * Rename an existing project.
   * Returns new project, `undefined` if cancelled, or throws on error.
   */
  async renameApp(projectId: string, newProjectId: string): Promise<SP.SpellProject | undefined> {
    const die = getDier(this, `renaming ${this.type}`, { projectId, newProjectId })

    new SP.SpellLocation(projectId, die)

    await this.loadOrDie(die)
    const project = this.getProject(projectId) || die(`${this.Type} does not exist.`)

    if (newProjectId === projectId) return undefined

    const newLocation = new SP.SpellLocation(newProjectId, die)
    if (!newLocation.isProjectPath) die("You must pass a newProjectId.")
    if (this.getProject(newProjectId)) die(`New ${this.type} already exists.`)

    // Tell the server to rename the project, which returns new projects list
    try {
      const newContents = await LoadableFile.fetch<SP.ProjectList>({
        url: `/api/projects/rename/project`,
        contents: { projectId, newProjectId, title: this.titlesTyped.get(newProjectId) },
        requestFormat: SpellProjectRoot.REQUEST_FORMAT_JSON,
        format: "json"
      })
      this.contents = newContents
      // Have the project clean itself up in a tick (doing it at once trips whatever is drawing it)
      void after(0.01, () => project.onRemove()).catch(console.error)
    } catch (e) {
      die(`Server error renaming ${this.type}`, e)
    }

    // Return the new project
    return this.getProject(newProjectId) || die(`Server couldn't rename ${this.type}.`)
  }

  /**
   * Remove an existing project.
   * Returns `true` on success, or throws on error.
   */
  async deleteApp(projectId: string): Promise<boolean> {
    const die = getDier(this, `removing ${this.type}`, { projectId })
    new SP.SpellLocation(projectId, die)

    await this.loadOrDie(die)
    const project = this.getProject(projectId) || die(`${this.Type} does not exist.`)

    // Tell the server to remove the project, which returns new projects list
    try {
      const newContents = await LoadableFile.fetch<SP.ProjectList>({
        url: `/api/projects/remove/project`,
        method: "DELETE",
        contents: { projectId },
        requestFormat: SpellProjectRoot.REQUEST_FORMAT_JSON,
        format: "json"
      })
      this.contents = newContents
    } catch (e) {
      die(`Server error deleting ${this.type}`, e)
    }
    // Barf if the project still exists
    if (this.getProject(projectId)) die(`Server didn't delete ${this.type}.`)

    // Have the project clean itself up in a tick (doing it at once trips whatever is drawing it)
    void after(0.01, () => project.onRemove()).catch(console.error)
    return true
  }

  /**
   * Save `project`'s settings into its project file (Project Settings, epic `property-editor` P5).
   * - The settings:  `title`, `version`, `targets`, `listsStartAt`.
   * - A setting that's `null`, `""` or `[]` is removed from the file:  its default applies.
   * - SIDE EFFECT:  `project.contents` takes what the file says now, so its `title`, `targets` ... follow at once.
   * - throws on a server error
   */
  async saveSettings(project: SP.SpellProject, settings: ProjectSettings): Promise<void> {
    const die = getDier(this, `saving the settings of ${project.projectId}`, { settings })
    let saved: ProjectSettings = {}
    try {
      saved = await LoadableFile.fetch<ProjectSettings>({
        url: `/api/projects/settings/project`,
        contents: { projectId: project.projectId, settings },
        requestFormat: SpellProjectRoot.REQUEST_FORMAT_JSON,
        format: "json"
      })
    } catch (e) {
      die(`Server error saving the settings of ${project.projectId}`, e)
    }
    const contents = { ...project.contents } as Record<string, unknown>
    for (const key of PROJECT_SETTINGS) {
      if (key in saved) contents[key] = saved[key]
      else delete contents[key]
    }
    project.contents = contents as SP.ProjectManifestJSON5
  }

  ////////////////
  // ## Debug
  ////////////////

  /** Debug string, e.g. `SpellProjectRoot: owen@spell`. */
  toString(): string {
    return `${this.constructor.name}: ${this.path}`
  }
}

/** What people call the project at `location`:  `my-app` => `My App`. */
function titleFor(location: SP.SpellLocation): string {
  return SP.SpellLocation.titleFor(location.projectName!)
}

/** The project file's settings a person edits:  what `saveSettings()` sends, and the server's route keeps. */
export const PROJECT_SETTINGS = ["title", "version", "targets", "listsStartAt"] as const

/** A project's settings, as Project Settings edits them:  each optional, `null` to remove it from the file. */
export type ProjectSettings = {
  [K in (typeof PROJECT_SETTINGS)[number]]?: SP.ProjectManifestJSON5[K] | null
}
