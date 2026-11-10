import { LoadableFile, getDier, KnownFormat } from "spell/util"
import { after } from "spell/util/timing"
import { SP } from "spell/parser/spell"

import { DRAFTS_URL, type ProjectDraftsJSON, type PublishJSON } from "./drafts"

/**
 * A project's FILE edits:  create, copy, rename and delete one of its files, as the editor asks.
 * - The editor calls these, never spell:  `SpellProject` only reads, compiles and saves (decision Q20).
 * - Each asks spaces' server (`/api/projects/create/file` ...), which answers the project's new index,
 *   and sets it as the project's `contents`, so its `files` follow at once.
 * - Asked through `LoadableFile.fetch`, as every file is read:  whoever answers files answers these,
 *   e.g. the editor's static build, which keeps them in the browser (`StaticFiles`).
 * - Each throws (through `getDier()`) with what it was doing, e.g. "renaming file", for the editor to show.
 * - The editor asks for names and "are you sure":  models never show a dialog.
 * - It was `SpellProject`'s, until epic `people-and-orgs` P15.
 */
export class ProjectFiles {
  /**
   * Format of what the editor sends:  JSON, as `application/json`, so the server parses it.
   * - It was a bare `"json"`, which the server took for no body at all:
   *   every create, copy, rename and delete of a project or a file failed with "Path must be a string"
   *   (found in epic `people-and-orgs` P15).
   */
  static REQUEST_FORMAT_JSON = KnownFormat.json

  /** the project whose files these are */
  readonly project: SP.SpellProject

  constructor(project: SP.SpellProject) {
    this.project = project
  }

  /**
   * Create a new file within the project, and return it.
   * - `filePath` is relative to the project, and may or may not start with `/`.
   * - It may be in a folder, `Button/Usage.spell`:  the server makes the folder.
   * - throws if the file is already there, or the server says no
   */
  async create(
    filePath: string,
    contents: string | undefined,
    die?: ReturnType<typeof getDier>
  ): Promise<SP.AnySpellFile> {
    const { project } = this
    if (!die) die = getDier(project, "creating file", { projectId: project.projectId, filePath })

    await project.loadOrDie(die)
    if (project.getFile(filePath)) die("File already exists.")

    // Tell the server to create the file, which returns updated index
    try {
      project.contents = await LoadableFile.fetch<SP.ProjectManifestJSON5>({
        url: `/api/projects/create/file`,
        contents: {
          projectId: project.projectId,
          filePath,
          contents: contents ?? `## This space intentionally left blank`
        },
        requestFormat: ProjectFiles.REQUEST_FORMAT_JSON,
        format: "json"
      })
    } catch (e) {
      die("Server error creating file", e)
    }

    // Return the file
    return project.getFile(filePath) || die("Server didn't create file.")
  }

  /**
   * Copy an existing file, and return the copy.
   * - throws if the file isn't there, or the server says no
   */
  async duplicate(filePath: string, newFilePath: string): Promise<SP.AnySpellFile> {
    const { project } = this
    const die = getDier(project, "duplicating file", {
      projectId: project.projectId,
      originalFilePath: filePath,
      filePath: newFilePath
    })
    await project.loadOrDie(die)

    const file = project.getFile(filePath) || die("File not found.")
    let contents: string | undefined
    try {
      contents = await file.load(undefined)
    } catch (e) {
      die("Server error loading file", e)
    }
    return this.create(newFilePath, contents, die)
  }

  /**
   * Rename an existing file, keeping its place in the project's file order, and return the renamed file.
   * - It may go to another folder:  the new path says so, `Button/Usage.spell`.
   * - throws if the file isn't there, the new one is, or the server says no
   */
  async rename(filePath: string, newFilePath: string): Promise<SP.AnySpellFile> {
    const { project } = this
    const die = getDier(project, "renaming file", { projectId: project.projectId, filePath, newFilePath })
    await project.loadOrDie(die)
    const file = project.getFile(filePath) || die("File not found.")

    if (project.getFile(newFilePath)) die("New file already exists.")

    // Tell the server to rename the file, which returns the updated index.
    try {
      project.contents = await LoadableFile.fetch<SP.ProjectManifestJSON5>({
        url: `/api/projects/rename/file`,
        contents: { projectId: project.projectId, filePath, newFilePath },
        requestFormat: ProjectFiles.REQUEST_FORMAT_JSON,
        format: "json"
      })
    } catch (e) {
      die("Server error renaming file", e)
    }
    // Have the file clean itself up in a tick (doing it at once trips whatever is drawing it)
    void after(0.01, () => file.onRemove()).catch(console.error)
    // return the new file
    return project.getFile(newFilePath) || die("Server didn't rename file.")
  }

  /**
   * Delete a file from the project.
   * - Returns `true` once it's gone.
   * - throws for the project's last file, a file that isn't there, or when the server says no
   */
  async delete(filePath: string): Promise<boolean> {
    const { project } = this
    const die = getDier(project, "deleting file", { projectId: project.projectId, filePath })
    await project.loadOrDie(die)
    if (project.files.length === 1) die(`You can't delete the last file in this ${project.type}.`)

    const file = project.getFile(filePath) || die("File not found.")

    // Tell the server to delete the file, which returns the updated index.
    try {
      project.contents = await LoadableFile.fetch<SP.ProjectManifestJSON5>({
        url: `/api/projects/remove/file`,
        method: "DELETE",
        contents: { projectId: project.projectId, filePath },
        requestFormat: ProjectFiles.REQUEST_FORMAT_JSON,
        format: "json"
      })
    } catch (e) {
      die("Server error deleting file", e)
    }
    // throw if file is still found
    if (project.getFile(filePath)) die("Server didn't delete the file.")

    // Have the file clean itself up in a tick (doing it at once trips whatever is drawing it)
    void after(0.01, () => file.onRemove()).catch(console.error)

    return true
  }

  ////////////////
  // ## Drafts, Publish and versions (epic `editor` P24)
  ////////////////

  /**
   * Your drafts of the project, and its versions:  `SPACES.ProjectDraftsJSON`.
   * - A save of one of its files is your draft (the server's `ProjectDrafts`):  this says which you have.
   * - throws if the server says no
   */
  async drafts(): Promise<ProjectDraftsJSON> {
    return await this.ask<ProjectDraftsJSON>("listing drafts", {
      url: DRAFTS_URL + SP.SpellUrls.encodeAddress(this.project.projectId)
    })
  }

  /**
   * Publish your drafts:  each written to its public file, the project kept as a new version, the drafts gone.
   * - throws `ResponseError` (409) when a published file changed since your draft began, unless `anyway` (Q25)
   */
  async publish({ anyway = false }: { anyway?: boolean } = {}): Promise<PublishJSON> {
    return await this.ask<PublishJSON>("publishing", {
      url: `/api/projects/publish`,
      contents: { projectId: this.project.projectId, anyway }
    })
  }

  /** Delete your draft of `filePath`, back to what's published.  throws if the server says no */
  async discard(filePath: string): Promise<void> {
    await this.ask("discarding a draft", {
      url: `/api/projects/discard`,
      contents: { projectId: this.project.projectId, filePath }
    })
  }

  /** Make your drafts of what version `version` (its name) holds;  returns the files drafted.  throws if it's gone */
  async restore(version: string): Promise<string[]> {
    return await this.ask<string[]>("restoring a version", {
      url: `/api/projects/restore`,
      contents: { projectId: this.project.projectId, version }
    })
  }

  /** Ask the server, as JSON;  throws (through `getDier()`) saying what it was `doing`. */
  private async ask<T>(doing: string, request: { url: string; contents?: object }): Promise<T> {
    const die = getDier(this.project, doing, { projectId: this.project.projectId })
    try {
      return await LoadableFile.fetch<T>({
        ...request,
        ...(request.contents ? { requestFormat: ProjectFiles.REQUEST_FORMAT_JSON } : {}),
        format: "json"
      })
    } catch (error) {
      return die(`Server error ${doing}`, error)
    }
  }
}
