/**
 * What the editor and the server say about a change someone asked for on what's selected (epic `editor` P18):
 * over `/api/changes`, and to a Claude session through `spell app changes`.
 * - Types only, safe in a browser.
 * - The place has the same fields as an epic comment's (`CommentPlace`), and nothing here loads the epic engine:
 *   an app has no epic behind it.
 */

/** Where a change was asked for. */
export type ChangePlace = {
  /** the project, `@spell/examples/Solitaire` */
  projectId: string
  /** its file, inside the project */
  filePath: string
  /** the line, from 0 */
  line: number
  /** the column, from 0 */
  column: number
  /** what's selected, its tag:  `solitaire-card` */
  kind: string
  /** the code there, to find it again if the file has moved on */
  excerpt: string
}

/** `POST /api/changes`'s body. */
export type ChangeAsked = ChangePlace & {
  /** what the person typed */
  text: string
}

/**
 * Where a request has got to:
 * - `waiting`:  no session has taken it yet
 * - `taken`:  a session is on it
 * - `done`:  its files are changed
 * - `failed`:  the session couldn't, and `summary` says why
 */
export type ChangeStatus = "waiting" | "taken" | "done" | "failed"

/** One request, as the inbox file holds it. */
export type ChangeRequest = ChangeAsked & {
  /** its id:  `c3` */
  id: string
  /** the file's absolute path on this machine */
  diskPath: string
  /** where it's got to */
  status: ChangeStatus
  /** when it was asked, ISO */
  at: string
  /** the session's own line about what it did, or why it couldn't */
  summary?: string
}

/** `POST` and `GET /api/changes`' answer. */
export type ChangeAnswer = ChangeRequest & {
  /** is a session on this machine listening? */
  listening: boolean
}
