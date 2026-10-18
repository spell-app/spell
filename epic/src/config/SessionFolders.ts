import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  realpathSync,
  rmdirSync,
  symlinkSync,
  unlinkSync
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
