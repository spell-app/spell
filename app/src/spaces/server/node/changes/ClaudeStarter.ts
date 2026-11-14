import { spawn } from "node:child_process"
import { accessSync, closeSync, constants, mkdirSync, openSync, readFileSync, statSync } from "node:fs"
import { homedir } from "node:os"
import { delimiter, dirname, join } from "node:path"

import { SRV } from "spell/server"
import type { SPACES } from "spell/app/spaces"
import environment from "spell/app/spaces/server/node/environment"
import { ChangeRequests } from "./ChangeRequests"

/****************
 * ### `ClaudeStarter`
 * Starts a Claude Code session for a change someone asked for, when no session is listening (epic `editor` T66):
 * headless, in the background, on this machine.
 * - Before it, the person had to start one by hand and type `spell app changes wait` into it.
 * - The session is `claude` in print mode, started in the project's folder:
 *   - it runs `spell app changes take <id>`, which prints the request, as `wait` would;
 *   - changes the project's files, and says `spell app changes done <id>`
 * - What it may do (`argsFor()`), and NEVER more:
 *   - edit files inside the project's folder (Claude Code's `acceptEdits` mode, started there)
 *   - read files, and run those two `spell app changes` commands
 *   - anything else would ask, and nobody answers (`--permission-prompts none`):  it's refused
 *   - never `--dangerously-skip-permissions`
 * - It writes the session into the request (`ChangeRequests.startedFor()`), its output into a log beside the inbox.
 * - A session that ends without saying `done` fails the request (`settle()`), with its last line as the reason.
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
   */
  static find({ env = process.env, home = homedir(), canRun = isRunnable }: FindOptions = {}): string | undefined {
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
      child.once("exit", () => {
        try {
          this.settle(this.inbox.of(request.id))
        } catch (ignored) {
          console.error("ClaudeStarter:  can't settle", request.id, ignored)
        }
      })
      child.unref()
      return this.inbox.startedFor(request.id, { pid: child.pid, at: new Date().toISOString(), log })
    } finally {
      closeSync(output)
    }
  }

  /**
   * `request`, settled:  if the session started for it has ended without finishing it, it has failed,
   * the last line the session wrote its summary.
   * - Anything else comes back as it is.
   */
  settle<R extends SPACES.ChangeRequest | undefined>(request: R): R {
    const session = request?.session
    if (!request || !session || !UNFINISHED.includes(request.status)) return request
    if (SRV.Heartbeat.isLive({ pid: session.pid })) return request
    return this.inbox.finish(request.id, "failed", lastLineOf(session.log)) as R
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
    "Don't commit anything, and don't wait for another request afterwards."
  ].join("\n")
}

/** `path` as one word of a shell command:  in quotes when it has a space. */
function shellWord(path: string): string {
  return /\s/.test(path) ? `"${path}"` : path
}

/**
 * The session's environment:  this server's, less the marks of a Claude Code session around it.
 * - A page server started from inside a session has them, and Claude Code won't start inside another.
 * - `SPELL_CHANGES_COMMAND`:  `spell`, as the session runs it, so `take` tells it to say `done` the same way,
 *   the one way it's allowed
 */
function sessionEnv(spell: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, SPELL_CHANGES_COMMAND: spell }
  for (const name of SESSION_MARKS) delete env[name]
  return env
}

/** The last line `log` has, trimmed:  `undefined` when it has none, or can't be read. */
function lastLineOf(log: string): string | undefined {
  try {
    const line = readFileSync(log, "utf8").trim().split("\n").at(-1)?.trim()
    return line ? line.slice(0, MOST_SUMMARY_CHARS) : undefined
  } catch (ignored) {
    return undefined
  }
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

/** The longest summary taken from a log, in characters. */
const MOST_SUMMARY_CHARS = 300
