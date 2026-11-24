import { spawn } from "node:child_process"
import { existsSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { SRV } from "spell/server"
import { Git } from "spell/server/Git"
import { Shared } from "spell/epic/command/Shared"
import { EngineFiles } from "spell/epic/config/EngineFiles.mjs"
import { EpicConfig } from "spell/epic/config/EpicConfig"
import { DataFile } from "spell/epic/data/DataFile"
import { FAVORITES_FILE, favoritesIn } from "spell/epic/list/EpicCards"
import { URGENT_SELECTOR } from "spell/epic/list/EpicState"
import { PhaseStatuses } from "spell/epic/phases"

// the facts' shape:  the card's family's types file (data only), which the page reads them by
import type { EpicManageFacts } from "spell/epic/components/epic-list/EpicList.types"

import { PlanDocCommands } from "./PlanDocCommands"
import { PlanDocFiles } from "./PlanDocFiles"

/****************
 * ### `EpicLifecycle`
 * What an epic's card menu does to a whole epic, on the Epics page (epic `epic-engine` T103;  Owen:  "on the epic
 * home page cards, add a `...` menu in the TR corner, with Resume, Rename Epic..., Complete, Delete Epic..."):
 * - `resume()`:  its session resumed in its own VS Code window, as `/epic resume <name>` from another window does
 *   (`epic window launch <name> --prompt "/epic resume <name>"`, run as a program)
 * - `rename()`:  its folder in the epic repo, its files named for it, the links to it, the favourites and the tooling
 *   home follow
 * - `complete()`:  marked done the way the tooling already reads "done" (`EpicState`):  every phase left dropped, every
 *   item waiting on Owen canceled, a standing epic standing no more
 * - `remove()`:  its folder deleted from the epic repo, which keeps it in its history
 * - `facts()`:  what the page asks first, for its dialogs:  is it blocked, what's left
 *
 * Refusals, each a `SRV.HttpError` whose message the page shows as it is (the novice voice):
 * - rename and delete:  the epic has a worktree, or a branch with work not on the base branch (`blocker()`);
 *   renaming those is git work on a checkout someone may be in, so it's left to `/epic done` first
 * - delete:  the tooling home (`epics/home.json5`):  every session's tooling requests go there
 * - resume:  a finished epic
 *
 * - Both halves use it:  the page server's routes (`epicRoutes.ts`) and the command line, `epic rename | complete |
 *   delete` (`run()`).
 * - Node only:  the epic page tool (`PlanDocCommands`), git, the epic repo's commit (`Shared`)
 ****************/
export class EpicLifecycle {
  /** the checkout:  its repo's config (worktrees, branches) and epic folder */
  readonly root: string

  /** the epic page tool, its output dropped:  the page shows what happened */
  readonly commands: PlanDocCommands

  /** `epics/`, in the epic folder */
  readonly epics: string

  /**
   * Runs the `epic` command with `args`, in `root`:  its exit code and what it printed.
   * - a test passes its own:  nothing opens a real window
   */
  readonly runEpic: EpicRunner

  /**
   * Commits whatever changed in the epic repo (`Shared.commit()`), so a rename or a delete is its own commit, with
   * everything before it saved first;  a test passes a no-op
   */
  readonly commitShared: () => void

  constructor({ root, content, runEpic, commitShared }: EpicLifecycleProps) {
    this.root = root
    const files = new PlanDocFiles({ root, ...(content && { content }) })
    this.commands = new PlanDocCommands({ files })
    this.commands.print = () => {}
    this.epics = files.epics
    this.runEpic = runEpic ?? ((args) => runEpicProgram(root, args))
    this.commitShared = commitShared ?? (() => void new Shared({ checkout: root }).commit())
  }

  ////////////////
  // ## Reading
  ////////////////

  /**
   * What the card's dialogs say, for epic `name`:  why it can't be renamed or deleted (`blocked`), whether it's done,
   * its phases left and the items that need Owen.
   * - throws `HttpError(404)` with no such epic
   */
  facts(name: string): EpicManageFacts {
    const plan = this.commands.files.read(this.pageOf(name))
    const left = plan.phases.filter((phase) => !PhaseStatuses.isFinished(phase.status))
    const needsYou = Array.from(plan.document.querySelectorAll(URGENT_SELECTOR), (item) => item.id.toUpperCase())
    return {
      epic: name,
      blocked: this.blocker(name),
      done: plan.phases.length > 0 && !left.length && !needsYou.length && !plan.standing,
      phases: plan.phases.length,
      phasesLeft: left.length,
      needsYou,
      standing: plan.standing,
      home: this.home() === name
    }
  }

  /**
   * Why epic `name` can't be renamed or deleted now, in words for the page;  `undefined` when it can.
   * - its worktree is there (`EpicConfig.worktreeFolder()`):  someone may be working in it
   * - its branch has commits the base branch hasn't:  work that would be lost, or left under the old name
   */
  blocker(name: string): string | undefined {
    const config = EpicConfig.of(this.root)
    if (existsSync(config.worktreeFolder(name)))
      return (
        `Claude is still working on ${name} in its own VS Code window.\n` +
        "To finish it, type /epic done in the chat with Claude in that window.\nThen come back here and try again."
      )
    const branch = `refs/heads/${config.branchOf(name)}`
    if (!Git.run(["rev-parse", "--verify", "--quiet", branch], config.main).ok) return undefined
    const ahead = Number(Git.out(["rev-list", "--count", `${config.baseBranch}..${branch}`], config.main) ?? 0)
    if (ahead > 0)
      return (
        `Claude made ${ahead} change${ahead === 1 ? "" : "s"} for ${name} that ` +
        `${ahead === 1 ? "hasn't" : "haven't"} been added to your project's main files yet.\nAsk Claude to add ${ahead === 1 ? "it" : "them"}, ` +
        `or to throw ${ahead === 1 ? "it" : "them"} away.\nThen come back here and try again.`
      )
    return undefined
  }

  ////////////////
  // ## The four actions
  ////////////////

  /**
   * Resume epic `name` in its own VS Code window:  `epic window launch <name> --prompt "/epic resume <name>"`, run as a
   * program;  resolves to what it said.
   * - it wakes the epic's running session, starts one in its open window, or makes the worktree and window first
   * - throws `HttpError(409)` for a finished epic;  `HttpError(500)` when the launch fails, with what it said
   */
  async resume(name: string): Promise<string> {
    if (this.facts(name).done) throw new SRV.HttpError(409, `${name} is complete.  There's nothing to resume.`)
    const { code, out } = await this.runEpic(["window", "launch", name, "--prompt", `/epic resume ${name}`])
    if (code !== 0) throw new SRV.HttpError(500, out.trim() || `Couldn't open ${name} (exit ${code}).`)
    return out.trim()
  }

  /**
   * Rename epic `from` to `to`;  resolves to the new epic page's URL path (`/epics/<to>/<to>.plan.html`).
   * - its folder moves, and each file in it named for it (`<from>.plan.html`, `<from>.inbox.json5` ...)
   * - its page's `<epic-page epic>` follows;  so does every link to it in the epic folder's pages (`retarget()`)
   * - the favourites and the tooling home follow;  its log says what it was called
   * - SIDE EFFECT:  the epic repo committed before and after (`commitShared`);  the list pages rebuilt
   * - throws `HttpError`:  400 a name that isn't one, 404 no such epic, 409 taken or blocked (`blocker()`)
   */
  async rename(from: string, to: string): Promise<string> {
    if (!EPIC_NAME.test(to))
      throw new SRV.HttpError(400, `"${to}" can't be an epic's name.  Use lowercase letters, numbers and dashes.`)
    this.pageOf(from)
    if (to === from) throw new SRV.HttpError(400, `It's called ${from} already.`)
    if (existsSync(join(this.epics, to))) throw new SRV.HttpError(409, `There's already an epic called ${to}.`)
    this.refuseBlocked(from)
    this.commitShared()
    renameSync(join(this.epics, from), join(this.epics, to))
    const folder = join(this.epics, to)
    for (const file of readdirSync(folder))
      if (file.startsWith(`${from}.`)) renameSync(join(folder, file), join(folder, to + file.slice(from.length)))
    this.retarget(from, to)
    await editFavorites(this.content, (favorites) => favorites.delete(from) && favorites.add(to))
    if (this.home() === from) DataFile.write(this.homeFile, { ...DataFile.read<object>(this.homeFile), epic: to })
    await this.tool(["log", to, `Renamed from ${from} (from the Epics page)`])
    this.commands.files.reindex()
    this.commitShared()
    return `/epics/${to}/${to}.plan.html`
  }

  /**
   * Mark epic `name` complete:  every phase not finished dropped, every item waiting on Owen canceled, standing off;
   * resolves to what it changed.
   * - "done" is read off those (`EpicState`):  no flag of its own, so every list and page agrees at once
   * - throws `HttpError(409)` for an epic with no phases:  nothing to finish (delete it instead)
   */
  async complete(name: string): Promise<CompleteResult> {
    const facts = this.facts(name)
    if (!facts.phases)
      throw new SRV.HttpError(409, `${name} has no phases yet, so there's nothing to finish.  Delete it instead.`)
    const plan = this.commands.files.read(this.pageOf(name))
    const dropped = plan.phases.filter((phase) => !PhaseStatuses.isFinished(phase.status)).map((phase) => phase.id)
    for (const id of dropped) await this.tool(["phase", name, id, "dropped", "--why", COMPLETED, "--no-open"])
    for (const id of facts.needsYou) await this.tool(["cancel", name, id.toLowerCase(), COMPLETED])
    if (facts.standing) await this.tool(["standing", name, "off"])
    await this.tool(["log", name, COMPLETED])
    return { dropped, canceled: facts.needsYou }
  }

  /**
   * Delete epic `name`:  its folder in the epic repo, and its star.
   * - the epic repo committed first, so its history keeps every file git tracks;  then the delete is its own commit
   * - throws `HttpError`:  404 no such epic, 409 blocked (`blocker()`) or the tooling home
   */
  async remove(name: string): Promise<void> {
    this.pageOf(name)
    if (this.home() === name)
      throw new SRV.HttpError(409, `${name} is where tooling requests go, so it can't be deleted.`)
    this.refuseBlocked(name)
    this.commitShared()
    rmSync(join(this.epics, name), { recursive: true, force: true })
    await editFavorites(this.content, (favorites) => favorites.delete(name))
    this.commands.files.reindex()
    this.commitShared()
  }

  ////////////////
  // ## The command line
  ////////////////

  /**
   * `epic rename <old> <new>`, `epic complete <epic>`, `epic delete <epic>`:  `args` from the verb on;  resolves to the
   * exit code.  A refusal is printed, exit 1.
   */
  async run([verb, name = "", to = ""]: string[]): Promise<number> {
    try {
      if (verb === "rename") console.log(`renamed ${name} to ${to}:  ${await this.rename(name, to)}`)
      else if (verb === "complete") {
        const { dropped, canceled } = await this.complete(name)
        console.log(`${name} complete:  ${dropped.length} phase(s) dropped, ${canceled.length} item(s) canceled`)
      } else if (verb === "delete") {
        await this.remove(name)
        console.log(`deleted ${name}:  the epic repo's history keeps it`)
      } else throw new SRV.HttpError(400, `epic ${verb ?? ""}:  rename, complete or delete`)
      return 0
    } catch (error) {
      if (!(error instanceof SRV.HttpError)) throw error
      console.error(error.message)
      return 1
    }
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** The epic folder. */
  private get content(): string {
    return this.commands.files.content
  }

  /** Epic `name`'s page;  throws `HttpError` 400 for a name that isn't one, 404 for no such epic. */
  private pageOf(name: string): string {
    if (!EPIC_NAME.test(name)) throw new SRV.HttpError(400, `"${name}" isn't an epic's name.`)
    const file = PlanDocFiles.planDocIn(join(this.epics, name), name)
    if (!file) throw new SRV.HttpError(404, `There's no epic called ${name}.`)
    return file
  }

  /** Throws `HttpError(409)` with `blocker()`'s words, when epic `name` has a blocker. */
  private refuseBlocked(name: string): void {
    const blocked = this.blocker(name)
    if (blocked) throw new SRV.HttpError(409, blocked)
  }

  /** Run the epic page tool;  throws `HttpError(500)` when it fails. */
  private async tool(argv: string[]): Promise<void> {
    if ((await this.commands.run(argv)) !== 0)
      throw new SRV.HttpError(500, `\`epic ${argv.slice(0, 2).join(" ")}\` failed`)
  }

  /** The tooling home (`epics/home.json5`):  the epic dev-tooling requests go to;  `undefined` for none. */
  private home(): string | undefined {
    try {
      const epic = DataFile.read<{ epic?: unknown }>(this.homeFile)?.epic
      return typeof epic === "string" ? epic : undefined
    } catch {
      return undefined
    }
  }

  /** Where the tooling home is kept (`Requests.home()`'s file). */
  private get homeFile(): string {
    return join(this.epics, `home${DataFile.SUFFIX}`)
  }

  /**
   * Every page in the epic folder that points at epic `from`, pointed at `to`:  each `.html` and `.json5` file under
   * it (not `.git`, nor a dot folder), rewritten only where it changed.
   * - its page's path (`epics/<from>/`, `<from>/<from>.plan.html`), its files' names (`<from>.inbox.json5` ...),
   *   and an `epic="<from>"` attribute (`<epic-page>`, `<epic-link>`, `<epic-card>`)
   * - prose saying its old name is left as written:  a log line says when it changed
   */
  private retarget(from: string, to: string): void {
    const rules: [RegExp, string][] = [
      [new RegExp(`epics/${escaped(from)}/`, "g"), `epics/${to}/`],
      [new RegExp(`(?<![\\w-])${escaped(from)}/${escaped(from)}\\.`, "g"), `${to}/${to}.`],
      [new RegExp(`(?<![\\w-])${escaped(from)}\\.(plan\\.html|inbox\\.json5|instant-undo\\.json5)`, "g"), `${to}.$1`],
      [new RegExp(`(\\sepic=")${escaped(from)}"`, "g"), `$1${to}"`]
    ]
    for (const file of pagesUnder(this.content)) {
      const text = readFileSync(file, "utf8")
      const changed = rules.reduce((each, [rule, swap]) => each.replace(rule, swap), text)
      if (changed !== text) writeFileSync(file, changed)
    }
  }
}

/**
 * Edit the favourites (`FAVORITES_FILE`) in epic folder `content`;  resolves to every starred epic's name after,
 * sorted.
 * - SIDE EFFECT:  writes the file through the page server's one safe write (`SRV.FileOperations.save()`:  read and
 *   written under its lock, all at once), keeping a comment added to it by hand (`DataFile.edited()`);  its old
 *   `favorites.json` read, then removed
 */
export async function editFavorites(content: string, edit: (favorites: Set<string>) => unknown): Promise<string[]> {
  let list: string[] = []
  const file = join(content, FAVORITES_FILE)
  await SRV.FileOperations.save(file, (current) =>
    DataFile.edited<unknown>(file, current, (read) => {
      const favorites = favoritesIn(read)
      edit(favorites)
      list = [...favorites].sort()
      return list
    })
  )
  DataFile.removeOld(file)
  return list
}

/** Options for `EpicLifecycle`:  `root` the checkout;  the rest as its fields (`content`:  `PlanDocFiles`'). */
export type EpicLifecycleProps = {
  root: string
  content?: string
  runEpic?: EpicRunner
  commitShared?: () => void
}

/** Runs the `epic` command:  its exit code and its output, stdout and stderr together. */
export type EpicRunner = (args: string[]) => Promise<{ code: number; out: string }>

/** What `complete()` changed:  the phases dropped (their ids) and the items canceled (`Q3` ...). */
export type CompleteResult = { dropped: string[]; canceled: string[] }

/** An epic's name:  lower-kebab-case, as the epics' folders are called. */
const EPIC_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** The reason on what `complete()` drops and cancels, and its log line. */
const COMPLETED = "Completed from the Epics page"

/** Longest a resume may take, ms:  making a worktree and a window is slow;  a hung one never holds the server. */
const RESUME_TIMEOUT = 120_000

/** `text` for a `RegExp`, every special character escaped. */
function escaped(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Every `.html` and `.json5` file under `folder`, dot folders left out. */
function pagesUnder(folder: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue
    const path = join(folder, entry.name)
    if (entry.isDirectory() || (entry.isSymbolicLink() && statSync(path, { throwIfNoEntry: false })?.isDirectory()))
      found.push(...(entry.isSymbolicLink() ? [] : pagesUnder(path)))
    else if (/\.(html|json5)$/.test(entry.name)) found.push(path)
  }
  return found
}

/**
 * The `epic` command (`EngineFiles.bin`) run with `args` in checkout `root`, as a child `node`:  its exit code and
 * output.
 * - not as this process's session:  `CLAUDE_CODE_SESSION_ID` dropped, so a launch never tries to move it
 * - NEVER throws:  a failure to start is exit `-1`
 */
function runEpicProgram(root: string, args: string[]): Promise<{ code: number; out: string }> {
  const env = { ...process.env }
  delete env.CLAUDE_CODE_SESSION_ID
  return new Promise((resolve) => {
    let out = ""
    const child = spawn(process.execPath, [EngineFiles.bin, ...args], { cwd: root, env, timeout: RESUME_TIMEOUT })
    child.stdout.on("data", (chunk) => (out += chunk))
    child.stderr.on("data", (chunk) => (out += chunk))
    child.on("error", (error) => resolve({ code: -1, out: error.message }))
    child.on("close", (code) => resolve({ code: code ?? -1, out }))
  })
}
