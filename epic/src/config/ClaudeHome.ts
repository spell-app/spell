import { existsSync, lstatSync, readFileSync, readdirSync, statSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

import { RealPath } from "spell/server/RealPath"

/****************
 * ### `ClaudeHome`
 * Claude Code's own folder, and what the epic tools read in it:  its running sessions and its saved transcripts.
 * The ONE place that knows where it is (epic `coherence` P20).
 *
 * ```ts
 * ClaudeHome.home()                                       // => "/Users/owen/.claude"
 * ClaudeHome.liveSessions({ isAlive: SRV.isProcessAlive }) // => [{ pid, sessionId, name, cwd ... }]
 * ClaudeHome.transcriptOf("055da582-...")                  // => ".../projects/-Users-owen-www-spell/055da582-....jsonl"
 * ```
 *
 * - Where:  `$CLAUDE_CONFIG_DIR`, else `~/.claude` (`home()`)
 *   - `CLAUDE_CONFIG_DIR` is Claude Code's OWN variable:  set, Claude Code keeps its sessions there, and every hook and
 *     tool it starts inherits it;  so it's the one rule for every reader.  A test sets it to a folder of its own.
 *   - before epic `coherence` P20, three variables named it, and the readers could disagree:  `SessionFolders` read
 *     `CLAUDE_CONFIG_DIR`;  `Sessions`, `RunningEpics` and the window script `SPELL_CLAUDE_HOME` (tests' only);
 *     the prompt gate `SPELL_SESSION_TITLES_DIR` (its titles' folder, tests' only);  `ReviewBackfill` always `~/.claude`
 * - What's in it, as read here:
 *   - `sessions/<pid>.json`:  its registry, a record per running `claude` process (`liveSessions()`)
 *   - `projects/<slug>/<id>.jsonl`:  each saved session's transcript, a folder per folder a session started in
 *     (`transcripts()`, `transcriptOf()`);  a worktree's folder may be a link to its main checkout's
 *     (`SessionFolders.link()`)
 *   - `session-titles/<id>`:  a title waiting for that session's next prompt (`titlesFolder()`)
 * - Reading ONE transcript:  `Transcript`, beside this.
 * - STATIC:  Claude Code's folder is the machine's;  each takes `home` (default `home()`), so a test reads a fixture.
 * - Its position:  node's own modules, and the kit's `RealPath` by its own name, so plain `node` loads it (the hooks,
 *   the window script), types stripped;  NEVER an alias, an `enum` or a parameter property.
 ****************/
export class ClaudeHome {
  /** Claude Code's own folder:  `$CLAUDE_CONFIG_DIR`, else `~/.claude`.  Read on every call:  a test sets it. */
  static home(): string {
    return process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude")
  }

  /** Where it keeps transcripts:  `<home>/projects`, a folder per folder a session started in. */
  static projects(home = ClaudeHome.home()): string {
    return join(home, "projects")
  }

  /** Where a title waits for its session's next prompt:  `<home>/session-titles/<id>`. */
  static titlesFolder(home = ClaudeHome.home()): string {
    return join(home, "session-titles")
  }

  /**
   * The running sessions:  each record of Claude Code's registry, `<home>/sessions/<pid>.json`, whose process
   * still runs, in its files' order.
   * - a record whose process is gone (a session that ended without cleaning up), one half-written, or one with no
   *   `pid` or `sessionId`:  skipped
   * - `isAlive`:  the process check, handed in:  the kit's (`isProcessAlive()`) is in its server, which plain `node`
   *   can't load;  the window script hands its own
   * - NEVER throws
   */
  static liveSessions({ home = ClaudeHome.home(), isAlive }: LiveSessionsProps): RunningSession[] {
    const folder = join(home, "sessions")
    if (!existsSync(folder)) return []
    const found: RunningSession[] = []
    for (const file of readdirSync(folder).sort()) {
      if (!file.endsWith(".json")) continue
      try {
        const record = JSON.parse(readFileSync(join(folder, file), "utf8")) as Partial<RunningSession>
        if (Number.isInteger(record.pid) && record.sessionId && isAlive(record.pid!))
          found.push(record as RunningSession)
      } catch {
        // half-written, or not a session's:  skip it
      }
    }
    return found
  }

  /**
   * The project folders of `projects` (their names), each real folder ONCE, sorted.
   * - a link to a folder that is also listed (a linked worktree's, epic `epic-eject` Q4) is skipped, so its sessions
   *   aren't read twice
   * - a link to a folder NOT in `projects` stays listed;  a dangling link is skipped
   */
  static projectFolders(projects = ClaudeHome.projects()): string[] {
    if (!existsSync(projects)) return []
    const seen = new Set<string>()
    const links: { name: string; real: string }[] = []
    const names: string[] = []
    for (const entry of readdirSync(projects, { withFileTypes: true })) {
      const path = join(projects, entry.name)
      if (entry.isDirectory()) {
        names.push(entry.name)
        seen.add(RealPath.of(path))
      } else if (entry.isSymbolicLink() && existsSync(path) && lstatSync(RealPath.of(path)).isDirectory())
        links.push({ name: entry.name, real: RealPath.of(path) })
    }
    for (const { name, real } of links) {
      if (seen.has(real)) continue
      seen.add(real)
      names.push(name)
    }
    return names.sort()
  }

  /** Every transcript, of every project:  each once (`projectFolders()`). */
  static transcripts(home = ClaudeHome.home()): string[] {
    const projects = ClaudeHome.projects(home)
    return ClaudeHome.projectFolders(projects).flatMap((dir) =>
      readdirSync(join(projects, dir))
        .filter((name) => name.endsWith(".jsonl"))
        .map((name) => join(projects, dir, name))
    )
  }

  /**
   * The transcript of session `id`:  `<projects>/<any folder>/<id>.jsonl`, the newest when two folders hold one (a
   * session that moved);  `undefined` for none.
   */
  static transcriptOf(id: string, home = ClaudeHome.home()): string | undefined {
    const projects = ClaudeHome.projects(home)
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

/** `ClaudeHome.liveSessions()`'s options. */
export type LiveSessionsProps = {
  /** Claude Code's folder;  default `ClaudeHome.home()` */
  home?: string
  /** whether process `pid` still runs */
  isAlive: (pid: number) => boolean
}

/**
 * A live Claude Code session, its registry record `<home>/sessions/<pid>.json` (`ClaudeHome.liveSessions()`).
 * - only the fields read;  the record has more
 */
export type RunningSession = {
  /** the `claude` process */
  pid: number
  /** session id, the transcript's file name */
  sessionId: string
  /** `busy`, `idle`, `waiting` ... */
  status?: string
  /** `cli`, `claude-vscode`, `claude-desktop`, `sdk-ts` ... */
  entrypoint?: string
  /** folder it started in */
  cwd?: string
  /** title the registry knows, when any;  its address (`SendMessage`'s `to`) */
  name?: string
  /** `hook`, `derived` ...:  `derived` when Claude Code made `name` up (`SessionFolders.recordTitle()`) */
  nameSource?: string
  /** what a `waiting` session waits for, e.g. `permission` */
  waitingFor?: string
  /** when the record last changed, in ms */
  updatedAt?: number
}
