import { parseJSON5 } from "spell/util"
import { SP } from "spell/parser/spell"

import { filesInZip, zipOf } from "./zip"

/**
 * A project as a zip, to keep or to move:  the project menu's Export writes one, its Import reads it back.
 * - The zip holds the project as its folder on disk would, in a folder of its name:
 *   - `Solitaire/Solitaire.spell`, `Solitaire/Button/Usage.spell`
 *   - `Solitaire/__thumbnail.png`, `Solitaire/__project.json5`
 *   - So any unzip opens it, and the folder it unpacks is a Spell project anywhere.
 * - Import reads the old one-file JSON export too (`.spell.json`, text files only):  some people have them.
 * - `SpellProjectRoot.exportApp()` gathers a project's files, `importApp()` makes one from them.
 * - Browser-safe:  zipped in the page (`zipOf()`), so it works in the static build, which has no server.
 */

/** A project's files, gathered for export, or read from a file a person chose to import. */
export type ProjectArchive = {
  /** Its folder's name, `Solitaire`, `my-app`. */
  name: string
  /** Its name for people, when its folder's name can't say it (its project file's `title`). */
  title?: string
  /** Its files, each path from the project (`/Button/Usage.spell`), the project file `/__project.json5` among them. */
  files: ProjectArchiveFile[]
}

/** One file of a `ProjectArchive`. */
export type ProjectArchiveFile = {
  /** Its path from the project, `/Button/Usage.spell`. */
  path: string
  /** Its text, or its bytes when it isn't text (a picture). */
  contents: string | Uint8Array
}

/** End of an exported project's file name:  `Solitaire.zip`. */
export const PROJECT_ARCHIVE_EXTENSION = ".zip"

/** End of a project exported before it was a zip:  `solitaire.spell.json`, still imported. */
export const OLD_PROJECT_ARCHIVE_EXTENSION = ".spell.json"

/** What an old `.spell.json` export says it is:  anything else isn't one. */
export const OLD_PROJECT_ARCHIVE_FORMAT = "spell-project-1"

/**
 * `GET /api/projects/files/<project>`:  EVERY file of a project, as paths from it (`/__thumbnail.png`).
 * - More than its index lists:  pictures and other files the editor doesn't open, and its project file.
 * - Not what spell builds for it, nor its drafts and versions.
 * - The static build answers `[]`:  it keeps no file beyond each index's.
 */
export const PROJECT_FILES_URL = "/api/projects/files/"

/** The URL that lists every file of project `projectId`:  see `PROJECT_FILES_URL`. */
export function projectFilesUrl(projectId: string): string {
  return PROJECT_FILES_URL + SP.SpellUrls.encodeAddress(projectId)
}

/** `archive` as a zip's bytes, its files in a folder of its name. */
export async function projectArchiveZip(archive: ProjectArchive): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  return zipOf(
    archive.files.map(({ path, contents }) => ({
      path: `${archive.name}/${path.replace(/^\/+/, "")}`,
      bytes: typeof contents === "string" ? encoder.encode(contents) : contents
    }))
  )
}

/**
 * The project in file `fileName` a person chose, its bytes `bytes`:  a zip Export wrote, or an old `.spell.json`.
 * - A zip that isn't Export's works too, e.g. a project's folder zipped by hand:
 *   - its files in one folder:  that folder is the project, and names it
 *   - loose:  the zip's name names it
 *   - what a Mac's zip adds (`__MACOSX/`, `.DS_Store`) and other hidden files are left out
 * - Each file is text if it reads as UTF-8 text, else its bytes.
 * - throws `TypeError` if it's neither kind, or holds no file
 */
export async function projectArchiveFrom(fileName: string, bytes: Uint8Array): Promise<ProjectArchive> {
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b // "PK"
  const archive = isZip ? await archiveInZip(fileName, bytes) : oldArchiveIn(fileName, bytes)
  if (!archive.files.length) throw new TypeError(`projectArchiveFrom():  ${fileName} holds no file`)
  return archive
}

/** The project file among `archive`'s files, if it has one:  `__project.json5`, or an old `project.json`. */
export function projectFileOf(archive: ProjectArchive): ProjectArchiveFile | undefined {
  return archive.files.find(({ path }) => SP.isProjectFile(path.replace(/^\/+/, "")))
}

////////////////
// ## Helpers
////////////////

/** The project in zip `bytes`.  See `projectArchiveFrom()`. */
async function archiveInZip(fileName: string, bytes: Uint8Array): Promise<ProjectArchive> {
  const files = (await filesInZip(bytes)).filter(({ path }) => !isLeftOut(path))
  const folders = new Set(files.map(({ path }) => (path.includes("/") ? path.split("/")[0] : "")))
  const [folder] = folders
  const inOneFolder = folders.size === 1 && !!folder
  const name = inOneFolder ? folder : fileName.replace(/\.zip$/i, "")
  const archive: ProjectArchive = {
    name,
    files: files.map(({ path, bytes: fileBytes }) => ({
      path: `/${inOneFolder ? path.slice(folder.length + 1) : path}`,
      contents: textOf(fileBytes) ?? fileBytes
    }))
  }
  const title = titleIn(projectFileOf(archive))
  return { ...archive, ...(title && { title }) }
}

/**
 * The project in an old `.spell.json` export:  `{ format: "spell-project-1", name, title?, files }`, text files only.
 * - throws `TypeError` if it isn't one
 */
function oldArchiveIn(fileName: string, bytes: Uint8Array): ProjectArchive {
  let value: unknown
  try {
    value = JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    // not JSON:  the check below says so
  }
  const archive = value as (ProjectArchive & { format?: string }) | null
  const isOld =
    archive?.format === OLD_PROJECT_ARCHIVE_FORMAT &&
    typeof archive.name === "string" &&
    Array.isArray(archive.files) &&
    archive.files.every(({ path, contents }) => typeof path === "string" && typeof contents === "string")
  if (!isOld) throw new TypeError(`projectArchiveFrom():  ${fileName} isn't a project Spell exported`)
  const { name, title, files } = archive
  return { name, ...(title && { title }), files }
}

/** Is a zip's file at `path` one an import leaves out:  a Mac's `__MACOSX/` and `.DS_Store`, any hidden file? */
function isLeftOut(path: string): boolean {
  return path.split("/").some((part) => part === "__MACOSX" || part.startsWith("."))
}

/** `bytes` as text, if they're UTF-8 text:  `undefined` for a picture, or any file with a NUL in it. */
function textOf(bytes: Uint8Array): string | undefined {
  if (bytes.includes(0)) return undefined
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch {
    return undefined
  }
}

/** The `title` project file `file` says, if any.  NEVER throws:  a file that won't read has none. */
function titleIn(file: ProjectArchiveFile | undefined): string | undefined {
  if (typeof file?.contents !== "string") return undefined
  const settings = parseJSON5(file.contents, file.path, true) as { title?: unknown } | undefined
  return typeof settings?.title === "string" ? settings.title : undefined
}
