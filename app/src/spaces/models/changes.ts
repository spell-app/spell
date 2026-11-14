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
  /** pictures pasted or dropped into the box with it (epic `editor` T62) */
  pictures?: ChangePicture[]
}

/** A picture sent with a request:  its type and its bytes, as base64 (no `data:` prefix). */
export type ChangePicture = {
  /** `image/png`, `image/jpeg`, `image/gif` or `image/webp` */
  type: string
  /** its bytes, base64 */
  data: string
}

/**
 * Where a request has got to:
 * - `waiting`:  no session has taken it yet
 * - `taken`:  a session is on it
 * - `done`:  its files are changed
 * - `failed`:  the session couldn't, and `summary` says why
 */
export type ChangeStatus = "waiting" | "taken" | "done" | "failed"

/**
 * One request, as the inbox file holds it.
 * - Its pictures are files beside the inbox, by their absolute paths (`pictureFiles`):  never the bytes, so the file stays small.
 */
export type ChangeRequest = Omit<ChangeAsked, "pictures"> & {
  /** the pictures sent with it, each a file on this machine, for the session to Read */
  pictureFiles?: string[]
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
  /** the Claude session the page server started for it, when none was listening (epic `editor` T66) */
  session?: ChangeSession
}

/**
 * A Claude session the page server started for a request:  headless, in the background (`ClaudeStarter`).
 * - It takes the request with `spell app changes take`, changes the files, and says `done`.
 */
export type ChangeSession = {
  /** its process */
  pid: number
  /** when it started, ISO */
  at: string
  /** where its output goes, on this machine */
  log: string
}

/** `POST` and `GET /api/changes`' answer. */
export type ChangeAnswer = ChangeRequest & {
  /** is a session on this machine listening? */
  listening: boolean
  /** is Claude Code installed on this machine, so the page server can start a session itself (epic `editor` T66)? */
  hasClaude: boolean
}
