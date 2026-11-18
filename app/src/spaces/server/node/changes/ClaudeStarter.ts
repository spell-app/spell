import { spawn } from "node:child_process"
import { accessSync, closeSync, constants, mkdirSync, openSync, statSync } from "node:fs"
import { homedir } from "node:os"
import { delimiter, dirname, join } from "node:path"

import { SRV } from "spell/server"
import type { SPACES } from "spell/app/spaces"
import environment from "spell/app/spaces/server/node/environment"
import { ChangeRequests } from "./ChangeRequests"
import { SessionLog } from "./SessionLog"

/****************
 * ### `ClaudeStarter`
 * Starts a Claude Code session for a change someone asked for, when no session is listening (epic `editor` T66):
 * headless, in the background, on this machine.
 * - Before it, the person had to start one by hand and type `spell app changes wait` into it.
 * - The session is `claude` in print mode, started in the project's folder:
 *   - it runs `spell app changes take <id>`, which prints the request, as `wait` would;
 *   - changes the project's files, and says `spell app changes done <id>`
 * - What it may do (`argsFor()`), and NEVER more:
 *   - edit files inside the project's folder (Claude Code's `acceptEdits` mode, started there),
 *     and in the folder of the file the request names (`--add-dir`):  the person's draft may be elsewhere
 *   - read files, and run those two `spell app changes` commands
 *   - anything else would ask, and nobody answers (`--permission-prompts none`):  it's refused
 *   - never `--dangerously-skip-permissions`
 * - Without this machine's hooks and MCP servers (epic `editor` I138):
 *   - the epic plugin's hooks kept a finished session running for good, and woke it with epic work
 *   - so a request sat "waiting" while its session never took it, nor ended
 * - It writes the session into the request (`ChangeRequests.startedFor()`).
 * - Its events stream into a log beside the inbox, as they happen:
 *   the box shows what it's doing from them (`SessionLog`).
 * - A session that ends without saying `done` fails the request (`settle()`), its last word the reason.
 * - One that hasn't taken it within `TAKE_WITHIN_MS` is stopped, and fails it as `stalled`.
 * - Node only;  NEVER knows about epics, as `ChangeRequests` doesn't.
 ****************/
export class ClaudeStarter {
  constructor(
    readonly inbox: ChangeRequests,
    readonly options: StarterOptions = {}
  ) {}

  /** The ONE starter, on the inbox in spell-spaces. */
  static get here(): ClaudeStarter {
    return new ClaudeStarter(ChangeRequests.here)
  }

  /**
   * Where Claude Code's command is on this machine:  the first `claude` on the `PATH`, else in a usual install place;
   * `undefined` when it isn't installed.
   * - The usual places matter:  a page server started from the Dock, or by another tool, may have a short `PATH`.
   * - NEVER throws
   * - Never under Vitest, unless a test hands it `env`:  a test of the routes would start a real Claude session (I152).
   */
  static find({ env, home = homedir(), canRun = isRunnable }: FindOptions = {}): string | undefined {
    if (!env && process.env.VITEST) return undefined
    env ??= process.env
    const onPath = (env.PATH ?? "")
      .split(delimiter)
      .filter(Boolean)
      .map((folder) => join(folder, COMMAND))
    const usual = USUAL_PLACES.map((place) => (place.startsWith("~/") ? join(home, place.slice(2)) : place))
    return [...onPath, ...usual].find((file) => canRun(file))
  }

  /** Is Claude Code installed here? */
  get hasClaude(): boolean {
    return !!this.claude
  }

  /** Claude Code's command, as found (`find()`) or as handed in. */
  get claude(): string | undefined {
    return "claude" in this.options ? this.options.claude : ClaudeStarter.find()
  }

  /**
   * The arguments `claude` is started with, for `request` (see the class's docs for what they allow).
   * - `spell`:  the `spell` command, as the session runs it:  this node and the kit's `bin/spell.mjs`, by full paths
   */
  static argsFor(request: SPACES.ChangeRequest, spell: string): string[] {
    return [
      promptFor(request, spell),
      "--print",
      "--name",
      `Change This ${request.id}`,
      "--permission-mode",
      "acceptEdits",
      "--permission-prompts",
      "none",
      "--tools",
      TOOLS.join(","),
      // its events, one JSON object a line, as they happen:  print mode alone writes only at the end
      "--output-format",
      "stream-json",
      "--verbose",
      // none of this machine's hooks or MCP servers:  see the class's docs
      "--settings",
      JSON.stringify({ disableAllHooks: true }),
      "--strict-mcp-config",
      // the file it names may be a draft kept outside the project folder (an org space's private one)
      "--add-dir",
      dirname(request.diskPath),
      // last:  it takes every argument after it
      "--allowedTools",
      ...READ_TOOLS,
      `Bash(${spell} app changes take:*)`,
      `Bash(${spell} app changes done:*)`
    ]
  }

  /**
   * Start a session for `request`, in `projectFolder`:  the request as the inbox has it now, with its session.
   * - SIDE EFFECT:  a background process, which outlives the page server;  its log beside the inbox
   * - throws `TypeError` when Claude Code isn't installed here, or the request isn't waiting
   * - throws what starting the process throws
   */
  start(request: SPACES.ChangeRequest, projectFolder: string): SPACES.ChangeRequest {
    const { claude } = this
    if (!claude) throw new TypeError("ClaudeStarter.start():  Claude Code isn't installed on this machine")
    if (request.status !== "waiting") {
      throw new TypeError(`ClaudeStarter.start():  ${request.id} is ${request.status} already`)
    }
    const log = join(dirname(this.inbox.file), SESSIONS_FOLDER, `${request.id}.log`)
    mkdirSync(dirname(log), { recursive: true })
    const output = openSync(log, "w")
    try {
      const spell = this.spellCommand
      const child = (this.options.spawn ?? spawn)(claude, ClaudeStarter.argsFor(request, spell), {
        cwd: projectFolder,
        env: sessionEnv(spell),
        detached: true,
        stdio: ["ignore", output, output]
      })
      if (!child.pid) throw new Error(`ClaudeStarter.start():  ${claude} didn't start`)
      // when it ends here, while this server runs;  after a restart, `settle()` finds it gone
      child.once("exit", () => this.settleQuietly(request.id))
      child.unref()
      // stopped if it hasn't taken the request in time, whether or not the box still looks
      setTimeout(() => this.settleQuietly(request.id), TAKE_WITHIN_MS + SETTLE_LATE_MS).unref()
      return this.inbox.startedFor(request.id, { pid: child.pid, at: new Date(this.now()).toISOString(), log })
    } finally {
      closeSync(output)
    }
  }

  /**
   * `request`, settled:
   * - its session has ended without finishing it:  failed, the session's last word its summary (`SessionLog`)
   * - its session hasn't taken it within `TAKE_WITHIN_MS`:  the session is stopped, and the request fails, `stalled`
   * - Anything else comes back as it is.
   * - SIDE EFFECT:  ends a stalled session's process
   */
  settle<R extends SPACES.ChangeRequest | undefined>(request: R): R {
    const session = request?.session
    if (!request || !session || !UNFINISHED.includes(request.status)) return request
    if (!SRV.Heartbeat.isLive({ pid: session.pid })) {
      return this.inbox.finish(request.id, "failed", SessionLog.of(session.log).summary) as R
    }
    const isStalled = request.status === "waiting" && this.now() - Date.parse(session.at) > TAKE_WITHIN_MS
    if (!isStalled) return request
    ;(this.options.end ?? endQuietly)(session.pid)
    return this.inbox.fail(request.id, "stalled", STALLED_SUMMARY) as R
  }

  /**
   * What `request`'s session is doing now, from its log:  `undefined` when it has none, or has finished.
   * - Taken, but its log doesn't show it yet:  reading the request.
   */
  progressOf(request: SPACES.ChangeRequest): SPACES.ChangeProgress | undefined {
    if (!request.session || !UNFINISHED.includes(request.status)) return undefined
    const progress = SessionLog.of(request.session.log).progress
    return request.status === "taken" && progress.step === "starting" ? { step: "reading request" } : progress
  }

  /** Settle request `id` (`settle()`), as it is now.  NEVER throws:  a failure goes to the server's log. */
  private settleQuietly(id: string): void {
    try {
      this.settle(this.inbox.of(id))
    } catch (ignored) {
      console.error("ClaudeStarter:  can't settle", id, ignored)
    }
  }

  /** Now, in msec:  a test's clock, else the machine's. */
  private now(): number {
    return this.options.now?.() ?? Date.now()
  }

  /** The `spell` command, as the session runs it:  full paths, so its permissions name exactly that. */
  private get spellCommand(): string {
    const bin = this.options.spellBin ?? join(environment.packageFolder("spell"), "bin", "spell.mjs")
    return [process.execPath, bin].map(shellWord).join(" ")
  }
}

/** What a starter can be handed:  a test's stand-ins. */
export type StarterOptions = {
  /** Claude Code's command;  `undefined`:  not installed.  Left out:  `ClaudeStarter.find()` */
  claude?: string
  /** the kit's `bin/spell.mjs` */
  spellBin?: string
  /** starts the process:  node's `spawn()` */
  spawn?: typeof spawn
  /** ends a stalled session's process:  `SRV.endProcess()` */
  end?: (pid: number) => void
  /** now, in msec:  `Date.now()` */
  now?: () => number
}

/** What `ClaudeStarter.find()` looks with:  a test's stand-ins. */
export type FindOptions = {
  /** the environment, for its `PATH` */
  env?: NodeJS.ProcessEnv
  /** the home folder, for the usual places */
  home?: string
  /** is `file` a program that runs? */
  canRun?: (file: string) => boolean
}

/** The prompt:  what `spell app changes wait` would have had a person's session do. */
function promptFor(request: SPACES.ChangeRequest, spell: string): string {
  return [
    `Someone in the Spell editor asked for a change to their program (${request.id}).`,
    `Run \`${spell} app changes take ${request.id}\`:  it prints what they asked for, where, and how to finish.`,
    "Then do what it says.",
    "Change only what they asked for, in this project's files.",
    "The file it names is the one they see:  their draft, when they have one.  Edit that file, never another copy.",
    "Don't commit anything, and don't wait for another request afterwards."
  ].join("\n")
}

/** `path` as one word of a shell command:  in quotes when it has a space. */
function shellWord(path: string): string {
  return /\s/.test(path) ? `"${path}"` : path
}

/**
 * The session's environment:  `claudeEnv()`'s.
 * - `SPELL_CHANGES_COMMAND`:  `spell`, as the session runs it, so `take` tells it to say `done` the same way,
 *   the one way it's allowed
 */
function sessionEnv(spell: string): NodeJS.ProcessEnv {
  return claudeEnv({ SPELL_CHANGES_COMMAND: spell })
}

/**
 * The environment to start Claude Code in from this server:  this server's, less the marks of a Claude Code session
 * around it (a page server started from inside a session has them, and Claude Code won't start inside another),
 * plus `extra`.  `ClaudeExplainer`'s too.
 */
export function claudeEnv(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, ...extra }
  for (const name of SESSION_MARKS) delete env[name]
  return env
}

/** End process `pid`, in the background.  NEVER throws:  a failure goes to the server's log. */
function endQuietly(pid: number): void {
  void SRV.endProcess(pid, END_WAIT_MS).catch((error: unknown) =>
    console.error("ClaudeStarter:  can't end", pid, error)
  )
}

/** Is `file` a program this process may run? */
function isRunnable(file: string): boolean {
  try {
    accessSync(file, constants.X_OK)
    return statSync(file).isFile()
  } catch (ignored) {
    return false
  }
}

/** Claude Code's command, by name. */
const COMMAND = "claude"

/**
 * Where Claude Code's installers put it, after the `PATH`:  `~/` is the home folder.
 * - its own installer (`~/.local/bin`), its old local install (`~/.claude/local`), Homebrew's two, npm's global
 */
const USUAL_PLACES = [
  "~/.local/bin/claude",
  "~/.claude/local/claude",
  "/opt/homebrew/bin/claude",
  "/usr/local/bin/claude",
  "~/.npm-global/bin/claude"
]

/** The tools that only read:  allowed everywhere, as the request's pictures are beside the inbox. */
const READ_TOOLS = ["Read", "Glob", "Grep"]

/** Every tool the session has:  no web, no agents. */
const TOOLS = [...READ_TOOLS, "Edit", "Write", "Bash"]

/** The variables that mark a Claude Code session:  left out of the one started. */
const SESSION_MARKS = ["CLAUDECODE", "CLAUDE_CODE_ENTRYPOINT"]

/** The statuses a session hasn't finished. */
const UNFINISHED: SPACES.ChangeStatus[] = ["waiting", "taken"]

/** Where the sessions' logs go, beside the inbox:  `__` keeps it out of the project lists. */
const SESSIONS_FOLDER = "__change-sessions"

/**
 * How long a session has to take its request, in msec, before it's stopped as stalled.
 * - One with nothing in its way takes it in about 5s (epic `editor` I138, measured).
 */
const TAKE_WITHIN_MS = 60_000

/** How long after `TAKE_WITHIN_MS` the starter looks by itself, in msec:  the box usually looks first. */
const SETTLE_LATE_MS = 1000

/** How long a stalled session has to end before it's killed, in msec. */
const END_WAIT_MS = 3000

/** A stalled request's summary, for the log and `spell app changes list`:  the box says it in its own words. */
const STALLED_SUMMARY = "The Claude session didn't take the request within a minute, so it was stopped."
