import { spawnSync } from "node:child_process"
import { existsSync, lstatSync, readFileSync, readdirSync, statSync } from "node:fs"
import { homedir } from "node:os"
import { basename, join, resolve } from "node:path"

import { isProcessAlive } from "spell/server/Heartbeat"
import { RealPath } from "spell/server/RealPath"

/****************
 * ### `ClaudeHome`
 * Claude Code's own folder, and what the epic tools read in it:  its running sessions and its saved transcripts.
 * The ONE place that knows where it is (epic `coherence` P20).
 *
 * ```ts
 * ClaudeHome.home()                                       // => "/Users/owen/.claude"
 * ClaudeHome.liveSessions()                               // => [{ pid, sessionId, name, cwd ... }]
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
 *   - `settings.json`:  its settings, the plugins turned on among them (`settings()`, `isPluginEnabled()`, which reads
 *     the project's settings, the managed file and the session's command line too)
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
   * Claude Code's own settings, `<home>/settings.json`, as written;  `undefined` when there's none.
   * - read only:  epic changes it through `epic plugin install` alone (`PluginInstall`)
   * - throws on a file that won't parse:  a caller that must never fail catches it (`isPluginEnabled()`)
   */
  static settings(home = ClaudeHome.home()): ClaudeSettings | undefined {
    return ClaudeHome.readSettings(join(home, "settings.json"))
  }

  /**
   * Is plugin `name` turned on for a session, from any marketplace, however it was turned on (epic `epic-engine` I318)?
   * - `superpowers` matches `superpowers@claude-plugins-official` and `superpowers@superpowers-marketplace` alike
   * - every layer of Claude Code's settings, their `enabledPlugins` merged key by key, the later winning
   *   (`settingsLayers()`):
   *   1. the person's own, `<home>/settings.json`
   *   2. the project's, `<project>/.claude/settings.json`:  how a team shares a plugin
   *   3. the project's local file, `<project>/.claude/settings.local.json`
   *   4. the session's `--settings <file>`
   *   5. the machine's managed settings (`managedSettingsFile()`)
   *   - a session started with `--setting-sources` reads only the first three it names, as Claude Code does
   * - and a plugin loaded for the session alone, `claude --plugin-dir <folder>`:  its manifest's name, else the
   *   folder's (`launchOptions()`)
   * - `project`:  the folder the session started in;  none, no project layers
   * - `args`:  the session's command line;  default `sessionArgs()`, a test hands its own
   * - NEVER throws:  a file that won't read turns nothing on
   */
  static isPluginEnabled(
    name: string,
    { home = ClaudeHome.home(), project, managed = ClaudeHome.managedSettingsFile(), args }: PluginLookup = {}
  ): boolean {
    try {
      const launch = ClaudeHome.launchOptions(args ?? ClaudeHome.sessionArgs(), project)
      if (launch.pluginDirs.some((folder) => ClaudeHome.pluginNameOf(folder) === name)) return true
      const enabled: Record<string, boolean> = {}
      for (const file of ClaudeHome.settingsLayers({ home, project, managed, launch }))
        Object.assign(enabled, ClaudeHome.readSettings(file)?.enabledPlugins)
      return Object.entries(enabled).some(([key, on]) => on === true && key.split("@")[0] === name)
    } catch {
      return false
    }
  }

  /**
   * The settings files a session reads, the weakest first (`isPluginEnabled()`):  the person's, the project's, its
   * local file, `--settings`'s, the machine's managed file;  missing ones included.
   * - `--setting-sources` (`launch.sources`) keeps only the first three it names;  `--settings` and managed always count
   */
  static settingsLayers({
    home = ClaudeHome.home(),
    project,
    managed = ClaudeHome.managedSettingsFile(),
    launch = { pluginDirs: [] }
  }: {
    home?: string
    project?: string
    managed?: string
    launch?: LaunchOptions
  }): string[] {
    const sources = launch.sources
    const reads = (source: SettingSource) => !sources || sources.includes(source)
    return [
      ...(reads("user") ? [join(home, "settings.json")] : []),
      ...(project && reads("project") ? [join(project, ".claude", "settings.json")] : []),
      ...(project && reads("local") ? [join(project, ".claude", "settings.local.json")] : []),
      ...(launch.settings ? [launch.settings] : []),
      ...(managed ? [managed] : [])
    ]
  }

  /** Settings file `file` as written;  `undefined` when there's none.  Throws on one that won't parse. */
  static readSettings(file: string): ClaudeSettings | undefined {
    return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as ClaudeSettings) : undefined
  }

  /**
   * Where this machine's managed settings are (an organization's policy):  Claude Code's path for the system.
   * - macOS `/Library/Application Support/ClaudeCode/managed-settings.json`;  Windows
   *   `C:\Program Files\ClaudeCode\managed-settings.json`;  else `/etc/claude-code/managed-settings.json`
   */
  static managedSettingsFile(platform: NodeJS.Platform = process.platform): string {
    if (platform === "darwin") return "/Library/Application Support/ClaudeCode/managed-settings.json"
    if (platform === "win32") return "C:\\Program Files\\ClaudeCode\\managed-settings.json"
    return "/etc/claude-code/managed-settings.json"
  }

  /**
   * The command line of the `claude` running this process (a hook, a tool), as `ps` prints it;  `[]` when unknown.
   * - the session's process:  `$CLAUDE_PID`, which Claude Code gives everything it starts;  else this process's
   *   parent or grandparent whose program is `claude` (a hook run through a shell)
   * - split at spaces:  a folder whose path holds one isn't read right
   * - `ps` only:  on Windows, `[]`
   * - NEVER throws
   */
  static sessionArgs(): string[] {
    try {
      const own = process.env.CLAUDE_PID
      if (own) return ClaudeHome.argsOf(Number(own))
      let pid = process.ppid
      for (let up = 0; up < 2 && pid > 1; up++) {
        const args = ClaudeHome.argsOf(pid)
        if (args[0] && basename(args[0]) === "claude") return args
        pid = Number(ClaudeHome.ps(pid, "ppid=")) || 0
      }
    } catch {
      // no `ps`:  nothing known
    }
    return []
  }

  /** Process `pid`'s command line, split at spaces;  `[]` when there's no such process. */
  static argsOf(pid: number): string[] {
    return ClaudeHome.ps(pid, "args=").split(/\s+/).filter(Boolean)
  }

  /** What `ps` prints of process `pid`'s `field` (`args=`, `ppid=`), trimmed;  `""` for none. */
  static ps(pid: number, field: string): string {
    if (!Number.isInteger(pid) || pid <= 0) return ""
    const run = spawnSync("ps", ["-ww", "-o", field, "-p", String(pid)], { encoding: "utf8", timeout: 2000 })
    return run.status === 0 ? run.stdout.trim() : ""
  }

  /**
   * What a session's command line `args` says about its settings and plugins:
   * - `pluginDirs`:  each `--plugin-dir <folder>`, from `cwd` when relative
   * - `sources`:  `--setting-sources user,project,local`'s list, when given
   * - `settings`:  `--settings <file>`, when it names a file (not JSON written inline)
   * - `--flag value` and `--flag=value` alike
   */
  static launchOptions(args: string[], cwd = process.cwd()): LaunchOptions {
    const found: LaunchOptions = { pluginDirs: [] }
    for (let index = 0; index < args.length; index++) {
      const [flag, inline] = args[index].split(/=(.*)/s)
      if (!LAUNCH_FLAGS.has(flag)) continue
      const value = inline ?? args[++index]
      if (!value) continue
      if (flag === "--plugin-dir") found.pluginDirs.push(resolve(cwd, value))
      else if (flag === "--setting-sources")
        found.sources = value.split(",").map((source) => source.trim()) as SettingSource[]
      else if (flag === "--settings" && !value.trimStart().startsWith("{")) found.settings = resolve(cwd, value)
    }
    return found
  }

  /** The name of the plugin in `folder`:  its manifest's (`.claude-plugin/plugin.json`), else the folder's own. */
  static pluginNameOf(folder: string): string {
    try {
      const manifest = join(folder, ".claude-plugin", "plugin.json")
      const name = existsSync(manifest) ? (JSON.parse(readFileSync(manifest, "utf8")) as { name?: unknown }).name : ""
      return typeof name === "string" && name ? name : basename(folder)
    } catch {
      return basename(folder)
    }
  }

  /**
   * The running sessions:  each record of Claude Code's registry, `<home>/sessions/<pid>.json`, whose process
   * still runs, in its files' order.
   * - a record whose process is gone (a session that ended without cleaning up), one half-written, or one with no
   *   `pid` or `sessionId`:  skipped
   * - `isAlive`:  the process check;  the kit's ONE (`isProcessAlive()`, beside its `Heartbeat`), unless a test hands
   *   its own
   * - NEVER throws
   */
  static liveSessions({
    home = ClaudeHome.home(),
    isAlive = isProcessAlive
  }: LiveSessionsProps = {}): RunningSession[] {
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
  /**
   * EVERY copy of session `id`'s transcript, `<projects>/<any folder>/<id>.jsonl`, each real file once;  `[]` for none.
   * - a session that moved has one in each folder it worked in:  a title written to only one of them may not be the
   *   one the panel reads
   */
  static transcriptCopies(id: string, home = ClaudeHome.home()): string[] {
    const projects = ClaudeHome.projects(home)
    if (!existsSync(projects)) return []
    const seen = new Map<string, string>()
    for (const dir of readdirSync(projects)) {
      const path = join(projects, dir, `${id}.jsonl`)
      if (existsSync(path)) seen.set(RealPath.of(path), seen.get(RealPath.of(path)) ?? path)
    }
    return [...seen.values()]
  }
}

/**
 * Claude Code's `settings.json` (`ClaudeHome.settings()`):  only the fields epic reads;  the file has more.
 */
export type ClaudeSettings = {
  /** each plugin, `<plugin>@<marketplace>`, turned on (`true`) or off */
  enabledPlugins?: Record<string, boolean>
  /** marketplaces added by hand:  each one's `source`, a folder for a local one */
  extraKnownMarketplaces?: Record<string, { source?: { path?: string } }>
}

/** `ClaudeHome.isPluginEnabled()`'s options:  where to look;  each defaults to this machine and session. */
export type PluginLookup = {
  /** Claude Code's folder;  default `ClaudeHome.home()` */
  home?: string
  /** folder the session started in, for its `.claude/` settings;  none, no project layers */
  project?: string
  /** the managed settings file;  default `ClaudeHome.managedSettingsFile()` */
  managed?: string
  /** the session's command line;  default `ClaudeHome.sessionArgs()` */
  args?: string[]
}

/** A settings layer `--setting-sources` can name. */
export type SettingSource = "user" | "project" | "local"

/** What a session's command line says about settings and plugins (`ClaudeHome.launchOptions()`). */
export type LaunchOptions = {
  /** each `--plugin-dir`, absolute */
  pluginDirs: string[]
  /** `--setting-sources`' list, when given */
  sources?: SettingSource[]
  /** `--settings`' file, when given one */
  settings?: string
}

/** The command-line flags `ClaudeHome.launchOptions()` reads. */
const LAUNCH_FLAGS = new Set(["--plugin-dir", "--setting-sources", "--settings"])

/** `ClaudeHome.liveSessions()`'s options. */
export type LiveSessionsProps = {
  /** Claude Code's folder;  default `ClaudeHome.home()` */
  home?: string
  /** whether process `pid` still runs;  default the kit's `isProcessAlive()` */
  isAlive?: (pid: number) => boolean
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
  /** when its process started, ms:  a restart's sessions all start after the agents it cut off (`RestartWake`) */
  startedAt?: number
  /** title the registry knows, when any;  its address (`SendMessage`'s `to`) */
  name?: string
  /** `hook`, `derived` ...:  `derived` when Claude Code made `name` up (`SessionFolders.recordTitle()`) */
  nameSource?: string
  /** what a `waiting` session waits for, e.g. `permission` */
  waitingFor?: string
  /** when the record last changed, in ms */
  updatedAt?: number
}
