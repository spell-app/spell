import {
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  realpathSync,
  rmdirSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync
} from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

/****************
 * ### `SessionFolders`
 * Claude Code's saved-session folders, one per folder a session started in:  `~/.claude/projects/<slug>/`.
 * And the LINK that makes a worktree's folder its main checkout's (epic `epic-eject` Q4, P8).
 *
 * ```ts
 * SessionFolders.slug("/Users/owen/www/spell-app/spell-app.worktrees/seo")
 * // => "-Users-owen-www-spell-app-spell-app-worktrees-seo"
 * SessionFolders.link(worktree, main)     // => { action: "linked", folder, target }
 * ```
 *
 * - Why link:  the Claude panel lists the sessions saved under its window's FIRST folder.
 *   - a worktree-only window's first folder is the worktree,
 *     so without the link its panel would list that worktree's sessions alone
 *   - linked, every session is saved into main's folder, whichever folder it started in:
 *     every window lists them all
 *   - the layout test run (P2) tried it by hand:  sessions save through the link, and the link survives
 * - The worktree hook makes the link when a NEW worktree is made (`linkSessionFolders` in `.epic/config.json5`),
 *   BEFORE any session works there;  `WorktreeRemove` takes it away again.
 * - Never deletes a session:  a folder that holds anything, or a link to somewhere else, is left as it is.
 * - Claude Code's folder:  `$CLAUDE_CONFIG_DIR`, else `~/.claude` (`home()`).
 *   The tests point `HOME` at a temp folder.
 * - Its position:  node's own modules only, so plain `node` loads it (the hooks), types stripped;
 *   NEVER an alias, an `enum` or a parameter property.
 ****************/
export class SessionFolders {
  /** Claude Code's own folder:  `$CLAUDE_CONFIG_DIR`, else `~/.claude`.  Read on every call, for tests. */
  static home(): string {
    return process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude")
  }

  /** Where Claude Code keeps transcripts:  `<home>/projects`, one folder per project. */
  static projects(home = SessionFolders.home()): string {
    return join(home, "projects")
  }

  /** Claude Code's folder name for sessions started in `path`:  every character but letters and digits becomes `-`. */
  static slug(path: string): string {
    return path.replace(/[^a-zA-Z0-9]/g, "-")
  }

  /** The saved-session folder of sessions started in `path`:  `<projects>/<slug>`. */
  static folderOf(path: string, home = SessionFolders.home()): string {
    return join(SessionFolders.projects(home), SessionFolders.slug(path))
  }

  /**
   * Make worktree `worktree`'s saved-session folder a link to main checkout `main`'s;  says what it did.
   * - `linked`:  made (nothing was there, or an EMPTY folder, replaced)
   * - `ok`:  already the link
   * - `kept`:  left alone, with `why`:  a folder with sessions in it, or a link to another folder
   * - main's folder is made first when it's missing, so the link never dangles
   * - SIDE EFFECT:  writes under `<home>/projects`
   */
  static link(worktree: string, main: string, home = SessionFolders.home()): LinkResult {
    const folder = SessionFolders.folderOf(worktree, home)
    const target = SessionFolders.folderOf(main, home)
    if (folder === target) return { action: "ok", folder, target }
    mkdirSync(target, { recursive: true })
    const stat = lstatSync(folder, { throwIfNoEntry: false })
    if (stat?.isSymbolicLink()) {
      if (sameFolder(folder, target)) return { action: "ok", folder, target }
      return { action: "kept", folder, target, why: "a link to another folder" }
    }
    if (stat?.isDirectory()) {
      if (readdirSync(folder).length) return { action: "kept", folder, target, why: "a folder with sessions in it" }
      rmdirSync(folder)
    } else if (stat) return { action: "kept", folder, target, why: "a file, not a folder" }
    symlinkSync(target, folder)
    return { action: "linked", folder, target }
  }

  /**
   * Take worktree `worktree`'s saved-session link away again;  says what it did.
   * - `removed`:  it was a link to main checkout `main`'s folder
   * - `none`:  nothing there
   * - `kept`:  anything else (a real folder, a link elsewhere):  never deleted
   * - SIDE EFFECT:  removes the link (only the link:  main's folder and its sessions stay)
   */
  static unlink(worktree: string, main: string, home = SessionFolders.home()): LinkResult {
    const folder = SessionFolders.folderOf(worktree, home)
    const target = SessionFolders.folderOf(main, home)
    const stat = lstatSync(folder, { throwIfNoEntry: false })
    if (!stat) return { action: "none", folder, target }
    if (!stat.isSymbolicLink() || !sameFolder(folder, target))
      return { action: "kept", folder, target, why: "not a link to the main checkout's folder" }
    unlinkSync(folder)
    return { action: "removed", folder, target }
  }

  /**
   * The project folders of `projects` (their names), each real folder ONCE.
   * - a link to a folder that is also listed (a linked worktree's, Q4) is skipped, so its sessions aren't read twice
   * - a link to a folder NOT in `projects` stays listed
   * - a dangling link is skipped
   */
  static listed(projects = SessionFolders.projects()): string[] {
    if (!existsSync(projects)) return []
    const seen = new Set<string>()
    const links: { name: string; real: string }[] = []
    const names: string[] = []
    for (const entry of readdirSync(projects, { withFileTypes: true })) {
      const path = join(projects, entry.name)
      if (entry.isDirectory()) {
        names.push(entry.name)
        seen.add(realOrSelf(path))
      } else if (entry.isSymbolicLink() && existsSync(path) && lstatSync(realOrSelf(path)).isDirectory())
        links.push({ name: entry.name, real: realOrSelf(path) })
    }
    for (const { name, real } of links) {
      if (seen.has(real)) continue
      seen.add(real)
      names.push(name)
    }
    return names.sort()
  }

  ////////////////
  // ## A running session's title
  ////////////////

  /**
   * The title a running session's tab shows, from its registry record (`sessions/<pid>.json`):
   * its `name`, unless Claude Code made that up;  then the title Owen gave it (`customTitle()`);  `""` for none.
   * - a session RESUMED in a new process (VS Code restarted, its window reloaded) gets a made-up `name`
   *   (`nameSource: "derived"`:  its folder and two hex digits, `outline-spell-cb`), while its tab still shows
   *   `🚧 outline-spell`:  finding a session by its record's `name` alone missed it (epic `epic-engine` I51:
   *   a Do Now opened a new session beside the epic's running one;  I50:  `/send` found no session to tell)
   * - the `name` stays the session's ADDRESS (`SendMessage`'s `to`):  only its title is looked up here
   */
  static recordTitle(record: SessionRecordNames, home = SessionFolders.home()): string {
    const name = record.name ?? ""
    if (name && record.nameSource !== "derived") return name
    return (record.sessionId && SessionFolders.customTitle(record.sessionId, home)) || name
  }

  /**
   * The title Owen gave session `id` (`/rename`, or the prompt gate's `🚧 <epic>`):  its transcript's last
   * `custom-title`;  `null` for none, or no transcript.
   * - never an `ai-title`:  Claude Code's own guess at a title names no epic on purpose
   * - reads the transcript's last `TITLE_TAIL` bytes first:  Claude Code writes the title again before each reply,
   *   so it's nearly always there;  the whole file only when it isn't
   */
  static customTitle(id: string, home = SessionFolders.home()): string | null {
    const path = SessionFolders.transcriptOf(id, home)
    return path ? (fromEnd(path, lastCustomTitle) ?? null) : null
  }

  /**
   * The title session `id`'s tab SHOWS, as far as can be told;  `null` for none, or no transcript.
   * - It decides whether a session still needs titling (`epic session title`, `done`, `icons`;  epic `epic-engine`
   *   r2).  Finding a session BY its name is `customTitle()`'s, the title Owen gave it.
   * - `record`, its registry record while it runs:  its `name`, unless Claude Code made that up (`recordTitle()`)
   * - else its transcript's LAST title line, Owen's or Claude Code's own (`lastTitleLine()`):
   *   a session resumed in a new process (a handoff, a reload) shows whichever came last
   *   - e.g. session ba126030 after its handoff:  `🚧 property-editor`, then `Claude in Chrome browser automation`;
   *     its tab showed the second, while `epic session title` said "already 🚧 property-editor:  nothing to do"
   *   - Claude Code writes both again before each reply, the custom one first:  once a session has had an
   *     `ai-title`, its transcript ends in one however it's titled since, and only its record tells better
   */
  static shownTitle(id: string, home = SessionFolders.home(), record?: SessionRecordNames): string | null {
    if (record?.name && record.nameSource !== "derived") return record.name
    const path = SessionFolders.transcriptOf(id, home)
    return (path && SessionFolders.lastTitleLine(path)?.title) || null
  }

  /**
   * Transcript `path`'s last title line, either kind;  `null` for none.
   * - `custom`:  a `custom-title` (`/rename`, a skill's, the prompt gate's), not Claude Code's own `ai-title`
   * - its end first, as `customTitle()`
   */
  static lastTitleLine(path: string): TitleLine | null {
    return fromEnd(path, lastTitle) ?? null
  }

  /**
   * Queue session `id`'s own title (`customTitle()`) for its next prompt, unless another title is queued:
   * `<home>/session-titles/<id>`, which the `UserPromptSubmit` hook `~/.claude/hooks/session-title.mjs` applies.
   * - the handoff ([handoff.mjs](../../hooks/handoff.mjs)), as it moves a session:  resumed in the new window, its
   *   tab may show Claude Code's own title (`shownTitle()`), and the `continue` typed there puts its own back
   * - returns the title queued;  `null`:  none to queue, or one queued already
   */
  static requeueTitle(id: string, home = SessionFolders.home()): string | null {
    if (!/^[\w-]+$/.test(id)) return null
    const file = join(home, "session-titles", id)
    if (existsSync(file)) return null
    const title = SessionFolders.customTitle(id, home)
    if (!title) return null
    mkdirSync(join(home, "session-titles"), { recursive: true })
    writeFileSync(file, title)
    return title
  }

  /**
   * The transcript of session `id`:  `<projects>/<any folder>/<id>.jsonl`, the newest when two folders hold one
   * (a session that moved);  `undefined` for none.
   */
  static transcriptOf(id: string, home = SessionFolders.home()): string | undefined {
    const projects = SessionFolders.projects(home)
    if (!existsSync(projects)) return undefined
    let newest: { path: string; mtime: number } | undefined
    for (const dir of readdirSync(projects)) {
      const path = join(projects, dir, `${id}.jsonl`)
      const stat = statSync(path, { throwIfNoEntry: false })
      if (stat && (!newest || stat.mtimeMs > newest.mtime)) newest = { path, mtime: stat.mtimeMs }
    }
    return newest?.path
  }
}

/** How much of a transcript's end `SessionFolders.customTitle()` and `lastTitleLine()` read first, in bytes. */
const TITLE_TAIL = 4 * 1024 * 1024

/** The fields of a session's registry record (`sessions/<pid>.json`) its title comes from. */
export type SessionRecordNames = { sessionId?: string; name?: string; nameSource?: string }

/** A transcript's title line (`SessionFolders.lastTitleLine()`):  its title, and whether it's a `custom-title`. */
export type TitleLine = { title: string; custom: boolean }

/** `find` on the end of transcript `path` (`TITLE_TAIL`) first;  found nothing there, on the whole file. */
function fromEnd<T>(path: string, find: (text: string) => T | undefined): T | undefined {
  const size = statSync(path).size
  const tail = find(readEnd(path, Math.min(size, TITLE_TAIL)))
  if (tail !== undefined || size <= TITLE_TAIL) return tail
  return find(readFileSync(path, "utf8"))
}

/** The last title line in transcript text `text`, either kind;  `undefined` for none. */
function lastTitle(text: string): TitleLine | undefined {
  let found: TitleLine | undefined
  for (const line of text.split("\n")) {
    if (!line.includes('"custom-title"') && !line.includes('"ai-title"')) continue
    try {
      const entry = JSON.parse(line) as { type?: string; customTitle?: unknown; aiTitle?: unknown }
      const title = entry.type === "custom-title" ? entry.customTitle : entry.aiTitle
      if (entry.type === "custom-title" || entry.type === "ai-title") {
        found = { title: typeof title === "string" ? title : "", custom: entry.type === "custom-title" }
      }
    } catch {
      // the tail's first line, cut in half:  not a title
    }
  }
  return found
}

/** The last `custom-title` in transcript text `text`:  `""` when it was cleared;  `undefined` for none. */
function lastCustomTitle(text: string): string | undefined {
  let title: string | undefined
  for (const line of text.split("\n")) {
    if (!line.includes('"custom-title"')) continue
    try {
      const entry = JSON.parse(line) as { type?: string; customTitle?: unknown }
      if (entry.type === "custom-title") title = typeof entry.customTitle === "string" ? entry.customTitle : ""
    } catch {
      // the tail's first line, cut in half:  not a title
    }
  }
  return title
}

/** The last `bytes` of file `path`, as text. */
function readEnd(path: string, bytes: number): string {
  const buffer = Buffer.alloc(bytes)
  const fd = openSync(path, "r")
  try {
    readSync(fd, buffer, 0, bytes, statSync(path).size - bytes)
  } finally {
    closeSync(fd)
  }
  return buffer.toString("utf8")
}

/**
 * What `SessionFolders.link()` / `unlink()` did:
 * `action`, the worktree's `folder`, main's `target`, and `why` it was kept.
 */
export type LinkResult = {
  action: "linked" | "ok" | "kept" | "removed" | "none"
  folder: string
  target: string
  why?: string
}

/** Whether `a` and `b` are the same folder once links are resolved;  `false` when either is missing. */
function sameFolder(a: string, b: string): boolean {
  try {
    return realpathSync(a) === realpathSync(b)
  } catch {
    return false
  }
}

/** `path` with every link resolved, or `path` itself when it doesn't exist. */
function realOrSelf(path: string): string {
  try {
    return realpathSync(path)
  } catch {
    return path
  }
}
