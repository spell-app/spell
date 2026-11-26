import { spawn, spawnSync } from "node:child_process"
import { existsSync, mkdirSync, openSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { Bells } from "spell/epic/config/Bells.ts"
import { EngineFiles } from "spell/epic/config/EngineFiles.mjs"
import { EpicConfig } from "spell/epic/config/EpicConfig.ts"

import { EXIT, EpicCommandError, parseVerbArgs, stringFlag } from "./command.types.ts"

/****************
 * ### `TurnEnd`
 * `epic turn end [--session <id>] [--quiet]`:  what an agent does at the end of every turn, for ANY agent
 * (epic `epic-friend` P11):  commit the shared plans, then sync them with the team's epic repo.
 *
 * - ONE path for every agent:
 *   - Claude Code's `Stop` hook ([shared-commit.mjs](../../hooks/shared-commit.mjs)) runs it, in the background
 *   - so does Codex's ([codex-hooks.json](../../hooks/codex-hooks.json)), through the same script
 *   - any other agent runs `epic turn end` itself, as `epic guide` says
 * - First, in an epic's worktree, the TIDY (epic `epic-engine` T78;  Owen, 2026-11-15:  "we need an 'end of turn'
 *   action to go through the open/underway issues and clean things up"):  `epic stale <epic> --underway --apply`,
 *   at most once an hour per epic (`tidy()`):  stale Underway items whose work is on main turn orange for review,
 *   the rest get a Stale card
 * - What it does is `Shared.sync()`:  one commit per epic, guide or folder, then pull (rebasing), renumber ids two
 *   people both made, push, when the repo's config names `contentRemote` (epic `epic-friend` P5).
 * - Quiet when there's nothing to commit and nothing came of the sync;  safe to run twice.
 * - What Claude's other `Stop` hooks do stays Claude's:  the window move (`handoff.mjs`) and the inbox poller
 *   (`monitors/listen.mjs`).  Another agent waits for the person's next Send with `epic inbox wait <epic>`.
 * - Its position:  loaded by plain `node` too (the hooks import it by path, `.ts` and all), so it imports only what
 *   plain node can load;  `Shared`, which can't be, comes in only when a turn really ends (`end()`).
 ****************/
export class TurnEnd {
  /** the checkout the turn ended in:  its main checkout's config names the epic repo */
  readonly checkout: string

  constructor({ checkout = process.cwd() }: { checkout?: string } = {}) {
    this.checkout = checkout
  }

  /** Run `epic turn <args>`;  resolves to the exit code.  Throws `EpicCommandError` for a bad command line. */
  async run(args: string[]): Promise<number> {
    const { positional, flags } = parseVerbArgs(args, ["quiet"])
    const [verb] = positional
    if (verb !== "end") throw new EpicCommandError(`unknown verb '${verb ?? ""}':  epic turn end`)
    const report = await this.end({ session: stringFlag(flags.session) })
    if (!flags.quiet) for (const line of report.lines) process.stdout.write(`${line}\n`)
    return report.sync?.result === "conflict" ? EXIT.ERRORS : EXIT.OK
  }

  /**
   * End the turn:  commit the shared plans, and sync them (`Shared.sync()`).
   * - `lines`:  what to say;  none when nothing was committed and the sync found nothing to do
   * - in a repo not set up for epics, or with no epic repo yet:  nothing at all
   * - Save the epic pages off in Bells & Whistles (`bells.savePages`, epic `epic-engine` P86):  one line saying so
   * - SIDE EFFECT:  git commits in the epic repo;  with `contentRemote`, a pull and a push
   */
  async end({ session }: { session?: string } = {}): Promise<TurnEndReport> {
    const dir = TurnEnd.contentRepoOf(this.checkout)
    if (!dir) return { commits: [], lines: [] }
    if (!Bells.isOn("savePages", { cwd: this.checkout, content: dir }))
      return { commits: [], lines: [Bells.offLine("savePages")] }
    const tidied = this.tidy(dir)
    const { Shared, syncLines } = await import("./Shared")
    const { commits, sync } = await new Shared({ checkout: this.checkout }).sync({ session, checkout: this.checkout })
    const quiet = !commits.length && (!sync || sync.result === "up to date")
    return { commits, sync, lines: [...tidied, ...(quiet ? [] : syncLines(commits, sync))] }
  }

  /**
   * The end-of-turn tidy of the checkout's epic (epic `epic-engine` T78):  `epic stale <epic> --underway --apply`.
   * - only in an epic's worktree whose epic page exists;  at most once an hour per epic (a stamp in the epic repo's
   *   `.git/spell-tidy/`), so a burst of turns runs one git log, not many
   * - returns what it changed, a line each;  none for nothing
   * - NEVER throws:  a tidy that fails leaves the turn's end alone
   */
  tidy(dir: string, now = Date.now()): string[] {
    try {
      const epic = EpicConfig.ofSetUp(this.checkout)?.worktreeNameOf(this.checkout)
      if (!epic || !existsSync(join(dir, "epics", epic, `${epic}.plan.html`))) return []
      const stamps = join(dir, ".git", "spell-tidy")
      const stamp = join(stamps, epic)
      if (existsSync(stamp) && now - statSync(stamp).mtimeMs < TIDY_EVERY) return []
      mkdirSync(stamps, { recursive: true })
      writeFileSync(stamp, new Date(now).toISOString())
      const run = spawnSync(process.execPath, [EPIC, "stale", epic, "--underway", "--apply", "--quiet"], {
        cwd: this.checkout,
        encoding: "utf8",
        timeout: TIDY_TIMEOUT
      })
      return (run.stdout ?? "").split("\n").filter(Boolean)
    } catch {
      return []
    }
  }

  ////////////////
  // ## Statics:  the hooks' side
  ////////////////

  /**
   * The epic repo a turn in `checkout` commits:  its config's `contentFolder`, when the repo is set up for epics
   * (`EpicConfig.ofSetUp()`) and the folder is a git repo;  else `undefined`.
   * - NEVER throws:  a config that won't read is `undefined` too
   */
  static contentRepoOf(checkout: string): string | undefined {
    try {
      const dir = EpicConfig.ofSetUp(checkout)?.contentFolder
      return dir && existsSync(join(dir, ".git")) ? dir : undefined
    } catch {
      return undefined
    }
  }

  /**
   * What an agent's end-of-turn hook does with what it was handed on stdin (`{ session_id, cwd }`, Claude Code's and
   * Codex's alike):  start `epic turn end --quiet` in `cwd`, DETACHED, so the turn never waits for git.
   * - its output appended to `<epic repo>/.git/spell-shared.log`;  a failed commit never shows as a failed hook,
   *   and the next turn's picks up anything left
   * - only in a repo set up for epics whose epic repo exists (`contentRepoOf()`):  the hooks run in every repo
   * - `epic`:  this copy's `epic` command, with its packages installed (`EngineFiles.bin`)
   * - returns the command it started, else `undefined`
   * - NEVER throws
   */
  static inBackground(
    { session_id: session, cwd }: { session_id?: string; cwd?: string },
    { epic = EPIC }: { epic?: string } = {}
  ): string[] | undefined {
    try {
      const dir = cwd && TurnEnd.contentRepoOf(cwd)
      if (!cwd || !dir) return undefined
      const log = openSync(join(dir, ".git", "spell-shared.log"), "a")
      const args = [epic, "turn", "end", "--quiet", ...(session ? ["--session", session] : [])]
      spawn(process.execPath, args, { cwd, detached: true, stdio: ["ignore", log, log] }).unref()
      return args
    } catch {
      return undefined
    }
  }
}

/** What `TurnEnd.end()` did. */
export type TurnEndReport = {
  /** the new commits' short shas, in order */
  commits: string[]
  /** what the sync came to;  none without `contentRemote` */
  sync?: import("./SharedSync").SyncReport
  /** what to say, a line each;  none when there's nothing to say */
  lines: string[]
}

/** The `epic` command of this copy of the code (`EngineFiles.bin`). */
const EPIC = EngineFiles.bin

/** How often the end-of-turn tidy looks at one epic:  once an hour. */
const TIDY_EVERY = 3_600_000

/** How long it may take before the turn's end gives up on it. */
const TIDY_TIMEOUT = 60_000
