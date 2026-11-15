/**
 * The RUNNING-AGENTS LIST of an epic or a checkout (epic `skillz`):
 * every background agent a Claude session started (`/bg`, or on its own), by name, while it runs.
 * - the file:
 *   - in an epic:  `epics/<epic>/agents.json5`, beside the epic page (in the epic repo;  git-ignored in the epic repo)
 *   - else:  `<checkout root>/.spell-agents.json5` (git-ignored in spell-app)
 *   - JSON5, saved keeping any comment added by hand (`DataFile`, epic `epic-workflow` P21)
 *   - its old `.json` name is read while there's no `.json5`, and removed by the next write
 * - names carry a PREFIX:  the epic's name, else the worktree's, else `main`
 *   - `add("aaa")` in epic `skillz` is `skillz-aaa`
 *   - every method takes the short name or the full one
 * - writers:
 *   - `epic agents` (`agents.ts`):  sessions and their helpers, at the same time
 *   - the page server's route (`agentRoutes.ts`):  Owen's redirect notes from the epic page's Agents box
 *   - Every write is under the file's lock (`SRV.FileLock`), and atomic (a temp file renamed over it),
 *     as the review inbox's (`ReviewInbox`).
 * - REDIRECTS:  a note Owen sends a running agent from the page waits in its entry, untold,
 *   until a session waiting on the list (`epic agents wait`) passes it on (`SendMessage`) and marks it `told()`
 * - CLAIMS (epic `epic-engine` T77):  the files an agent is changing, paths from the checkout's root, a folder or a
 *   glob each (`epic/src/components/__pack/`, `epic/src/tools/_assets/**`):
 *   - two running agents never claim the same file:  `claim()` refuses one that overlaps another's, naming it
 *   - a merge never moves aside a file a running agent claims (`claimOf()`, `StrayFiles.checkClaims()`)
 *   - they go with the agent (`done()`)
 * - an agent leaves the list when it finishes (`done()`):  the list is what's RUNNING;  empty, the file goes
 * - NOT in the record:  the epic page says what agents DID;  this says what they're doing now
 */
import { existsSync, readFileSync } from "node:fs"
import { basename, dirname, join, matchesGlob, resolve } from "node:path"

import { EpicConfig } from "spell/epic/config/EpicConfig"
import { DataFile } from "spell/epic/data/DataFile"
import { SRV } from "spell/server"

export class AgentList {
  /** the list's file */
  readonly file: string

  /**
   * what every agent's name starts with, before its `-`:  the epic's name, else the worktree's, else `main`
   * (`MAIN_PREFIX`:  the main checkout's, not a branch)
   */
  readonly prefix: string

  /**
   * The list for checkout `root`.
   * - `epic`:  the epic it's for;  default:  the worktree's name, when `epics/<name>/<name>.plan.html` is there, in
   *   the repo's epic folder (`EpicConfig.contentOf()`)
   */
  constructor(root: string, { epic }: { epic?: string } = {}) {
    const worktree = EpicConfig.of(root).worktreeNameOf(root)
    const epics = join(EpicConfig.contentOf(root), "epics")
    epic ??= worktree && existsSync(join(epics, worktree, `${worktree}.plan.html`)) ? worktree : undefined
    this.file = epic ? join(epics, epic, LIST_FILE) : join(root, CHECKOUT_LIST_FILE)
    this.prefix = epic ?? worktree ?? MAIN_PREFIX
  }

  /**
   * The list beside epic page `file`, `<content>/epics/<epic>/<epic>.plan.html`:  that epic's (the page server's
   * route).
   * - the epic folder holds no config:  it is its own (`EpicConfig.contentOf()`)
   */
  static forPlanDoc(file: string): AgentList {
    const epic = basename(file, ".plan.html")
    return new AgentList(resolve(dirname(file), "..", ".."), { epic })
  }

  /** The epic whose list this is, when it's one's (`epics/<epic>/agents.json5`);  else `undefined`. */
  get epic(): string | undefined {
    return basename(this.file) === LIST_FILE ? basename(dirname(this.file)) : undefined
  }

  /** `name` with the prefix:  `aaa` -> `skillz-aaa`;  already prefixed:  as it is. */
  fullName(name: string): string {
    return name.startsWith(`${this.prefix}-`) ? name : `${this.prefix}-${name}`
  }

  /**
   * The agents running, oldest first;  none (no file):  `[]`.
   * - read from its old `.json` while there's no `.json5`
   */
  get agents(): RunningAgent[] {
    return DataFile.read<RunningAgent[]>(this.file) ?? []
  }

  /**
   * Add agent `name`, doing `task`;  returns its entry (its full name).
   * - throws if an agent of that name is running
   */
  add(
    name: string,
    task: string,
    { status = "active", taskId, files = [] }: { status?: string; taskId?: string; files?: string[] } = {}
  ) {
    checkStatus(status)
    const entry: RunningAgent = { name: this.fullName(name), task, status, started: new Date().toISOString() }
    if (taskId) entry.taskId = taskId
    this.update((agents) => {
      if (agents.some((agent) => agent.name === entry.name)) {
        throw new AgentListError(`AgentList.add():  \`${entry.name}\` is running already;  pick another name`)
      }
      if (files.length) entry.files = AgentList.checkClaims(agents, entry.name, files)
      agents.push(entry)
    })
    return entry
  }

  ////////////////
  // ## Claims
  ////////////////

  /**
   * Agent `name` claims `paths` (from the checkout's root:  a file, a folder or a glob), beside what it claimed
   * already;  returns its claims after.
   * - throws, naming each clash, if another running agent claims any of them:  nothing claimed
   * - throws if no such agent is running
   */
  claim(name: string, paths: string[]): string[] {
    return this.update((agents) => {
      const agent = this.find(agents, name)
      const claimed = AgentList.checkClaims(agents, agent.name, paths)
      agent.files = [...new Set([...(agent.files ?? []), ...claimed])]
      return agent.files
    })
  }

  /** Every running agent's claims:  `{ name, path }` each, in list order. */
  get claims(): { name: string; path: string }[] {
    return this.agents.flatMap(({ name, files = [] }) => files.map((path) => ({ name, path })))
  }

  /**
   * The running agent claiming file `path` (from the checkout's root), and its claim;  `undefined` when none does.
   * - `except`:  an agent whose claims don't count (the one asking:  its own files are its to move)
   */
  claimOf(path: string, { except }: { except?: string } = {}): { name: string; claim: string } | undefined {
    const skip = except ? this.fullName(except) : undefined
    const found = this.claims.find(({ name, path: claim }) => name !== skip && AgentList.covers(claim, path))
    return found && { name: found.name, claim: found.path }
  }

  /** Whether claim `claim` (a file, a folder or a glob) covers `path`. */
  static covers(claim: string, path: string): boolean {
    const [cleanClaim, cleanPath] = [tidyPath(claim), tidyPath(path)]
    return cleanPath === cleanClaim || cleanPath.startsWith(`${cleanClaim}/`) || matchesGlob(cleanPath, cleanClaim)
  }

  /**
   * `paths` tidied (no `./`, no trailing `/`), once each;  throws, naming every clash, if another agent than
   * `name` in `agents` claims one that overlaps.
   */
  private static checkClaims(agents: RunningAgent[], name: string, paths: string[]): string[] {
    const tidy = [...new Set(paths.map(tidyPath).filter(Boolean))]
    const clashes = agents
      .filter((agent) => agent.name !== name)
      .flatMap((agent) =>
        (agent.files ?? []).flatMap((theirs) =>
          tidy.filter((mine) => overlaps(mine, theirs)).map((mine) => `  ${mine}:  ${agent.name} has ${theirs}`)
        )
      )
    if (clashes.length)
      throw new AgentListError(
        `AgentList:  \`${name}\` can't claim files another agent is changing;  wait for it ` +
          `(set --status "blocked on <name>"):\n${clashes.join("\n")}`
      )
    return tidy
  }

  /**
   * Change agent `name`'s entry:  its `status` (`active`, `blocked on <name>`), and / or its `taskId`.
   * - throws if no such agent is running
   */
  set(name: string, change: { status?: string; taskId?: string }): RunningAgent {
    if (change.status) checkStatus(change.status)
    // Only the fields given:  `{ status: undefined }` (no `--status` flag) mustn't erase the status.
    const given = Object.fromEntries(Object.entries(change).filter(([, value]) => value !== undefined))
    return this.update((agents) => Object.assign(this.find(agents, name), given))
  }

  /**
   * Agent `name` finished:  off the list (the file goes with the last one);  returns its entry.
   * - throws if no such agent is running
   */
  done(name: string): RunningAgent {
    return this.update((agents) => {
      const agent = this.find(agents, name)
      agents.splice(agents.indexOf(agent), 1)
      return agent
    })
  }

  /**
   * The epic page's log line saying agent `name` finished (`Agent skillz-aaa done:  took 21m`), when the list is an
   * epic's and its log has one;  else `undefined`.
   * - why (epic `epic-engine` I288):  an agent often marks ITSELF done as it finishes (it reads the same rules as the
   *   session that started it), so the session's own `done` found nothing running, and failed;  and `wait` exited
   *   while the agent was still writing its report.  NOT a lost write:  the list's writes are locked and atomic.
   * - read from the log's part file (`parts/log.html`), else the page itself
   */
  doneSaid(name: string): string | undefined {
    const epic = this.epic
    if (!epic) return undefined
    const said = `Agent ${this.fullName(name)} done`
    for (const file of [join(dirname(this.file), "parts", "log.html"), join(dirname(this.file), `${epic}.plan.html`)]) {
      const text = existsSync(file) ? readFileSync(file, "utf8") : ""
      const at = text.lastIndexOf(said)
      if (at < 0) continue
      const end = text.indexOf("<", at)
      return text
        .slice(at, end < 0 ? undefined : end)
        .replace(/\s+/g, " ")
        .trim()
    }
    return undefined
  }

  ////////////////
  // ## Redirects
  ////////////////

  /**
   * Owen's notes for running agents that no session has passed on yet, oldest first:  `{ name, note, at }` each.
   * - a session waiting on the list (`epic agents wait`) sends each to its agent, then marks it `told()`
   */
  get untold(): Untold[] {
    return this.agents.flatMap((agent) =>
      (agent.redirects ?? []).filter((it) => !it.told).map(({ note, at }) => ({ name: agent.name, note, at }))
    )
  }

  /**
   * Owen's `note` for agent `name`, from the epic page's Agents box (`agentRoutes.ts`):
   * added to its `redirects`, untold;  returns the list after.
   * - through the page server's one safe write (`SRV.FileOperations.save()`):
   *   read and written under the list's lock, all at once
   * - async, so the page server keeps serving while it waits for the lock
   * - throws if the note is empty or too long, or no such agent is running
   */
  async redirect(name: string, note: string): Promise<RunningAgent[]> {
    note = note.trim()
    if (!note) throw new AgentListError("AgentList.redirect():  an empty note")
    if (note.length > MAX_NOTE) throw new AgentListError(`AgentList.redirect():  a note over ${MAX_NOTE} characters`)
    let agents: RunningAgent[] = []
    await SRV.FileOperations.save(this.file, (current) =>
      DataFile.edited<RunningAgent[]>(this.file, current, (read) => {
        agents = read ?? []
        const agent = this.find(agents, name)
        ;(agent.redirects ??= []).push({ note, at: new Date().toISOString() })
        return agents
      })
    )
    DataFile.removeOld(this.file)
    return agents
  }

  /**
   * Agent `name`'s untold redirects were passed on (`SendMessage`):  each marked `told` now;  returns how many.
   * - throws if no such agent is running
   */
  told(name: string): number {
    return this.update((agents) => {
      const untold = (this.find(agents, name).redirects ?? []).filter((it) => !it.told)
      const now = new Date().toISOString()
      for (const redirect of untold) redirect.told = now
      return untold.length
    })
  }

  ////////////////
  // ## The file
  ////////////////

  /** `name`'s entry in `agents`;  throws, naming the ones running, if it isn't there. */
  private find(agents: RunningAgent[], name: string): RunningAgent {
    const agent = agents.find((it) => it.name === this.fullName(name))
    if (agent) return agent
    const running = agents.map((it) => it.name).join(", ") || "none"
    throw new AgentListError(`AgentList:  no agent \`${this.fullName(name)}\` is running (running:  ${running})`)
  }

  /**
   * Change the list with `change`, under the file's lock, and write it back atomically;  returns what `change` does.
   * - SIDE EFFECT:  removes the file once the list is empty
   */
  private update<T>(change: (agents: RunningAgent[]) => T): T {
    return SRV.FileLock.run(this.file, () => {
      const agents = this.agents
      const result = change(agents)
      this.write(agents)
      return result
    })
  }

  /**
   * Write `agents` atomically (a temp file renamed over it), its comments kept (`DataFile.write()`).
   * - none:  remove the file (and its old `.json`)
   * - call it under the lock, or two writers may lose each other's changes
   */
  private write(agents: RunningAgent[]) {
    if (agents.length === 0) DataFile.remove(this.file)
    else DataFile.write(this.file, agents)
  }
}

/** `path` as claims compare it:  no leading `./`, no trailing `/`. */
function tidyPath(path: string): string {
  return path.trim().replace(/^\.\//, "").replace(/\/+$/, "")
}

/** Whether claims `a` and `b` (files, folders or globs) could cover the same file. */
function overlaps(a: string, b: string): boolean {
  return AgentList.covers(a, b) || AgentList.covers(b, a)
}

/** Throws unless `status` is one `AgentList` knows:  `active`, or `blocked on <name>`. */
function checkStatus(status: string) {
  if (!STATUS.test(status)) {
    throw new AgentListError(`AgentList:  status \`${status}\` isn't \`active\` or \`blocked on <name>\``)
  }
}

/** An epic's list, in `epics/<epic>/`. */
export const LIST_FILE = "agents.json5"

/** A checkout's list, at its root, when it has no epic. */
export const CHECKOUT_LIST_FILE = ".spell-agents.json5"

/** The agents' prefix in the main checkout, with no epic:  its name, `main`. */
const MAIN_PREFIX = "main"

/** The statuses an agent can have. */
const STATUS = /^(active|blocked on \S+)$/

/** One agent on the list. */
export type RunningAgent = {
  /** its full name, prefixed:  `skillz-aaa` */
  name: string
  /** what it does, a sentence or less */
  task: string
  /** `active`, or `blocked on <name>`:  waiting for that agent to finish first (same files) */
  status: string
  /** when it was added, ISO */
  started: string
  /** Claude Code's id for its background task:  what `/bg stop` stops */
  taskId?: string
  /** the files it's changing, from the checkout's root:  a file, a folder or a glob each (`claim()`) */
  files?: string[]
  /** Owen's notes to steer it, from the epic page's Agents box, oldest first */
  redirects?: Redirect[]
}

/** One of Owen's notes to a running agent. */
export type Redirect = {
  /** what he typed */
  note: string
  /** when he sent it, ISO */
  at: string
  /** when a session passed it on to the agent, ISO;  none yet:  absent */
  told?: string
}

/** A redirect no session has passed on yet, with its agent's full name (`AgentList.untold`). */
export type Untold = { name: string; note: string; at: string }

/** Longest redirect note:  a few paragraphs. */
const MAX_NOTE = 4000

/** A caller's mistake:  a name that's taken or isn't running, a status `AgentList` doesn't know. */
export class AgentListError extends Error {}
AgentListError.prototype.name = "AgentListError"
