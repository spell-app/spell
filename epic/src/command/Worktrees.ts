import { spawnSync } from "node:child_process"
import { existsSync, lstatSync, mkdirSync, readFileSync } from "node:fs"
import { basename, dirname, join, relative, resolve } from "node:path"
import { pathToFileURL } from "node:url"

import { EpicConfig } from "$/epics/config/EpicConfig"
import { SessionFolders } from "$/epics/config/SessionFolders"
import { URGENT_STATES } from "$/epics/list/EpicState"

import {
  EXIT,
  EpicCommandError,
  bareTitle,
  parseVerbArgs,
  type CheckoutPlace,
  type IdleWorktree,
  type LiveSession,
  type MergeMainReport,
  type MoveReport,
  type NameStatus,
  type PlanFacts,
  type PlanSummary,
  type RunningSession
} from "./command.types"
import { Git } from "./Git"
import { MainMerge } from "./MainMerge"
import { Sessions } from "./Sessions"
import { Shared } from "./Shared"

/****************
 * ### `Worktrees`
 * `epic worktree <verb> ...`:  git worktrees, the sessions in them, and where a name stands.
 * `/worktrees`, `/isolate`, `/park` and `/wtf` use it.
 * - The verbs (`run()`):
 *   - `list [--json]`:  every live Claude Code session on this machine,
 *     with the worktree, branch and folder it works in, then this repo's worktrees no session is in
 *     - `<- this` marks the one that ran it
 *     - quick:  the whole report is `epic stock`
 *     - was `worktrees.py --sessions`
 *   - `status <name>`:  JSON:  where worktree / branch / plan / session `<name>` stands (`nameStatus()`)
 *     - was `status.py <name>`
 *   - `move <name> | --idle [--dry-run] [--json]`:  move a worktree (`--idle`:  every one no session works in)
 *     from the old place, `.claude/worktrees`, to the new one beside the repo (`move()`;  epic `epic-eject` P8)
 *   - `path <name>`:  worktree `<name>`'s folder, absolute (epic `epic-eject` P8)
 *     - where it is (the old place included), else where a new one goes (`EpicConfig.worktreeFolder()`)
 *     - what the skills give `EnterWorktree`
 *   - `merge-main [--continue] [--json]`:  merge `main` into this checkout's branch (`MainMerge`)
 *     - regenerates generated files (bundles, snapshots) both sides changed
 *     - exits 1 when other files conflict
 * - What the other groups read of worktrees and epic pages:  `nameStatus()`, `planFile()`, `planFacts()` ...
 * - git runs in the MAIN checkout (`main`):  branches are shared, so every worktree gets the same answer.
 ****************/
export class Worktrees {
  /** the repo's main checkout:  STATIC for the object's life */
  readonly main: string

  /** the sessions, for which work in which worktree */
  readonly sessions: Sessions

  /**
   * - `main`:  default the main checkout of the current folder's repo
   * - `sessions`:  default `new Sessions()`
   */
  constructor({ main = Git.mainRoot(), sessions = new Sessions() }: WorktreesProps = {}) {
    this.main = main
    this.sessions = sessions
  }

  /** the repo's `.epic/config.json5` */
  get config(): EpicConfig {
    return new EpicConfig(this.main)
  }

  ////////////////
  // ## The verbs
  ////////////////

  /** Run `epic worktree <args>`;  resolves to the exit code.  Throws `EpicCommandError` for a bad command line. */
  async run(args: string[]): Promise<number> {
    const { positional, flags } = parseVerbArgs(args, SWITCHES)
    const [verb = "list", name] = positional
    switch (verb) {
      case "list": {
        const sessions = this.sessions.live(this.main)
        const idle = this.idle(sessions)
        if (flags.json) out(JSON.stringify({ sessions, idle }, null, 2))
        else for (const line of Worktrees.table(sessions, idle)) out(line)
        return EXIT.OK
      }
      case "status":
        if (!name) throw new EpicCommandError("status:  which name?")
        out(JSON.stringify(this.nameStatus(name), null, 2))
        return EXIT.OK
      case "path":
        if (!name) throw new EpicCommandError("path:  which worktree?")
        out(this.config.worktreeFolder(name))
        return EXIT.OK
      case "move": {
        if (!name && !flags.idle) throw new EpicCommandError("move:  which worktree?  (or --idle:  every idle one)")
        const dryRun = Boolean(flags.dryRun)
        const reports = flags.idle ? this.moveIdle({ dryRun }) : [this.move(name!, { dryRun })]
        if (flags.json) out(JSON.stringify(reports, null, 2))
        else for (const line of reports.flatMap((report) => moveLines(report, dryRun))) out(line)
        if (!reports.length) out("no idle worktree in the old place:  nothing to move")
        return EXIT.OK
      }
      case "merge-main": {
        const checkout = Git.nearestCheckout(".git")
        const report = new MainMerge({ root: checkout }).run(flags.continue ? "continue" : "start")
        if (flags.json) out(JSON.stringify(report, null, 2))
        else for (const line of mergeMainLines(report)) out(line)
        return report.result === "conflicts" ? EXIT.ERRORS : EXIT.OK
      }
      default:
        throw new EpicCommandError(`unknown verb '${verb}':  list, status, path, move or merge-main`)
    }
  }

  ////////////////
  // ## Moving worktrees to the new place
  ////////////////

  /**
   * Move worktree `name` from the OLD place (`.claude/worktrees/<name>`)
   * to the new one (`worktreesFolder`, beside the repo:  epic `epic-eject` P8).
   * - returns what it did, or would do (`dryRun`)
   * - refuses (`EpicCommandError`):
   *   - while a live session works in it:  a busy worktree stays put until its `/isolate done`
   *   - when the config hasn't moved the place, or the new folder is taken
   * - the steps:
   *   1. `git worktree move`
   *   2. its shared links made again (`Shared.link()`):  they're relative, so the move breaks them
   *   3. its saved-session folder linked to main's (`linkSessionFolders`)
   * - its window file, if any (`workspaces/ongoing/<name>.code-workspace`), still names the old folder:
   *   the report says so;  `epic window close <name>`, then `open <name>`, makes the worktree-only window
   */
  move(name: string, { dryRun = false }: { dryRun?: boolean } = {}): MoveReport {
    const config = this.config
    const [place, old] = config.worktreesFolders
    if (!old) throw new EpicCommandError(`worktreesFolder is still ${place}:  set it beside the repo first`)
    const from = join(old, name)
    const to = config.newWorktreeFolder(name)
    if (!existsSync(join(from, ".git"))) throw new EpicCommandError(`no worktree ${name} in ${old}`)
    if (existsSync(to)) throw new EpicCommandError(`${to} is taken`)
    const busy = this.sessions.live(this.main).find((session) => inFolder(session.cwd, from))
    if (busy)
      throw new EpicCommandError(
        `a session works in ${name} (pid ${busy.pid}):  it moves at its /isolate done, not now`
      )
    const window = join(this.main, "workspaces", "ongoing", `${name}.code-workspace`)
    const report: MoveReport = { name, from, to, links: [], sessionFolder: null, window: existsSync(window) }
    if (dryRun) return report
    mkdirSync(dirname(to), { recursive: true })
    const moved = Git.run(["worktree", "move", from, to], this.main)
    if (!moved.ok) throw new EpicCommandError(`git worktree move ${from} ${to} failed:  ${moved.err}`)
    const shared = new Shared({ checkout: to })
    report.links = shared.link(to, Shared.configOf(to).links).map(({ path, action }) => `${path} ${action}`)
    if (config.linkSessionFolders) report.sessionFolder = SessionFolders.link(to, this.main).action
    return report
  }

  /** `move --idle`:  move every worktree in the old place that no session works in;  a report each. */
  moveIdle({ dryRun = false }: { dryRun?: boolean } = {}): MoveReport[] {
    const old = this.config.worktreesFolders[1]
    if (!old) return []
    return this.idle(this.sessions.live(this.main))
      .filter(({ path }) => inFolder(path, old) && path !== old)
      .map(({ path }) => this.move(basename(path), { dryRun }))
  }

  ////////////////
  // ## Where sessions work
  ////////////////

  /**
   * Each worktree in the worktrees' folders:  `{ name, path, branch }`.
   * - the folders:  `.claude/worktrees/`, or beside the repo and the old place too (`EpicConfig.worktreesFolders`)
   */
  named(): { name: string; path: string; branch: string }[] {
    const roots = this.config.worktreesFolders
    return Worktrees.listOf(this.main)
      .filter((it) => roots.some((root) => it.path.startsWith(`${root}/`)) && it.branch !== "(detached)")
      .map((it) => ({ name: basename(it.path), path: it.path, branch: it.branch }))
  }

  /** Each worktree in the worktrees' folder that no session in `sessions` works in. */
  idle(sessions: LiveSession[]): IdleWorktree[] {
    return this.named()
      .filter(({ path }) => !sessions.some((session) => inFolder(session.cwd, path)))
      .map(({ path, branch }) => ({ path, branch }))
  }

  /** The live sessions that started in this repo (its main checkout or a worktree), by registry file. */
  repoSessions(): RunningSession[] {
    const main = this.main
    return [...this.sessions.running().values()].filter(
      (record) => record.cwd === main || record.cwd?.startsWith(`${main}/`)
    )
  }

  ////////////////
  // ## Where a name stands
  ////////////////

  /**
   * Where session / worktree / plan `name` stands, for `/park`, `/unpark`, `/wait-for` (was `status.py <name>`).
   * - `name` resolves as `/wtf <name>` does:
   *   worktree `.claude/worktrees/<name>`, branch `<name>`, epic page `epics/<name>/`,
   *   and the sessions titled `<name>` or that worked in that worktree
   * - `ids`:  its session ids when already known:  finding them reads every transcript, so `park wait` finds them once
   */
  nameStatus(name: string, ids?: string[]): NameStatus {
    const main = this.main
    const config = this.config
    const worktree = config.worktreeFolder(name)
    const branch = Git.run(["rev-parse", "--verify", "--quiet", `refs/heads/${name}`], main).ok ? name : null
    const ahead = branch ? Number(Git.run(["rev-list", "--count", `${config.baseBranch}..${name}`], main).out || 0) : 0
    const reflog = branch ? Git.run(["reflog", "show", "--format=%H", `refs/heads/${name}`], main).out : ""
    const moved = reflog.split("\n").filter(Boolean).length > 1
    const merged = !!branch && moved && ahead === 0
    const plan = this.planStatus(name, worktree)
    const live = this.repoSessions()
    if (ids === undefined) {
      ids = this.sessions.named(name).map((it) => it.id)
      for (const record of live)
        if (!ids.includes(record.sessionId) && this.goesBy(record, name)) ids.push(record.sessionId)
    }
    const pids = new Map(live.map((record) => [record.sessionId, record.pid]))
    // a STANDING epic (epic `epic-workflow`) merges after every phase, and is never finished
    const file = plan.folder ? this.planFile(name, worktree) : null
    const standing = !!file && existsSync(file) && Worktrees.planFacts(file).standing
    const why = standing ? null : merged ? "merged into main" : plan.done ? "plan all done" : null
    return {
      name,
      worktree: existsSync(worktree) ? worktree : null,
      branch,
      ahead,
      merged,
      plan: plan.folder,
      planDone: plan.done,
      sessions: ids.map((id) => ({
        id,
        title: this.sessions.title(id),
        running: pids.has(id),
        pid: pids.get(id) ?? null
      })),
      finished: !!why,
      why
    }
  }

  /**
   * Epic page `name`:  its folder, and whether every phase is done, from `planSummaries()`.
   * - its live copy:  the worktree's when it has one, else the main checkout's (`planFile()`)
   */
  planStatus(name: string, worktree: string): { folder: string | null; done: boolean } {
    const file = this.planFile(name, worktree)
    if (!file) return { folder: null, done: false }
    const phases = this.planSummaries([file]).get(file)?.phases ?? []
    return { folder: dirname(file), done: phases.length > 0 && phases.every((phase) => phase.status === "done") }
  }

  /**
   * Epic page `name`'s live copy:  the worktree's when it has one, else the main checkout's;  or `null`.
   * - in each:  `<name>.plan.html`, else an old `<name>.html` that is an epic page (`<body class="... plan-doc">`)
   *   - epic pages were renamed on 2026-10-04, and worktrees cut before keep the old name until they merge `main`
   *   - `src/tools/pages.js` `planDocIn()` is the same
   * - which folder:  `epicsDir()`, old layout included
   */
  planFile(name: string, worktree: string): string | null {
    for (const root of [worktree, this.main]) {
      const folder = join(Worktrees.epicsDir(root), name)
      const file = join(folder, `${name}.plan.html`)
      if (existsSync(file)) return file
      const old = join(folder, `${name}.html`)
      if (existsSync(old) && /<body\b[^>]*\bclass="[^"]*\bplan-doc\b/.test(readFileSync(old, "utf8"))) return old
    }
    return null
  }

  /**
   * The summaries of the epic pages at `files` (absolute),
   * the ones not read yet in ONE `plan-doc summaries` run.
   * - a file it can't read is left out
   * - runs the `epic` tool of THIS code's checkout when it's installed, else the main checkout's:
   *   a worktree's copy needn't be installed, and the tool reads by path from any checkout
   * - `<epic-*>` docs only:  the tool refuses a doc in the old markup,
   *   which comes back `{ error }` and is left out, as is any other doc it can't read
   * - SIDE EFFECT:  cached in `PLAN_SUMMARIES` for the rest of the run
   *   - pass every file up front to read them in one go (the tool takes ~0.5s to start)
   */
  planSummaries(files: string[]): Map<string, PlanSummary> {
    const todo = files.filter((file) => !PLAN_SUMMARIES.has(file))
    const root = [Git.CODE_ROOT, this.main].find((it) => existsSync(join(it, "node_modules")))
    if (todo.length && root) {
      const loader = pathToFileURL(join(root, "node_modules", "tsx", "dist", "loader.mjs")).href
      // the docs tools, and the tsconfig they run on:  spell-epic's `src/tools/` (epic `epic-eject` J14);  else a
      // spell-app checkout's package, `epics` since epic `people-and-orgs` P16, `docs` on a checkout from before
      const [tools, tsconfig] = [
        [join(root, "src", "tools"), join(root, "tsconfig.json")],
        ...["epics", "docs"].map((name) => [
          join(root, "packages", name, "tools"),
          join(root, "packages", name, "tsconfig.json")
        ])
      ].find(([folder]) => existsSync(join(folder!, "plan-doc.js"))) ?? [
        join(root, "tools"),
        join(root, "tsconfig.json")
      ]
      const run = spawnSync(process.execPath, ["--import", loader, join(tools!, "plan-doc.js"), "summaries", ...todo], {
        cwd: root,
        encoding: "utf8",
        env: { ...process.env, TSX_TSCONFIG_PATH: tsconfig }
      })
      try {
        const found = JSON.parse(run.stdout) as Record<string, PlanSummary | { error: string }>
        for (const [file, summary] of Object.entries(found))
          if (!("error" in summary)) PLAN_SUMMARIES.set(file, summary)
      } catch {
        // the tool failed:  every plan reads as not done
      }
    }
    return new Map(files.filter((file) => PLAN_SUMMARIES.has(file)).map((file) => [file, PLAN_SUMMARIES.get(file)!]))
  }

  /**
   * Whether running session `record` goes by `name`:
   * its title (its icon left out:  `🚧 <name>`), its registry name, or its id's start.
   */
  private goesBy(record: RunningSession, name: string): boolean {
    const title = this.sessions.title(record.sessionId)
    return (title !== null && bareTitle(title) === name) || record.name === name || record.sessionId.startsWith(name)
  }

  ////////////////
  // ## Statics:  any checkout, any epic page
  ////////////////

  /**
   * The checkout holding `cwd` (`CheckoutPlace`):  its root, label, branch, and where `cwd` is inside it.
   * - static:  any folder, in any repo
   */
  static checkoutOf(cwd: string): CheckoutPlace {
    const top = Git.run(["rev-parse", "--show-toplevel"], cwd)
    if (!top.ok) return { label: "(not in git)", branch: "", inside: cwd }
    const root = top.out
    const label = resolve(root) === resolve(Git.mainRoot(cwd)) ? "main checkout" : `worktree ${basename(root)}`
    const branch = Git.run(["branch", "--show-current"], cwd).out || "(detached)"
    const inside = relative(root, cwd)
    return { root, label, branch, inside }
  }

  /**
   * Every worktree of the repo at `root`, main checkout first:  `{ path, branch }` (`(detached)` without one).
   * - static:  any repo
   */
  static listOf(root: string): { path: string; branch: string }[] {
    const found: { path: string; branch: string }[] = []
    for (const line of Git.run(["worktree", "list", "--porcelain"], root).out.split("\n")) {
      if (line.startsWith("worktree ")) found.push({ path: line.slice(9), branch: "(detached)" })
      else if (line.startsWith("branch ") && found.length)
        found.at(-1)!.branch = line.slice(7).replace(/^refs\/heads\//, "")
    }
    return found
  }

  /**
   * What epic page `file`'s state is read from (`$/epics/list/EpicState` `EpicFacts`),
   * from its skeleton's markup, with no parsing library (`PlanFacts`).
   * - `phases`:  each `<epic-phase status>`
   * - `updated`, `future`, `standing`:  `<epic-page updated future standing>`
   * - `urgent`:  the ids of the items that need Owen (`<epic-item state>`, `URGENT_STATES`:  red and orange chips)
   * - a doc still in the old markup (one restored from an old backup) reads as empty:
   *   the `epic` tool refuses it until it's converted (epic `epic-components` P15)
   * - static:  one file, wherever it is
   */
  static planFacts(file: string): PlanFacts {
    const html = readFileSync(file, "utf8")
    const tags = (name: string) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "g"))].map((match) => match[0])
    const attribute = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1]
    const page = tags("epic-page")[0] ?? ""
    const urgent = tags("epic-item")
      .filter((tag) => (URGENT_STATES as readonly string[]).includes(attribute(tag, "state") ?? ""))
      .map((tag) => attribute(tag, "id") ?? "")
      .filter(Boolean)
    return {
      phases: tags("epic-phase").map((tag) => attribute(tag, "status") ?? "todo"),
      updated: attribute(page, "updated") ?? null,
      future: /\sfuture\b/.test(page),
      standing: /\sstanding\b/.test(page),
      urgent
    }
  }

  /**
   * The folder checkout `root`'s epic pages are in:  `epics/` in its repo's content folder (`EpicConfig.contentOf()`,
   * epic `epic-eject` P12), shared by every checkout.
   * - a checkout with epic pages of its OWN first (a worktree on older code, until it merges `main`):  a real folder,
   *   not a link, at `epics`, `packages/docs/content/epics` or `packages/docs/epics`
   * - static:  any checkout
   */
  static epicsDir(root: string): string {
    const own = ["epics", "packages/docs/content/epics", "packages/docs/epics"].map((path) => join(root, path))
    const real = own.find((dir) => lstatSync(dir, { throwIfNoEntry: false })?.isDirectory())
    return real ?? join(EpicConfig.contentOf(root), "epics")
  }

  /**
   * The sessions as a text table, then the worktrees no session is in, then a blank line:
   * `epic worktree list`, and the top of `epic stock`'s report.
   * - the table's columns:  title, agent, id, status, where, worktree, branch, folder
   * - `<- this` marks the one that ran it
   * - static:  pure
   */
  static table(sessions: LiveSession[], idle: IdleWorktree[]): string[] {
    const head = ["session", "agent", "id", "status", "where", "worktree", "branch", "folder"]
    const rows = sessions.map((session) => [
      `${session.name}${session.this ? "  <- this" : ""}`,
      session.agent ?? "",
      session.id.slice(0, 8),
      `${session.state}${session.waitingFor ? ` (${session.waitingFor})` : ""}`,
      session.where ?? "?",
      session.checkout,
      session.branch,
      session.folder
    ])
    const widths = head.map((_, column) => Math.max(...[head, ...rows].map((row) => row[column]!.length)))
    const lines = [head, widths.map((width) => "-".repeat(width)), ...rows].map((row) =>
      row
        .map((cell, column) => cell.padEnd(widths[column]!))
        .join("  ")
        .trimEnd()
    )
    if (idle.length) lines.push("", "No session in:", ...idle.map((it) => `  ${it.path}  [${it.branch}]`))
    return [...lines, ""]
  }
}

/** What `new Worktrees()` takes. */
export type WorktreesProps = {
  /** the repo's main checkout */
  main?: string
  /** the sessions, for which work in which worktree */
  sessions?: Sessions
}

/** The flags of `epic worktree` that take no value. */
const SWITCHES = ["json", "continue", "idle", "dryRun"]

/**
 * `planSummaries()`'s cache:  `{ file:  summary }`, for this process.
 * - module-wide:  every `Worktrees` in one run reads a page once
 */
const PLAN_SUMMARIES = new Map<string, PlanSummary>()

/** Write `text` to stdout, on its own line. */
function out(text: string): void {
  process.stdout.write(text.endsWith("\n") ? text : `${text}\n`)
}

/** Whether `path` is `folder` or inside it. */
function inFolder(path: string, folder: string): boolean {
  return path === folder || path.startsWith(`${folder}/`)
}

/** `move`'s lines for one worktree:  the move, its links, its session folder, its window file. */
function moveLines(report: MoveReport, dryRun: boolean): string[] {
  const { name, from, to, links, sessionFolder, window } = report
  return [
    `${dryRun ? "would move" : "moved"} ${name}:  ${from} -> ${to}`,
    ...(links.length ? [`  shared links:  ${links.join(", ")}`] : []),
    ...(sessionFolder ? [`  session folder:  ${sessionFolder}`] : []),
    ...(window
      ? [`  its window file names the old folder:  epic window close ${name}, then epic window open ${name}`]
      : [])
  ]
}

/** `merge-main`'s report, for a person. */
function mergeMainLines(report: MergeMainReport): string[] {
  const { branch, result, conflicts, untracked, regenerated, review, unstaged } = report
  if (result === "up-to-date") return [`${branch}:  main is already in it`]
  if (result === "fast-forward") return [`${branch}:  fast-forwarded to main`]
  if (result === "conflicts") {
    return [
      `${branch}:  stopped mid-merge;  resolve these, \`git add\` them, then \`epic worktree merge-main --continue\`:`,
      ...conflicts.map((file) => `  ${file}`)
    ]
  }
  return [
    `${branch}:  merged main`,
    ...(untracked.length ? [`  untracked ${untracked.length} file(s) now git-ignored (kept on disk)`] : []),
    ...regenerated.map(({ name, files }) => `  regenerated ${name}:  ${files.length} file(s)`),
    ...review.flatMap(({ file, keys }) => [
      `  REVIEW ${file}:  neither side had these values`,
      ...keys.map((key) => `    ${key}`)
    ]),
    ...(unstaged.length ? ["  changed by regenerating, NOT committed:", ...unstaged.map((file) => `    ${file}`)] : [])
  ]
}
