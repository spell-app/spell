import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { Git } from "spell/server/Git"
import { PlanDocFiles } from "spell/epic/tool/PlanDocFiles"
import { PlanParts } from "spell/epic/tool/PlanParts"
import { DataFile } from "spell/epic/data/DataFile"
import { PlanTime } from "spell/epic/tool/PlanTime"
import { Renumber } from "spell/epic/tool/Renumber"
import { SharedComments } from "spell/epic/tool/SharedComments"

import { ContentMerge } from "./ContentMerge"
import { EpicCheckout } from "./EpicCheckout"
import type { Shared } from "./Shared"
import { SyncState, type SyncRecord, type SyncResult } from "./SyncState"

/****************
 * ### `SharedSync`
 * The content repo's SYNC with its remote (epic `epic-friend` P5;  Q5, A):  pull, rebasing this machine's commits
 * onto everyone else's, then push.
 * - run by `Shared.sync()`, inside `commit()`'s lock, after the turn's commit:  every turn's end
 *   (`epic shared commit`, the `Stop` hook) and by hand (`epic shared sync`)
 * - only where the repo's config names the content repo's remote (`contentRemote`):  `Shared.syncsWith`
 * - the steps (`run()`):
 *   1. fetch;  offline:  stop, the commits kept, pushed by the next sync
 *   2. RENUMBER (Q6, A):  ids THIS machine made (a todo `t22`, a change mark `ch12`, a request `r3`) that the remote
 *      has too get the next free number, on this side, every reference following (`Renumber.epic()`), a log line on
 *      the page;  BEFORE the rebase, since two new `parts/t22.html` would stop it.
 *      A page's comments the same way (`c3`, in each person's comments file:  `Renumber.comments()`, epic
 *      `epic-friend` P9, T15), with no log line:  a comment isn't on the page.
 *      This machine's commits not pushed yet are then made again as one per group (`Shared.commitPending()`), so no
 *      commit of theirs still adds the old file
 *   3. rebase onto the remote's branch;  what stops it is settled by `ContentMerge` (two adds at one place, a later
 *      date) where it can be;  else the rebase is undone, and the state file says which files (`SyncState`), for the
 *      next session's notice
 *   4. the logs both sides wrote (a union merge, `merge=union`):  re-sorted by time (`ContentMerge.sortLog()`);  a
 *      field a phase now holds twice (a request filed by each):  joined into one (`joinTwinFields()`)
 *   5. push;  refused or offline:  kept, the next sync pushes
 * - git through the kit's `Git` (`EpicCheckout.mustGit()` where a failure is the verb's), in the content repo
 * - NOT the review inboxes:  git-ignored, each machine's own;  but the comments beside them, one file per person
 *   (`SharedComments`, epic `epic-friend` P9), are committed and synced as the pages are:  each machine writes only
 *   its own person's, so they never conflict
 ****************/
export class SharedSync {
  /** the content folder's verbs:  its config, its commits.  STATIC */
  readonly shared: Shared

  constructor(shared: Shared) {
    this.shared = shared
  }

  /** the content repo */
  get dir(): string {
    return this.shared.config.dir
  }

  /**
   * Sync the content repo with its remote (`origin`), its own commits made already:  what came of it, kept for the
   * next session too (`SyncState`).
   * - `session`, `checkout`:  the commit trailers, for commits it makes (renumbering, a sorted log)
   * - NEVER throws for git's sake:  a failure is in the report (`error`);  throws only for a bug
   * - SIDE EFFECT:  fetches, commits, rebases and pushes in the content repo;  writes the state file
   */
  async run({ session, checkout, now = new Date() }: SyncOptions = {}): Promise<SyncReport> {
    const report = await this.steps({ session, checkout })
    const record: SyncRecord = { at: PlanTime.clockTime(now), result: report.result }
    if (report.files?.length) record.files = report.files
    if (report.error) record.error = report.error
    SyncState.write(this.dir, record)
    return report
  }

  /** `run()`'s steps, without keeping the state. */
  private async steps({ session, checkout }: SyncOptions): Promise<SyncReport> {
    const { dir } = this
    const branch = Git.out(["rev-parse", "--abbrev-ref", "HEAD"], dir)
    if (!branch || branch === "HEAD") return { result: "not pushed", error: "the content repo isn't on a branch" }
    this.abandonRebase()
    const fetch = Git.run(["fetch", "-q", "origin"], dir, { timeout: NETWORK_WAIT })
    if (!fetch.ok) return { result: "offline", error: fetch.err || `exit ${fetch.code}` }
    const theirs = `refs/remotes/origin/${branch}`
    if (!Git.run(["rev-parse", "--verify", "-q", theirs], dir).ok) return this.push({ renumbered: [] })
    const base = this.git(["merge-base", "HEAD", theirs])
    const behind = this.count(`${base}..${theirs}`)
    let renumbered: Renumbered[] = []
    if (behind && this.count(`${base}..HEAD`)) {
      renumbered = await this.renumber(base, theirs)
      if (renumbered.length) this.remake(base, { session, checkout, renumbered })
      const before = this.git(["rev-parse", "HEAD"])
      const files = this.rebase(theirs)
      if (files) return { result: "conflict", files, renumbered }
      const joined = await this.joinTwinFields(base, theirs)
      if ((await this.sortLogs(base, before, theirs)) || joined) this.shared.commitPending({ session, checkout })
    } else if (behind) this.git(["merge", "-q", "--ff-only", theirs])
    return this.push({ renumbered, pulled: behind })
  }

  ////////////////
  // ## Renumbering
  ////////////////

  /**
   * Renumber the ids this machine made since `base` that `theirs` (the remote's branch) has too:  each epic both
   * sides changed (`duplicates()`), by `Renumber.epic()`;  what it renumbered.
   * - SIDE EFFECT:  writes the pages, their inboxes, request folders and links on other pages (not committed)
   */
  async renumber(base: string, theirs: string): Promise<Renumbered[]> {
    const renumbered: Renumbered[] = []
    const files = new PlanDocFiles({ root: this.shared.checkout, content: this.dir })
    for (const epic of this.bothChanged(base, theirs)) {
      const renames = this.duplicates(epic, base, theirs)
      if (!Object.keys(renames).length) continue
      await Renumber.epic(files, epic, renames, logLine(renames))
      renumbered.push({ epic, renames })
    }
    return [...renumbered, ...(await this.renumberComments(base, theirs))]
  }

  /**
   * Renumber the comments this machine made since `base` whose ids `theirs` has too (epic `epic-friend` P9, T15):  for
   * each page whose comments files this side changed, its new ids (in any person's file) that the remote's files use
   * too, each to the next free `c<N>` (`Renumber.comments()`);  what it renumbered, by epic (an epic page's) or page.
   * - SIDE EFFECT:  writes those comments files and inboxes (not committed)
   */
  private async renumberComments(base: string, theirs: string): Promise<Renumbered[]> {
    const inboxes = new Set(
      Git.lines(["diff", "--name-only", base, "HEAD"], this.dir)
        .filter((path) => SharedComments.isCommentsFile(path))
        .map((path) => SharedComments.inboxOf(path))
    )
    const renumbered: Renumbered[] = []
    for (const inbox of [...inboxes].sort()) {
      const [before, mine, other] = [base, "HEAD", theirs].map((rev) => this.commentIdsAt(rev, inbox))
      const renames: Record<string, string> = {}
      let highest = Math.max(0, ...[...mine!, ...other!].map((id) => Number(NUMBERED.exec(id)?.[2] ?? 0)))
      for (const id of [...mine!].sort(byNumber)) {
        if (before!.has(id) || !other!.has(id)) continue
        renames[id] = `c${++highest}`
      }
      if (!Object.keys(renames).length) continue
      await Renumber.comments(join(this.dir, inbox), renames)
      const epic = EPIC_INBOX.exec(inbox)
      renumbered.push({
        epic: epic && epic[1] === epic[2] ? epic[1]! : inbox.replace(/\.inbox\.json5$/, ".html"),
        renames
      })
    }
    return renumbered
  }

  /** The comment ids every person's comments file beside inbox `inbox` (from the repo) holds at `rev`. */
  private commentIdsAt(rev: string, inbox: string): Set<string> {
    const folder = inbox.includes("/") ? inbox.slice(0, inbox.lastIndexOf("/")) : ""
    const ids = new Set<string>()
    for (const name of Git.lines(["ls-tree", "--name-only", rev, "--", `${folder}/`], this.dir)) {
      if (!SharedComments.isCommentsFile(name) || SharedComments.inboxOf(name) !== inbox) continue
      const text = Git.out(["show", `${rev}:${name}`], this.dir, { trim: false }) ?? ""
      try {
        for (const id of Object.keys(DataFile.parse<{ comments?: object }>(text).comments ?? {})) ids.add(id)
      } catch {
        // a file that won't read holds no ids to clash
      }
    }
    return ids
  }

  /**
   * Epic `epic`'s ids made on this side since `base` that `theirs` has too, each to the next free number of its kind
   * (`t22` => `t23`, past every number either side has):  old => new.
   * - items (`<epic-item id>`, in the skeleton), change marks (`ch12`, in any of its files), requests (`requests/r3/`)
   */
  duplicates(epic: string, base: string, theirs: string): Record<string, string> {
    const [before, mine, other] = [base, "HEAD", theirs].map((rev) => this.idsAt(rev, epic))
    const renames: Record<string, string> = {}
    const highest = new Map<string, number>()
    for (const id of [...mine!, ...other!]) {
      const [, kind = "", n = "0"] = NUMBERED.exec(id) ?? []
      highest.set(kind, Math.max(highest.get(kind) ?? 0, Number(n)))
    }
    for (const id of [...mine!].sort(byNumber)) {
      if (before!.has(id) || !other!.has(id)) continue
      const [, kind = ""] = NUMBERED.exec(id) ?? []
      const next = (highest.get(kind) ?? 0) + 1
      highest.set(kind, next)
      renames[id] = `${kind}${next}`
    }
    return renames
  }

  /** The ids epic `epic`'s files hold at `rev`:  its items', its change marks' and its requests'. */
  idsAt(rev: string, epic: string): Set<string> {
    const folder = `epics/${epic}`
    const ids = new Set<string>()
    const skeleton = Git.out(["show", `${rev}:${folder}/${epic}.plan.html`], this.dir, { trim: false }) ?? ""
    for (const [, attributes = ""] of skeleton.matchAll(ITEM_TAG)) {
      const id = /\sid="([a-z]+\d+)"/.exec(attributes)?.[1]
      if (id) ids.add(id)
    }
    const changes = Git.lines(["grep", "-h", "-o", "-E", 'id="ch[0-9]+"', rev, "--", `${folder}/`], this.dir)
    for (const line of changes) {
      const id = /ch\d+/.exec(line)?.[0]
      if (id) ids.add(id)
    }
    const requests = Git.lines(["ls-tree", "--name-only", `${rev}:${folder}/requests`], this.dir)
    for (const name of requests) if (/^r\d+$/.test(name)) ids.add(name)
    return ids
  }

  /** The epics whose folder both sides changed since `base`. */
  bothChanged(base: string, theirs: string): string[] {
    const epics = (to: string) =>
      new Set(
        Git.lines(["diff", "--name-only", base, to, "--", "epics/"], this.dir)
          .map((path) => /^epics\/([^/]+)\//.exec(path)?.[1])
          .filter((it) => it !== undefined)
      )
    const theirEpics = epics(theirs)
    return [...epics("HEAD")].filter((epic) => theirEpics.has(epic)).sort()
  }

  /**
   * Make this machine's commits since `base` again, renumbered:  one per group (`Shared.commitPending()`), so none of
   * them still adds a file the remote has too.
   * - SIDE EFFECT:  `git reset --soft`, then commits
   */
  private remake(base: string, { session, checkout, renumbered }: SyncOptions & { renumbered: Renumbered[] }): void {
    this.git(["reset", "-q", "--soft", base])
    const note = renumbered.map(({ epic, renames }) => `${epic} ${idsSaid(renames)}`).join(";  ")
    this.shared.commitPending({ session, checkout, renumbered: note })
  }

  ////////////////
  // ## Pull and push
  ////////////////

  /**
   * Rebase onto `theirs`, settling what stops it where `ContentMerge` can:  `undefined` when it's done, else the files
   * it couldn't settle (the rebase undone).
   */
  private rebase(theirs: string): string[] | undefined {
    let run = Git.run([...REBASE, "rebase", "-q", theirs], this.dir, { timeout: GIT_WAIT })
    for (let round = 0; !run.ok && round < MAX_ROUNDS; round++) {
      if (!this.isRebasing) return [run.err || `exit ${run.code}`]
      const conflicts = this.conflicts()
      const stuck = conflicts.filter((conflict) => !this.settle(conflict))
      if (stuck.length) {
        Git.run(["rebase", "--abort"], this.dir)
        return stuck.map((conflict) => conflict.path)
      }
      if (conflicts.length) this.git(["add", "--", ...conflicts.map((conflict) => conflict.path)])
      // a commit that's empty once settled (the remote had the same change):  skipped
      const empty = !conflicts.length || Git.run(["diff", "--cached", "--quiet"], this.dir).ok
      run = Git.run([...REBASE, "rebase", empty ? "--skip" : "--continue"], this.dir, { timeout: GIT_WAIT })
    }
    if (run.ok) return undefined
    Git.run(["rebase", "--abort"], this.dir)
    return [run.err || "the rebase didn't finish"]
  }

  /** The files a stopped rebase left in conflict, with git's two-letter code (`UU`, `AA` ...). */
  private conflicts(): Conflict[] {
    return Git.lines(["status", "--porcelain"], this.dir)
      .map((line) => ({ code: line.slice(0, 2), path: line.slice(3) }))
      .filter(({ code }) => CONFLICT_CODES.has(code))
  }

  /**
   * Settle conflict `conflict` in the working tree by `ContentMerge.resolve()`:  settled?
   * - only a file both sides changed (`UU`):  never a file both ADDED, nor an edit against a deletion
   */
  private settle({ code, path }: Conflict): boolean {
    if (code !== "UU") return false
    const file = join(this.dir, path)
    const settled = ContentMerge.resolve(readFileSync(file, "utf8"))
    if (settled === undefined) return false
    writeFileSync(file, settled)
    return true
  }

  /**
   * Re-sort by time each log both sides wrote since `base` (`before`:  this side's HEAD before the rebase), which the
   * union merge left as two runs:  any written?
   */
  private async sortLogs(base: string, before: string, theirs: string): Promise<boolean> {
    const logs = (to: string) =>
      new Set(Git.lines(["diff", "--name-only", base, to, "--", "epics/", "sagas/"], this.dir).filter(isLog))
    const theirLogs = logs(theirs)
    let written = false
    for (const path of logs(before)) {
      if (!theirLogs.has(path)) continue
      const file = join(this.dir, path)
      if (!existsSync(file)) continue
      const text = readFileSync(file, "utf8")
      const sorted = ContentMerge.sortLog(text)
      if (sorted === undefined) continue
      const formatted = await PlanParts.formatHTML(file, sorted)
      if (formatted === text) continue
      writeFileSync(file, formatted)
      written = true
    }
    return written
  }

  /**
   * Join the fields a phase now holds twice, in each epic both sides changed since `base`:  both people added the same
   * field to one phase (a request each, filed into P1:  two `<epic-field name="requests">`), and the merge kept both.
   * The later one's contents go into the first, in order, so the page checks again.  Any joined?
   * - SIDE EFFECT:  writes those pages (`PlanDocFiles.edit()`)
   */
  private async joinTwinFields(base: string, theirs: string): Promise<boolean> {
    const files = new PlanDocFiles({ root: this.shared.checkout, content: this.dir })
    let joined = false
    for (const epic of this.bothChanged(base, theirs)) {
      const file = files.findDoc(epic)
      if (!existsSync(file) || !twinFields(files.read(file).document).length) continue
      await files.edit(file, (plan) => {
        for (const [first, twin] of twinFields(plan.document)) {
          first.append(...Array.from(twin.childNodes))
          twin.remove()
        }
      })
      joined = true
    }
    return joined
  }

  /** Push the branch to `origin`, tracking it:  the report, `synced` or `up to date`, else `not pushed`. */
  private push(report: Omit<SyncReport, "result">): SyncReport {
    const ahead = Git.out(["rev-list", "--count", "@{upstream}..HEAD"], this.dir)
    if (ahead === "0") return { ...report, result: report.pulled ? "synced" : "up to date" }
    const push = Git.run(["push", "-q", "-u", "origin", "HEAD"], this.dir, { timeout: NETWORK_WAIT })
    if (!push.ok) return { ...report, result: "not pushed", error: push.err || `exit ${push.code}` }
    return { ...report, result: "synced", pushed: true }
  }

  ////////////////
  // ## Internal
  ////////////////

  /** Whether a rebase is under way in the content repo. */
  private get isRebasing(): boolean {
    const gitDir = join(this.dir, ".git")
    return existsSync(join(gitDir, "rebase-merge")) || existsSync(join(gitDir, "rebase-apply"))
  }

  /** A rebase a crashed sync left behind:  undone, so this one starts clean. */
  private abandonRebase(): void {
    if (this.isRebasing) Git.run(["rebase", "--abort"], this.dir)
  }

  /** How many commits `range` holds. */
  private count(range: string): number {
    return Number(this.git(["rev-list", "--count", range]))
  }

  /** `git <args>` in the content repo;  its failure an `EpicCommandError`. */
  private git(args: string[]): string {
    return EpicCheckout.mustGit(args, this.dir, { timeout: GIT_WAIT })
  }
}

/** What `SharedSync.run()` takes. */
export type SyncOptions = { session?: string; checkout?: string; now?: Date }

/** What a sync did. */
export type SyncReport = {
  /** what came of it */
  result: SyncResult
  /** the ids it renumbered, by epic */
  renumbered?: Renumbered[]
  /** how many of the remote's commits it took */
  pulled?: number
  /** whether it pushed */
  pushed?: boolean
  /** a conflict's files */
  files?: string[]
  /** git's words, when it failed */
  error?: string
}

/** One epic's renumbering:  old id => new. */
export type Renumbered = { epic: string; renames: Record<string, string> }

/** A file a stopped rebase left in conflict. */
type Conflict = { code: string; path: string }

/** How long a fetch or a push may take, ms:  over the network. */
const NETWORK_WAIT = 60_000

/** How long any other git command may take, ms. */
const GIT_WAIT = 30_000

/** The most times a rebase is settled and carried on:  one per commit of this machine's, at most. */
const MAX_ROUNDS = 50

/** How the rebase runs:  conflicts with their base (for `ContentMerge`), no editor, no signing. */
const REBASE = ["-c", "merge.conflictStyle=diff3", "-c", "core.editor=true", "-c", "commit.gpgsign=false"]

/** Git's codes for a file a merge left in conflict (`git status --porcelain`). */
const CONFLICT_CODES = new Set(["DD", "AU", "UD", "UA", "DU", "AA", "UU"])

/** An `<epic-item>`'s opening tag, its attributes `$1`, quoted values holding any `>`. */
const ITEM_TAG = /<epic-item((?:\s+[\w-]+(?:="[^"]*")?)*)\s*>/g

/** An epic page's inbox, from the content repo:  `epics/<name>/<name>.inbox.json5` (`$1`, `$2` the same). */
const EPIC_INBOX = /^epics\/([^/]+)\/([^/]+)\.inbox\.json5$/

/** A numbered id:  its kind (`t`, `ch`, `r`) `$1`, its number `$2`. */
const NUMBERED = /^([a-z]+)(\d+)$/

/** Each phase's fields named twice:  `[the first, a later one]`, a pair per later one. */
function twinFields(document: Document): [Element, Element][] {
  const twins: [Element, Element][] = []
  for (const phase of Array.from(document.querySelectorAll("epic-phase"))) {
    const first = new Map<string, Element>()
    for (const field of Array.from(phase.children)) {
      const name = field.localName === "epic-field" ? field.getAttribute("name") : null
      if (!name) continue
      const earlier = first.get(name)
      if (earlier) twins.push([earlier, field])
      else first.set(name, field)
    }
  }
  return twins
}

/** Whether `path` is a page's log part. */
function isLog(path: string): boolean {
  return /\/parts\/log\.html$/.test(path)
}

/** Ids in number order, so `t9` is renumbered before `t10`. */
function byNumber(a: string, b: string): number {
  return Number(NUMBERED.exec(a)?.[2] ?? 0) - Number(NUMBERED.exec(b)?.[2] ?? 0) || a.localeCompare(b)
}

/** `T22 → T23, CH12 → CH14`. */
function idsSaid(renames: Record<string, string>): string {
  return Object.entries(renames)
    .map(([from, to]) => `${from.toUpperCase()} → ${to.toUpperCase()}`)
    .join(", ")
}

/** The page's log line for `renames`. */
function logLine(renames: Record<string, string>): string {
  return `Renumbered as the plans synced:  ${idsSaid(renames)} (the same ids came from someone else first)`
}
