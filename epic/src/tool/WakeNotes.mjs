/****************
 * ### `WakeNotes`
 * The notes the epic hub leaves for a Claude session when the person sends from its epic page (epic `epic-engine` T163):
 * one file per session, `<session id>.json`, `{ epic, batch, notice, at }`, in `~/.spell-epic/wakes/`.
 * - The hub's ONE listener (`InboxHub`) looks at every epic's inbox for every running session, and leaves a note
 *   when work is waiting for that session:  the `📬` line to show it, and the batch it's for.
 * - Two readers TAKE it, whichever comes first, so the session hears it exactly once:
 *   - the session's inbox poller (`InboxPoller`), while the session is idle:  its `asyncRewake` hook prints the line
 *     and exits 2, which wakes the session
 *   - the `PostToolUse` hook (`hooks/inbox-note.mjs`), while the session is at work:  the line goes into the
 *     session's context at its next tool call, within seconds
 * - Taking is a RENAME, `<id>.json` to `<id>.taken`:  only one reader's rename succeeds, and the taken file keeps the
 *   batch, so the hub never leaves the same batch twice.
 * - The hub's own record, `hub.pid`, names its process:  a poller sees whether a hub listens (`hubIsLive()`), and
 *   looks at the inbox itself (the old way) when none does.
 * - Its position:  node's own modules only, plain JavaScript, so the poller and the hooks load it in bare node.
 * - NEVER throws.
 ****************/
import { mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

export class WakeNotes {
  /** - `folder`:  default `wakeNotesFolder()` */
  constructor({ folder = wakeNotesFolder() } = {}) {
    this.folder = folder
  }

  /** Session `sessionId`'s note, waiting to be taken. */
  fileOf(sessionId) {
    return join(this.folder, `${safeId(sessionId)}${WAITING}`)
  }

  /** Session `sessionId`'s note once taken. */
  takenFileOf(sessionId) {
    return join(this.folder, `${safeId(sessionId)}${TAKEN}`)
  }

  /**
   * Leave `note` (`{ epic, batch, notice }`) for session `sessionId`;  true when it wrote one.
   * - the same batch waiting or taken already:  nothing written
   */
  leave(sessionId, note) {
    const waiting = readJSON(this.fileOf(sessionId))
    const taken = readJSON(this.takenFileOf(sessionId))
    if (waiting?.batch === note.batch || taken?.batch === note.batch) return false
    try {
      mkdirSync(this.folder, { recursive: true, mode: 0o700 })
      const file = this.fileOf(sessionId)
      // written whole, then renamed in:  a reader never sees half a note
      const draft = `${file}.${process.pid}.tmp`
      writeFileSync(draft, `${JSON.stringify({ ...note, at: new Date().toISOString() })}\n`)
      renameSync(draft, file)
      return true
    } catch {
      return false
    }
  }

  /** Take session `sessionId`'s note:  it, once;  `undefined` when none waits (or another reader took it first). */
  take(sessionId) {
    const file = this.fileOf(sessionId)
    const taken = this.takenFileOf(sessionId)
    try {
      renameSync(file, taken)
    } catch {
      return undefined
    }
    return readJSON(taken)
  }

  /** Nothing waits for session `sessionId` any more:  its notes go, so the next batch is a new one. */
  clear(sessionId) {
    for (const file of [this.fileOf(sessionId), this.takenFileOf(sessionId)]) rmSync(file, { force: true })
  }

  /** Is any note waiting, for any session?  The `PostToolUse` hook's quick look before anything else. */
  get anyWaiting() {
    try {
      return readdirSync(this.folder).some((file) => file.endsWith(WAITING))
    } catch {
      return false
    }
  }

  /** The sessions with a note, waiting or taken:  the hub drops the ones whose session ended. */
  sessions() {
    try {
      const ids = readdirSync(this.folder)
        .filter((file) => file.endsWith(WAITING) || file.endsWith(TAKEN))
        .map((file) => file.replace(/\.(json|taken)$/, ""))
      return [...new Set(ids)]
    } catch {
      return []
    }
  }

  ////////////////
  // ## The hub's record
  ////////////////

  /** The hub's record:  `hub.pid`, its process id. */
  get hubFile() {
    return join(this.folder, HUB_FILE)
  }

  /** SIDE EFFECT:  this process is the hub that leaves the notes. */
  writeHub(pid = process.pid) {
    try {
      mkdirSync(this.folder, { recursive: true, mode: 0o700 })
      writeFileSync(this.hubFile, `${pid}\n`)
    } catch {
      // best effort:  the pollers look at the inbox themselves
    }
  }

  /** SIDE EFFECT:  the hub's record goes, when it's `pid`'s. */
  removeHub(pid = process.pid) {
    if (this.hubPid === pid) rmSync(this.hubFile, { force: true })
  }

  /** The hub's process id, as written;  `undefined` for none. */
  get hubPid() {
    try {
      const pid = Number(readFileSync(this.hubFile, "utf8").trim())
      return Number.isInteger(pid) && pid > 0 ? pid : undefined
    } catch {
      return undefined
    }
  }

  /** Does a hub leave the notes now?  Its record names a process that runs. */
  hubIsLive() {
    const pid = this.hubPid
    return pid !== undefined && isAlive(pid)
  }
}

/**
 * The folder of the wake notes:  `$SPELL_EPIC_WAKES_DIR`, else `wakes/` in the epic home (`$SPELL_EPIC_HOME`, else
 * `~/.spell-epic`, as `EpicHome` says).
 */
export function wakeNotesFolder(env = process.env) {
  return env.SPELL_EPIC_WAKES_DIR || join(env.SPELL_EPIC_HOME || join(homedir(), ".spell-epic"), "wakes")
}

/** A waiting note's ending. */
const WAITING = ".json"

/** A taken note's ending. */
const TAKEN = ".taken"

/** The hub's record's name:  not `.json`, so it's never taken for a note. */
const HUB_FILE = "hub.pid"

/** A session id as a file name:  Claude Code's are UUIDs;  anything else, its safe letters only. */
function safeId(sessionId) {
  return String(sessionId).replace(/[^A-Za-z0-9_-]/g, "_")
}

/** A JSON file's contents;  `undefined` when it isn't there or won't parse. */
function readJSON(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"))
  } catch {
    return undefined
  }
}

/** Whether a process `pid` exists:  signal 0 checks without signalling;  EPERM means it exists, someone else's. */
function isAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error.code === "EPERM"
  }
}
