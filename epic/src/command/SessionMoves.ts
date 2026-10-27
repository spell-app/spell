import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs"
import { homedir } from "node:os"
import { basename, dirname, join } from "node:path"

// By package path, `.ts` and all:  the window script and the `UserPromptSubmit` hook load this file with plain `node`
// (types stripped)
import { ClaudeHome } from "spell-epic/config/ClaudeHome.ts"

/****************
 * ### `SessionMoves`
 * Whether a session's promised move to another window will really happen, and what's said when it didn't
 * (epic `epic-engine` P26, request r20).
 * - A move is a record, `<registry>/handoffs/<session id>.json` (`Window.handoff()`), carried out by the plugin's
 *   end-of-turn hook (`hooks/handoff.mjs`).  Nothing else runs it:  with the hook gone, the record just waits.
 * - r20:  every plugin hook failed for a day (Claude Code still had spell-epic's marketplace at a folder that was gone),
 *   so `launch --move` and `handoff` said "this session moves ... when this turn ends", and nothing happened.
 * - What this does about it:
 *   1. `hookProblem()`:  before a move is promised, why the hook WON'T run, or `null`.
 *      `epic window handoff` and `launch --move` refuse a move with a problem, saying why and what fixes it.
 *   2. `sawHooks()` / `missedMove()`:  the prompt hook marks each session whose hooks it saw run, and notices a
 *      record still waiting at the session's next prompt:  the hook didn't run.  It says so, and clears the record.
 * - Its position:  node's own modules and `ClaudeHome` by path, so plain `node` loads it;
 *   NEVER imports the window script (`src/window.mjs`), which imports it.
 *   NEVER an alias, an `enum` or a parameter property.
 ****************/
export class SessionMoves {
  /** spell-epic's registry folder:  `$SPELL_EPIC_WINDOWS_DIR`, else `~/.spell-epic/windows` (`Window.registry`) */
  readonly registry: string
  /** Claude Code's own folder (`~/.claude`):  its settings and plugin lists */
  readonly home: string
  /** the plugin's folder, spell-epic's:  its `.claude-plugin/` names it */
  readonly engine: string

  constructor({ registry = SessionMoves.registry(), home = ClaudeHome.home(), engine = ENGINE }: MovesProps = {}) {
    this.registry = registry
    this.home = home
    this.engine = engine
  }

  /** spell-epic's registry folder, read on every call (for tests):  `$SPELL_EPIC_WINDOWS_DIR`, else the default. */
  static registry(): string {
    return process.env.SPELL_EPIC_WINDOWS_DIR || join(homedir(), ".spell-epic", "windows")
  }

  /** `<registry>/handoffs`:  pending moves (`<session id>.json`), the one being carried out, and their logs. */
  get handoffs(): string {
    return join(this.registry, "handoffs")
  }

  /** Session `sessionId`'s pending move:  `<registry>/handoffs/<session id>.json`. */
  handoffFile(sessionId: string): string {
    return join(this.handoffs, `${sessionId}.json`)
  }

  /** The marks `sawHooks()` leaves:  `<registry>/hooks-seen/<session id>`. */
  get seen(): string {
    return join(this.registry, "hooks-seen")
  }

  ////////////////
  // ## Will the end-of-turn hook run?
  ////////////////

  /**
   * Why the plugin's end-of-turn hook won't carry out a move of session `sessionId`, in one line, or `null` when
   * nothing says it won't.
   * - from what Claude Code reads to find the plugin (`pluginProblem()`), then this session's own mark
   *   (`sawHooks()`):  the prompt hook ran for it, so the plugin's hooks are loaded in it
   * - no `sessionId`:  the plugin's settings only
   * - NEVER throws:  a list it can't read is a problem, said
   */
  hookProblem(sessionId?: string | null): string | null {
    const problem = this.pluginProblem()
    if (problem) return problem
    if (sessionId && !existsSync(join(this.seen, sessionId)))
      return (
        "this session's hooks haven't run:  its prompt hook never marked it " +
        "(it started before the plugin was fixed, or runs an old copy of it)"
      )
    return null
  }

  /**
   * Why Claude Code won't find the plugin's hooks, from its own lists, or `null`.
   * - the plugin turned off in `~/.claude/settings.json` (`enabledPlugins`)
   * - its marketplace's folder gone, in either list Claude Code keeps it in:  `~/.claude/settings.json`
   *   (`extraKnownMarketplaces`) and `~/.claude/plugins/known_marketplaces.json` (r20:  both named spell-app's old
   *   `spell-epic/`, and every hook failed, "Plugin directory does not exist")
   * - the folder its hooks run from (`installed_plugins.json`'s `installPath`, the plugin install steps' step 5 link)
   *   gone, or without the end-of-turn hook
   * - a list missing, or the plugin not in it (a session run with `--plugin-dir`):  no problem said
   */
  pluginProblem(): string | null {
    const { plugin, marketplace } = this.pluginNames()
    const key = `${plugin}@${marketplace}`
    try {
      const settings = readJson(join(this.home, "settings.json"))
      if (settings?.enabledPlugins?.[key] === false) return `the plugin ${key} is turned off (enabledPlugins)`
      const listed = settings?.extraKnownMarketplaces?.[marketplace]?.source?.path
      if (listed && !existsSync(listed))
        return `Claude Code looks for the plugin's marketplace in ${listed}, which is gone (settings.json)`
      const known = readJson(join(this.home, "plugins", "known_marketplaces.json"))?.[marketplace]?.installLocation
      if (known && !existsSync(known))
        return `Claude Code looks for the plugin's marketplace in ${known}, which is gone (known_marketplaces.json)`
      const installs = readJson(join(this.home, "plugins", "installed_plugins.json"))?.plugins?.[key] ?? []
      for (const { installPath } of installs as { installPath?: string }[]) {
        if (installPath && !existsSync(join(installPath, "hooks", "handoff.mjs")))
          return `the plugin's hooks run from ${installPath}, which has no hooks/handoff.mjs (installed_plugins.json)`
      }
    } catch (error) {
      return `Claude Code's plugin lists can't be read:  ${(error as Error).message}`
    }
    return null
  }

  /** The plugin's name and its marketplace's, from the engine's `.claude-plugin/`;  `spell-epic` each by default. */
  pluginNames(): { plugin: string; marketplace: string } {
    const folder = join(this.engine, ".claude-plugin")
    const plugin = readJsonQuietly(join(folder, "plugin.json"))?.name ?? "spell-epic"
    const marketplace = readJsonQuietly(join(folder, "marketplace.json"))?.name ?? "spell-epic"
    return { plugin, marketplace }
  }

  /**
   * What fixes `problem` (`hookProblem()`'s), in one line:  the plugin install steps (the kit's `README-agents.md`,
   * "The epic plugin"), or a new session.
   */
  fixFor(problem: string): string {
    if (problem.startsWith("this session's hooks"))
      return "type /reload-plugins, or start a new session;  until then this session can't move"
    if (problem.includes("turned off")) return "turn it back on (`/plugin`), then /reload-plugins"
    return (
      `run the plugin install steps again (the kit's README-agents.md, "The epic plugin"):  ` +
      `\`claude plugin marketplace add ${this.engine} --scope user\`, then the cache link (step 5), ` +
      `then /reload-plugins`
    )
  }

  ////////////////
  // ## A move promised, not made
  ////////////////

  /**
   * Mark session `sessionId`:  its hooks run (the prompt hook calls this on every prompt);  `hookProblem()` reads it.
   * - also drops marks a month old, so the folder doesn't grow forever
   * - NEVER throws
   */
  sawHooks(sessionId: string | undefined, now = Date.now()): void {
    if (!sessionId || !SESSION_ID.test(sessionId)) return
    try {
      mkdirSync(this.seen, { recursive: true, mode: 0o700 })
      writeFileSync(join(this.seen, sessionId), `${new Date(now).toISOString()}\n`, { mode: 0o600 })
      for (const name of readdirSync(this.seen)) {
        const file = join(this.seen, name)
        if (now - statSync(file).mtimeMs > SEEN_FOR_MS) rmSync(file, { force: true })
      }
    } catch {
      // best effort:  no mark means a refused move, said, never a lost one
    }
  }

  /**
   * A move of session `sessionId` that was promised but didn't happen:  what's said about it, or `null`.
   * - a record still waiting (`<session id>.json`) when
   *   - `turnEnded`:  the turn that wrote it is over (the prompt hook, on the next prompt:  the end-of-turn hook
   *     renames the record the moment it runs, so one still there means it never did)
   *   - or the hook can't run now (`hookProblem()`), whenever it's asked:  the window script's commands ask too, for
   *     a session whose prompt hook can't run either (r20)
   * - SIDE EFFECT:  the record is cleared (renamed `<session id>.missed.json`, the last one kept), and a line goes in
   *   the move's log (`<session id>.log`):  else `Window.show()` would keep holding docs for a window never reached
   * - NEVER throws
   */
  missedMove(sessionId: string | undefined, { turnEnded = false } = {}): MissedMove | null {
    if (!sessionId || !SESSION_ID.test(sessionId)) return null
    try {
      const file = this.handoffFile(sessionId)
      if (!existsSync(file)) return null
      const problem = this.pluginProblem()
      if (!turnEnded && !problem) return null
      const record = JSON.parse(readFileSync(file, "utf8")) as { to?: string }
      const name = record.to ? basename(record.to, ".code-workspace") : "another"
      renameSync(file, join(this.handoffs, `${sessionId}.missed.json`))
      const why = problem ?? "the end-of-turn hook never ran, or failed before it began"
      const line = `${new Date().toISOString()}  missed:  the move to ${name}'s window never started:  ${why}\n`
      appendFileSync(join(this.handoffs, `${sessionId}.log`), line, { mode: 0o600 })
      const fix = problem ? `  Fix:  ${this.fixFor(problem)}.` : ""
      const message =
        `This session was to move to ⎇ ${name}'s window when its last turn ended, and didn't:  ${why}.${fix}  ` +
        `To work there now:  \`epic window launch ${name}\` (a new session in its window).`
      return { name, problem, message }
    } catch {
      return null
    }
  }

  /**
   * `output` (a `UserPromptSubmit` hook's JSON, or `null`) with `missed` said in it:  a line for Owen
   * (`systemMessage`) and the same for Claude (`additionalContext`), after what's there.
   * - a blocked prompt (`decision: "block"`) is left as it is:  Claude never reads it
   */
  static withMissed(output: HookOutput | null, missed: MissedMove | null): HookOutput | null {
    if (!missed) return output
    if (output && "decision" in output) return output
    const own = output?.hookSpecificOutput
    const joined = (before: string | undefined) => (before ? `${before}\n\n${missed.message}` : missed.message)
    return {
      ...output,
      hookSpecificOutput: {
        ...own,
        hookEventName: "UserPromptSubmit",
        additionalContext: joined(own?.additionalContext)
      },
      systemMessage: joined(output?.systemMessage)
    }
  }
}

/** `SessionMoves`'s constructor options;  every one has a default. */
export type MovesProps = {
  /** spell-epic's registry folder;  default `SessionMoves.registry()` */
  registry?: string
  /** Claude Code's own folder;  default `ClaudeHome.home()` */
  home?: string
  /** the plugin's folder;  default this file's engine, spell-epic */
  engine?: string
}

/** A move promised, not made (`missedMove()`). */
export type MissedMove = {
  /** the window it was to go to:  its file's name, the epic's */
  name: string
  /** why the hook can't run, when that's known (`pluginProblem()`) */
  problem: string | null
  /** what's said, for Owen and Claude both */
  message: string
}

/** A `UserPromptSubmit` hook's JSON, the fields `withMissed()` touches. */
export type HookOutput =
  | { decision: "block"; reason: string }
  | {
      hookSpecificOutput?: { hookEventName: "UserPromptSubmit"; sessionTitle?: string; additionalContext?: string }
      systemMessage?: string
    }

/** The engine, spell-epic:  the folder this file's `src/command/` is in. */
const ENGINE = dirname(dirname(import.meta.dirname))

/** A Claude Code session id:  a uuid. */
const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** How long a session's mark (`sawHooks()`) is kept, ms:  30 days. */
const SEEN_FOR_MS = 30 * 24 * 60 * 60 * 1000

/** JSON file `file`, or `undefined` when there's none;  throws on one it can't parse. */
function readJson(file: string): any {
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : undefined
}

/** JSON file `file`, or `undefined` when there's none or it can't be read. */
function readJsonQuietly(file: string): any {
  try {
    return readJson(file)
  } catch {
    return undefined
  }
}
