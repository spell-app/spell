/**
 * What a person's drafts, Publish and a project's versions look like over the wire (epic `editor` P24):
 * the server's `ProjectDrafts` answers them, the editor's `ProjectFiles` asks.
 * - Atmosphere's shapes:  they stay when its storage moves to ATSpaces.
 */

/** A draft, as `GET /api/projects/drafts/<project>` lists it. */
export type DraftJSON = {
  /** its file, from the project's folder, e.g. `/Counter.spell` */
  filePath: string
  /** whose */
  person: string
  /** Did the published file change since this draft started?  Publish then asks first (Q25). */
  clashes: boolean
  /** your draft's text */
  mine: string
  /** the published file's text */
  theirs: string
}

/** A version of a project:  a zip of it at a Publish. */
export type VersionJSON = {
  /** its file's name, e.g. `Counter.2026-11-03-091502.zip` */
  name: string
  /** when, as its name says, e.g. `2026-11-03-091502` */
  at: string
}

/** What a Publish did. */
export type PublishJSON = {
  /** the files written */
  published: string[]
  /** the version kept, when anything was published */
  version?: string
}

/** A project's drafts and versions, as `GET /api/projects/drafts/<project>` answers. */
export type ProjectDraftsJSON = {
  /** your drafts */
  drafts: DraftJSON[]
  /** its versions, newest first */
  versions: VersionJSON[]
  /** May you publish it, and so draft it (Q27)? */
  mayPublish: boolean
  /** May you make a new page in it, by your role in its space (`canCreate`;  epic `atmosphere` P25)? */
  mayCreate: boolean
}

/** `/api/projects/drafts/`:  where a project's drafts and versions are listed. */
export const DRAFTS_URL = "/api/projects/drafts/"
