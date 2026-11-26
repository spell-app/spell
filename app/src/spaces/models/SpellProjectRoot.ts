import { JSON5File, LoadableFile, getDier, KnownFormat } from "spell/util"
import { parseJSON5 } from "spell/util/spell/parseJSON5"
import { after } from "spell/util/timing"
import { SP } from "spell/parser/spell"

import { localPerson, type ProjectListEntryWithHome, type UnsavedApp } from "./projectGroups"
import { ProjectFiles } from "./ProjectFiles"
import { projectFileOf, projectFilesUrl, type ProjectArchive, type ProjectArchiveFile } from "./projectArchive"
import {
  STARTER_PROGRAMS,
  freeProjectId,
  type Starter,
  type StarterProgram,
  type StartingFile
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

  /** Singleton `owen@spell` root:  this machine's person's own projects (`localPerson`). */
  static get projects(): SpellProjectRoot {
    return new SpellProjectRoot(localPerson.address as SP.ProjectRootPath)
  }
  /** Singleton `@spell/examples` root. */
  static get examples(): SpellProjectRoot {
    return new SpellProjectRoot("@spell/examples")
  }
  /** Singleton `@spell/guides` root. */
  static get guides(): SpellProjectRoot {
    return new SpellProjectRoot("@spell/guides")
  }
  /** Singleton `@spell/sites` root. */
  static get sites(): SpellProjectRoot {
    return new SpellProjectRoot("@spell/sites")
  }
  /** Singleton `@spell/test` root -- frozen projects tests run against;  listed in the UI in dev only. */
  static get fixtures(): SpellProjectRoot {
    return new SpellProjectRoot("@spell/test")
  }
  /** Singleton `@spell/editor` root -- the editor's own pieces in Spell (epic `editor` P22);  listed in the UI in dev only. */
  static get editorPieces(): SpellProjectRoot {
    return new SpellProjectRoot("@spell/editor")
  }
  /**
   * Singleton `@spell/library` root -- projects others import, e.g. `@spell/library/people` in a project file,
   * and the org apps (`@spell/library/OrgAdmin` ...;  epic `mockup` P18), each org's pages copied from them.
   */
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
    if (name.startsWith("sites")) return SpellProjectRoot.sites
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
   * Create a new project at `projectId`, starting as `first`, and return it;  throws on error.
   * - `first`:  one file to make it with, or a starter program (`STARTER_PROGRAMS`), by its key
   *   - default:  `"blank"`, an app with a drawing to add things to
   *   - a starter's first file is made with the project, its other files after it, in their order:
   *     a site's (`"site"`) its main page layout and home page (epic `mockup` T40)
   */
  async createApp(projectId: string, first: StartingFile | StarterProgram = "blank"): Promise<SP.SpellProject> {
    const die = getDier(this, `creating ${this.type}`, { projectId })

    const location = new SP.SpellLocation(projectId, die)
    if (!location.isProjectPath) die("You must pass a projectId.")

    await this.loadOrDie(die)
    if (this.getProject(projectId)) die(`${this.Type} already exists.`)
    const starter: Starter | undefined = typeof first === "string" ? STARTER_PROGRAMS[first] : undefined
    const start: StartingFile = starter
      ? { filePath: starter.fileName, contents: starter.contents(titleFor(location)) }
      : (first as StartingFile)

    // Tell the server to create the project, which returns new projects list
    try {
      const newContents = await LoadableFile.fetch<SP.ProjectList>({
        url: `/api/projects/create/project`,
        contents: {
          projectId,
          title: this.titlesTyped.get(projectId),
          filePath: start.filePath,
          contents: start.contents
        },
        requestFormat: SpellProjectRoot.REQUEST_FORMAT_JSON,
        format: "json"
      })
      this.contents = newContents
    } catch (e) {
      die(`Server error creating ${this.type}`, e)
    }
    const project = this.getProject(projectId) || die(`Server didn't create the new ${this.type}.`)
    if (starter?.alongside) {
      const files = new ProjectFiles(project)
      for (const { fileName, contents } of starter.alongside) await files.writeFile(fileName, contents)
    }
    return project
  }

  /**
   * Create a project from starter program `starter`, named for it, with no question asked.
   * - `untouched`:  marked as a start card's, not one of your apps until it changes (`markUnsaved()`)
   * - Returns the new project;  throws on error.
   */
  async createFrom(starter: StarterProgram, { untouched = false }: StartOptions = {}): Promise<SP.SpellProject> {
    await this.load(undefined)
    const project = await this.createApp(
      freeProjectId(this.path, STARTER_PROGRAMS[starter].name, this.projectPaths),
      starter
    )
    if (untouched) await this.markUnsaved(project.path, "untouched")
    return project
  }

  /**
   * Copy project `sourceId`, of any group, into this one, under its own name, with no question asked:
   * `owen@spell/Solitaire`, or the next free name, `Solitaire 2`.
   * - `untouched`:  marked as a start card's, not one of your apps until it changes (`markUnsaved()`)
   * - `withDraft`:  the copy takes your draft of `sourceId`, which then goes (epic `mockup` T52):
   *   an example you changed, saved as your own app
   * - Returns the copy;  throws on error.
   */
  async copyHere(
    sourceId: string,
    { untouched = false, withDraft = false }: CopyOptions = {}
  ): Promise<SP.SpellProject> {
    const die = getDier(this, `copying into ${this.type}`, { sourceId })
    await this.loadOrDie(die)
    const newProjectId = freeProjectId(this.path, new SP.SpellLocation(sourceId, die).projectName!, this.projectPaths)
    try {
      this.contents = await LoadableFile.fetch<SP.ProjectList>({
        url: `/api/projects/duplicate/project`,
        contents: { projectId: sourceId, newProjectId, withDraft: withDraft || undefined },
        requestFormat: SpellProjectRoot.REQUEST_FORMAT_JSON,
        format: "json"
      })
    } catch (e) {
      die(`Server error copying ${sourceId}`, e)
    }
    const copy = this.getProject(newProjectId) || die(`Couldn't copy ${sourceId}.`)
    if (untouched) await this.markUnsaved(newProjectId, "untouched")
    return copy
  }

  /**
   * Mark project `projectId`, made from a start card, as `unsaved` (`UnsavedApp`, epic `mockup` I42);
   * `null`:  keep it for good, the mark gone.
   * - Its first change makes an untouched one `"changed"` by itself, on the server.
   * - Marking one `"untouched"` also deletes the group's untouched ones left a day ago (the server's `sweepUntouched()`).
   * - throws on error
   */
  async markUnsaved(projectId: string, unsaved: UnsavedApp | null): Promise<void> {
    const die = getDier(this, `marking ${this.type}`, { projectId, unsaved })
    try {
      this.contents = await LoadableFile.fetch<SP.ProjectList>({
        url: `/api/projects/unsaved/project`,
        contents: { projectId, unsaved },
        requestFormat: SpellProjectRoot.REQUEST_FORMAT_JSON,
        format: "json"
      })
    } catch (e) {
      die(`Server error marking ${projectId}`, e)
    }
  }

  /**
   * Project `projectId`'s mark, as the server says now (`UnsavedApp`):  `undefined` once it's kept,
   * or when it's not in this group (any more).
   * - Reads the group's list again first:  its first change marks it on the server alone.
   * - throws on error
   */
  async unsavedNow(projectId: string): Promise<UnsavedApp | undefined> {
    await this.reload()
    return (this.contents as ProjectListEntryWithHome[] | undefined)?.find((entry) => entry.path === projectId)?.unsaved
  }

  /**
   * Every file of project `project`, gathered to keep or to move:
   * `projectArchiveZip()` zips it, `importApp()` reads it back.
   * - Its own files first, in its order, as the editor has them now;
   *   then every other file of its folder (`PROJECT_FILES_URL`):  pictures, its project file ...
   * - Each read through its URL, so a file you've drafted is your draft, as the editor shows it.
   * - A project with no project file on the list (the static build's) gets one made from its index:
   *   its settings and its files' order.
   * - throws if a file can't be read
   */
  async exportApp(project: SP.SpellProject): Promise<ProjectArchive> {
    const files = new Map<string, string | Uint8Array>()
    for (const file of project.files) {
      const contents = file.contents ?? (await file.load(undefined))
      if (typeof contents === "string" && file.filePath) files.set(file.filePath, contents)
    }
    const everyFile = await LoadableFile.fetch<string[]>({
      url: projectFilesUrl(project.projectId),
      format: KnownFormat.json
    })
    for (const path of everyFile) {
      if (!files.has(path)) files.set(path, await bytesOfFile(`${project.projectId}${path}`))
    }
    const archive: ProjectArchive = {
      name: project.projectName!,
      ...(project.contents?.title && { title: project.contents.title }),
      files: [...files].map(([path, contents]) => ({ path, contents }))
    }
    if (!projectFileOf(archive)) archive.files.push(projectFileMadeFrom(project.contents))
    return archive
  }

  /**
   * Make a project in this group from `archive`, under its own name, or the next one free.
   * - `keep`:  what the place it's made in keeps
   *   - `"everything"` (default):  every file, the editor's server's (epic `mockup` T33)
   *     - the project is made of its project file alone, as written, so its settings and its files' order are
   *       the archive's;  an archive without one gets an empty one
   *     - then every other file:  each page and its source your DRAFT until you Publish, the first one too,
   *       as the server keeps a new document (`isDraftable()`)
   *     - a picture, or any other file the server doesn't draft, written as it is:  a draft holds text alone
   *   - `"text"`:  its text files only, and no project file but its title;
   *     the static build's, which keeps text alone, in the browser, and has no drafts
   *     - its first file makes the project (the first its project file lists, else its first spell file),
   *       the rest follow
   * - Loaded only once every file is written:  loaded with no file to list, the server would make one.
   * - Returns the new project;  throws on error, e.g. an archive with no text file to start it.
   */
  async importApp(archive: ProjectArchive, { keep = "everything" }: ImportOptions = {}): Promise<SP.SpellProject> {
    const die = getDier(this, `importing ${this.type}`, { name: archive.name })
    await this.load(undefined)
    const projectId = freeProjectId(this.path, archive.name, this.projectPaths)
    if (archive.title) this.titlesTyped.set(projectId, archive.title)
    const projectFile = projectFileOf(archive)
    const others = archive.files.filter((file) => file !== projectFile)
    const isText = (file: ProjectArchiveFile): file is ProjectArchiveFile & { contents: string } =>
      typeof file.contents === "string"
    const first =
      firstFileIn(others.filter(isText), projectFile) ?? die(`${archive.name} has no text file to start it.`)
    const start = keep === "everything" ? textProjectFileOf(projectFile) : first
    const project = (await this.createApp(projectId, { filePath: start.path, contents: start.contents }))!
    const files = new ProjectFiles(project)
    for (const file of others) {
      if (file !== start && (isText(file) || keep === "everything")) await files.writeFile(file.path, file.contents)
    }
    await project.load(undefined)
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

  /**
   * Say in `project`'s file that it's written for today's Spell, `SP.SPELL_VERSION` (epic `language` P68):
   * the editor's Upgrade, once it has rewritten the project's old forms (`editor.upgradeProject()`).
   * - Not a setting a person edits:  Project Settings only shows it.
   * - SIDE EFFECT:  `project.contents.spellVersion` takes what the file says now.
   * - throws on a server error
   */
  async saveSpellVersion(project: SP.SpellProject): Promise<void> {
    const die = getDier(this, `saving the Spell version of ${project.projectId}`, {})
    let saved: { spellVersion?: string } = {}
    try {
      saved = await LoadableFile.fetch<{ spellVersion?: string }>({
        url: `/api/projects/spellVersion/project`,
        contents: { projectId: project.projectId },
        requestFormat: SpellProjectRoot.REQUEST_FORMAT_JSON,
        format: "json"
      })
    } catch (e) {
      die(`Server error saving the Spell version of ${project.projectId}`, e)
    }
    project.contents = { ...project.contents, spellVersion: saved.spellVersion } as SP.ProjectManifestJSON5
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
/** Options for `SpellProjectRoot.createFrom()` and `copyHere()`. */
export type StartOptions = {
  /**
   * Made from a start card:  marked `"untouched"`, so it's not one of your apps until it changes (epic `mockup` I42).
   * - Off by default;  never in the static build, which keeps a visitor's projects in their browser.
   */
  untouched?: boolean
}

/** Options for `SpellProjectRoot.copyHere()`. */
export type CopyOptions = StartOptions & {
  /** The copy takes your draft of the project copied, which then goes (epic `mockup` T52).  Off by default. */
  withDraft?: boolean
}

/** Options for `SpellProjectRoot.importApp()`. */
export type ImportOptions = {
  /** What the place it's made in keeps:  `"everything"` (default), or `"text"` alone (the static build). */
  keep?: "everything" | "text"
}

/**
 * The file a project imported from `textFiles` starts as:
 * the first its project file lists, else its first spell file, else its first text file.
 */
function firstFileIn<T extends ProjectArchiveFile>(textFiles: T[], projectFile?: ProjectArchiveFile): T | undefined {
  const settings =
    typeof projectFile?.contents === "string"
      ? (parseJSON5(projectFile.contents, projectFile.path, true) as { imports?: { path?: unknown }[] } | undefined)
      : undefined
  for (const { path } of settings?.imports ?? []) {
    const listed = textFiles.find((file) => file.path === path)
    if (listed) return listed
  }
  return textFiles.find(({ path }) => path.endsWith(SP.SPELL_SUFFIX)) ?? textFiles[0]
}

/**
 * The project file to make an imported project of, as text:  the archive's own, else an empty one
 * (`projectFileMadeFrom()`, with no index:  no settings, no files listed, so every file is appended as it comes).
 */
function textProjectFileOf(projectFile: ProjectArchiveFile | undefined): ProjectArchiveFile & { contents: string } {
  if (typeof projectFile?.contents === "string") return { path: projectFile.path, contents: projectFile.contents }
  return projectFileMadeFrom(undefined) as ProjectArchiveFile & { contents: string }
}

/** The bytes of the file at address `path`, read through its URL:  a picture, or text kept as bytes. */
async function bytesOfFile(path: string): Promise<Uint8Array> {
  const answer = await LoadableFile.fetch<Blob | string>({
    url: SP.SpellUrls.fileUrl(path),
    format: KnownFormat.binary
  })
  if (typeof answer === "string") return new TextEncoder().encode(answer)
  return new Uint8Array(await answer.arrayBuffer())
}

/**
 * A project file made from project index `index`, for a project with none on its list (the static build's):
 * its settings, and its own files in order.
 */
function projectFileMadeFrom(index: SP.ProjectManifestJSON5 | undefined): ProjectArchiveFile {
  const {
    manifest: _manifest,
    buildFolder: _buildFolder,
    imports = [],
    ...settings
  } = index ?? ({} as Partial<SP.ProjectManifestJSON5>)
  const file = { ...settings, imports: imports.map(({ path, active }) => ({ path, active })) }
  return { path: `/${SP.PROJECT_FILE}`, contents: `${JSON.stringify(file, null, 2)}\n` }
}

function titleFor(location: SP.SpellLocation): string {
  return SP.SpellLocation.titleFor(location.projectName!)
}

/** The project file's settings a person edits:  what `saveSettings()` sends, and the server's route keeps. */
export const PROJECT_SETTINGS = ["title", "version", "targets", "listsStartAt"] as const

/** A project's settings, as Project Settings edits them:  each optional, `null` to remove it from the file. */
export type ProjectSettings = {
  [K in (typeof PROJECT_SETTINGS)[number]]?: SP.ProjectManifestJSON5[K] | null
}
