import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  realpathSync,
  rmdirSync,
  unlinkSync,
  writeFileSync
} from "node:fs"
import { join } from "node:path"

import { Links } from "spell/server/Links"

import { ClaudeHome } from "./ClaudeHome.ts"
import { Transcript } from "./Transcript.ts"

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
 * - And a session's titles, from its registry record and its transcript (`recordTitle()`, `shownTitle()` ...).
 * - Claude Code's folder:  `ClaudeHome.home()` (`$CLAUDE_CONFIG_DIR`, else `~/.claude`), its transcripts
 *   `ClaudeHome`'s and `Transcript`'s.  The tests point `CLAUDE_CONFIG_DIR` at a temp folder.
 * - Its position:  node's own modules and `ClaudeHome` only, so plain `node` loads it (the hooks), types stripped;
 *   NEVER an alias, an `enum` or a parameter property.
 ****************/
export class SessionFolders {
  /** Claude Code's folder name for sessions started in `path`:  every character but letters and digits becomes `-`. */
  static slug(path: string): string {
    return path.replace(/[^a-zA-Z0-9]/g, "-")
  }

  /** The saved-session folder of sessions started in `path`:  `<projects>/<slug>`. */
  static folderOf(path: string, home = ClaudeHome.home()): string {
    return join(ClaudeHome.projects(home), SessionFolders.slug(path))
  }

  /**
   * Make worktree `worktree`'s saved-session folder a link to main checkout `main`'s;  says what it did.
   * - `linked`:  made (nothing was there, or an EMPTY folder, replaced)
   * - `ok`:  already the link
   * - `kept`:  left alone, with `why`:  a folder with sessions in it, or a link to another folder
   * - main's folder is made first when it's missing, so the link never dangles
   * - SIDE EFFECT:  writes under `<home>/projects`
   */
  static link(worktree: string, main: string, home = ClaudeHome.home()): LinkResult {
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
    Links.folder(folder, target)
    return { action: "linked", folder, target }
  }

  /**
   * Take worktree `worktree`'s saved-session link away again;  says what it did.
   * - `removed`:  it was a link to main checkout `main`'s folder
   * - `none`:  nothing there
   * - `kept`:  anything else (a real folder, a link elsewhere):  never deleted
   * - SIDE EFFECT:  removes the link (only the link:  main's folder and its sessions stay)
   */
  static unlink(worktree: string, main: string, home = ClaudeHome.home()): LinkResult {
    const folder = SessionFolders.folderOf(worktree, home)
    const target = SessionFolders.folderOf(main, home)
    const stat = lstatSync(folder, { throwIfNoEntry: false })
    if (!stat) return { action: "none", folder, target }
    if (!stat.isSymbolicLink() || !sameFolder(folder, target))
      return { action: "kept", folder, target, why: "not a link to the main checkout's folder" }
    unlinkSync(folder)
    return { action: "removed", folder, target }
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
  static recordTitle(record: SessionRecordNames, home = ClaudeHome.home()): string {
    const name = record.name ?? ""
    if (name && record.nameSource !== "derived") return name
    return (record.sessionId && SessionFolders.customTitle(record.sessionId, home)) || name
  }

  /**
   * The title Owen gave session `id` (`/rename`, or the prompt gate's `🚧 <epic>`):  its transcript's last
   * `custom-title` (`Transcript.titles()`);  `null` for none, or no transcript.
   * - never an `ai-title`:  Claude Code's own guess at a title names no epic on purpose
   */
  static customTitle(id: string, home = ClaudeHome.home()): string | null {
    const path = ClaudeHome.transcriptOf(id, home)
    return path ? (new Transcript(path).titles().custom ?? null) : null
  }

  /**
   * The title session `id`'s tab SHOWS, as far as can be told;  `null` for none, or no transcript.
   * - It decides whether a session still needs titling (`epic session title`, `done`, `icons`;  epic `epic-engine`
   *   r2).  Finding a session BY its name is `customTitle()`'s, the title Owen gave it.
   * - `record`, its registry record while it runs:  its `name`, unless Claude Code made that up (`recordTitle()`)
   * - else its transcript's LAST title line, Owen's or Claude Code's own (`Transcript.titles()`' `last`):
   *   a session resumed in a new process (a handoff, a reload) shows whichever came last
   *   - e.g. session ba126030 after its handoff:  `🚧 property-editor`, then `Claude in Chrome browser automation`;
   *     its tab showed the second, while `epic session title` said "already 🚧 property-editor:  nothing to do"
   *   - Claude Code writes both again before each reply, the custom one first:  once a session has had an
   *     `ai-title`, its transcript ends in one however it's titled since, and only its record tells better
   */
  static shownTitle(id: string, home = ClaudeHome.home(), record?: SessionRecordNames): string | null {
    if (record?.name && record.nameSource !== "derived") return record.name
    const path = ClaudeHome.transcriptOf(id, home)
    return (path && new Transcript(path).titles().last?.title) || null
  }

  /**
   * Queue session `id`'s own title (`customTitle()`) for its next prompt, unless another title is queued:
   * `<home>/session-titles/<id>` (`ClaudeHome.titlesFolder()`), which the `UserPromptSubmit` hook
   * `~/.claude/hooks/session-title.mjs` applies.
   * - the handoff ([handoff.mjs](../../hooks/handoff.mjs)), as it moves a session:  resumed in the new window, its
   *   tab may show Claude Code's own title (`shownTitle()`), and the `continue` typed there puts its own back
   * - returns the title queued;  `null`:  none to queue, or one queued already
   */
  static requeueTitle(id: string, home = ClaudeHome.home()): string | null {
    if (!/^[\w-]+$/.test(id)) return null
    const titles = ClaudeHome.titlesFolder(home)
    const file = join(titles, id)
    if (existsSync(file)) return null
    const title = SessionFolders.customTitle(id, home)
    if (!title) return null
    mkdirSync(titles, { recursive: true })
    writeFileSync(file, title)
    return title
  }
}

/** The fields of a session's registry record (`sessions/<pid>.json`) its title comes from. */
export type SessionRecordNames = { sessionId?: string; name?: string; nameSource?: string }

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
