import { readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { SRV } from "spell/server"

import { EpicConfig } from "spell/epic/config/EpicConfig"
import { RunningEpics } from "spell/epic/list/RunningEpics"
import { Turns } from "spell/epic/command/Turns"

import type { EpicWorktree, MainMove, NotOnGitHub, Repo, ServerFactsAnswer, WorktreeWorked } from "./server.types"

/****************
 * ### `ServerFacts`
 * What the Servers tab says beside the servers (epic `epic-engine` P82, T162):  read from git and the epic pages,
 * with no Claude call, at each ask.
 * - `mergedIntoMain`:  the work that landed on `main` lately, from its reflog:  each merge, pull or commit that
 *   brought commits of its own, named by the branch merged;  the last `RECENT_MINUTES` minutes marked new, never fewer
 *   than `AT_LEAST` shown
 *   - NOT a branch that only merged `main` into itself, then fast-forwarded `main` to that merge:  it brought nothing
 * - `epicWorktrees`:  every running epic's worktree, busy or idle:  its commits `main` hasn't got, the phase under way,
 *   its open issues, todos and questions, its agents, a session busy on it, a turn it holds (the test queue)
 *   - newest first, by when it was last worked on (`lastWorked()`), so one with no commit in weeks sinks to the
 *     bottom (epic `epic-engine` I449:  "prefs and undo hasn't had a checkin in weeks");  never worked out:  last
 * - `notOnGitHub`:  `main`'s commits `origin` hasn't got;  only the tooling home's session pushes
 * - EVERY repo the tab lists:  each one's own git and epic folder, its name on each once there are two or more
 * - static, NEVER throws:  what can't be read is left out
 ****************/
export class ServerFacts {
  /** the facts of every repo in `repos`, newest first;  none:  empty lists */
  static of(repos: Repo[], now = Date.now()): ServerFactsAnswer {
    const named = repos.length > 1
    const mergedIntoMain: MainMove[] = []
    const epicWorktrees: EpicWorktree[] = []
    const notOnGitHub: NotOnGitHub[] = []
    for (const repo of repos) {
      try {
        const base = baseBranchOf(repo.checkout)
        const tag = named ? { repo: repo.name } : {}
        mergedIntoMain.push(
          ...ServerFacts.mergedIntoMain(repo.checkout, base, now).map((move) => ({ ...move, ...tag }))
        )
        epicWorktrees.push(
          ...ServerFacts.epicWorktrees(repo.checkout, base, join(repo.content, "epics")).map((epic) => ({
            ...epic,
            ...tag
          }))
        )
        const count = ServerFacts.notOnGitHub(repo.checkout, base)
        if (count) notOnGitHub.push({ base, count, ...tag })
      } catch (error) {
        console.error(`server facts:  couldn't read ${repo.name}'s:`, error)
      }
    }
    mergedIntoMain.sort((one, other) => other.at.localeCompare(one.at))
    ServerFacts.newestFirst(epicWorktrees)
    return { mergedIntoMain, epicWorktrees, notOnGitHub }
  }

  /**
   * The work that landed on the base branch lately, newest first, from its reflog:  when, the branch merged, how many
   * commits of its own it brought and the newest one's subject;  `isNew` within `RECENT_MINUTES`
   * - a landing:  a merge, a pull, a commit (`LANDING`);  a reset, a rebase's reword or a branch made are moves, not
   *   work reaching it
   * - what it brought:  the commits between the reflog's entry before it and it, merges left out;  none (a branch that
   *   only merged the base branch into itself):  left out
   * - every landing of the last `RECENT_MINUTES` minutes, and at least `AT_LEAST` (older ones too, unmarked)
   */
  static mergedIntoMain(checkout: string, base: string, now = Date.now()): MainMove[] {
    const entries = SRV.Git.lines(
      ["log", "-g", `-n${REFLOG_LOOK}`, "--date=iso-strict", `--format=%H%x09%gd%x09%gs%x09%s`, `refs/heads/${base}`],
      checkout
    ).map((line) => {
      const [sha = "", selector, action = "", subject = ""] = line.split("\t")
      return { sha, at: /\{(.+)\}/.exec(selector ?? "")?.[1], action, subject }
    })
    const moves: MainMove[] = []
    for (const [index, entry] of entries.entries()) {
      if (!entry.sha || !entry.at || !LANDING.test(entry.action)) continue
      const time = Date.parse(entry.at)
      const isNew = now - time < RECENT_MINUTES * 60_000
      if (!isNew && moves.length >= AT_LEAST) break
      const before = entries[index + 1]?.sha
      const range = before ? [`${before}..${entry.sha}`] : [entry.sha, "-n1"]
      const commits = Number(SRV.Git.out(["rev-list", "--count", "--no-merges", ...range], checkout) || 0)
      if (!commits) continue
      const branch = /^(?:merge (\S+?):|(pull)\b)/.exec(entry.action)
      moves.push({
        sha: entry.sha.slice(0, 9),
        at: new Date(time).toISOString(),
        ...((branch?.[1] ?? branch?.[2]) && { branch: branch[1] ?? branch[2] }),
        commits,
        subject: SRV.Git.out(["log", "--no-merges", "-n1", "--format=%s", ...range], checkout) || entry.subject,
        isNew
      })
    }
    return moves
  }

  /**
   * every running epic's worktree, busy or idle:  what waits to reach `base`, and what's under way
   * - `epics`:  the repo's epic pages' folder, where its open items are counted
   */
  static epicWorktrees(checkout: string, base: string, epics = epicsFolderOf(checkout)): EpicWorktree[] {
    const turns = Turns.held()
    const running = new RunningEpics(checkout)
    const busy = running.runningNames("busy")
    const worktrees = running.list().map((epic) => {
      const ahead = Number(SRV.Git.out(["rev-list", "--count", `${base}..${epic.worktree}`], checkout) || 0)
      const turn = turns.find(({ holder }) => holder.label.includes(epic.worktree))
      const open = epics && openItemsOf(join(epics, epic.name, `${epic.name}.plan.html`))
      // a worktree git no longer knows (an old layout's):  the epic's own last-worked day (its page, its log)
      const worked =
        ServerFacts.lastWorked(running.checkoutOf(epic.worktree), epic.worktree) ??
        (epic.worked ? { at: new Date(epic.worked).toISOString(), by: "page" as const } : undefined)
      return {
        epic: epic.name,
        worktree: epic.worktree,
        url: epic.url,
        ahead,
        ...(epic.active && { phase: epic.active }),
        ...(open && { open }),
        ...(epic.agents && { agents: epic.agents }),
        ...((busy.has(epic.name) || busy.has(epic.worktree)) && { busy: true }),
        ...(turn && { turn: turn.kind }),
        ...(worked && { worked })
      }
    })
    return ServerFacts.newestFirst(worktrees)
  }

  /**
   * when the worktree at `worktree` was last worked on:  its branch's newest commit, or a file it hasn't committed yet
   * when that changed later (`by: "change"`);  neither reads:  `undefined`
   * - the uncommitted files:  what `git status` lists (an untracked folder as one), at most `CHANGES_LOOK` of them
   */
  static lastWorked(worktree: string, branch: string): WorktreeWorked | undefined {
    const committed = SRV.Git.out(["log", "-1", "--format=%cI", branch], worktree)
    let at = committed ? Date.parse(committed) : Number.NaN
    let by: WorktreeWorked["by"] = "commit"
    const status = SRV.Git.out(["status", "--porcelain", "-z", "--no-renames"], worktree, { trim: false }) ?? ""
    for (const entry of status.split("\0").filter(Boolean).slice(0, CHANGES_LOOK)) {
      try {
        const time = statSync(join(worktree, entry.slice(3))).mtimeMs
        if (!(time <= at)) [at, by] = [time, "change"]
      } catch {
        // deleted:  nothing to time
      }
    }
    return Number.isNaN(at) ? undefined : { at: new Date(at).toISOString(), by }
  }

  /** `worktrees`, sorted in place newest worked on first, those never worked out last, each half by name */
  static newestFirst(worktrees: EpicWorktree[]): EpicWorktree[] {
    return worktrees.sort(
      (one, other) =>
        (other.worked?.at ?? "").localeCompare(one.worked?.at ?? "") || one.worktree.localeCompare(other.worktree)
    )
  }

  /** how many of `base`'s commits `origin` hasn't got;  no `origin`:  0 */
  static notOnGitHub(checkout: string, base: string): number {
    return Number(SRV.Git.out(["rev-list", "--count", `origin/${base}..${base}`], checkout) || 0)
  }
}

/** The most uncommitted files `lastWorked()` looks at. */
const CHANGES_LOOK = 200

/** How far back the reflog is read. */
const REFLOG_LOOK = 40

/** What counts as just now, minutes. */
export const RECENT_MINUTES = 10

/** The fewest landings shown, however old. */
export const AT_LEAST = 5

/** A reflog entry that lands work on the base branch:  `merge x:  Fast-forward`, `commit (merge):  ...`, `pull:  ...`. */
const LANDING = /^(?:merge\b|pull\b|commit(?: \(merge\)| \(initial\))?:|cherry-pick\b)/

/** The open items counted, by id letter, in the words a line says them. */
const OPEN_KINDS: readonly (readonly [letter: string, one: string, many: string])[] = [
  ["i", "issue", "issues"],
  ["t", "todo", "todos"],
  ["q", "question", "questions"]
]

/**
 * The open issues, todos and questions of the epic page at `file`, in a few words:  `3 open issues, 1 todo`;  none,
 * or a page that won't read:  `undefined`
 * - by each `<epic-item>`'s id letter and `status="open"`, as the page wrote them (judgement calls and manual tests
 *   left out:  neither holds a merge up)
 */
export function openItemsOf(file: string): string | undefined {
  let html: string
  try {
    html = readFileSync(file, "utf8")
  } catch {
    return undefined
  }
  const counts = new Map<string, number>()
  for (const [tag] of html.matchAll(/<epic-item\b[^>]*>/g)) {
    if (!/\sstatus="open"/.test(tag)) continue
    const letter = /\sid="([a-z]+)\d/.exec(tag)?.[1]
    if (letter) counts.set(letter, (counts.get(letter) ?? 0) + 1)
  }
  const words = OPEN_KINDS.flatMap(([letter, one, many]) => {
    const count = counts.get(letter) ?? 0
    return count ? [`${count} ${count === 1 ? one : many}`] : []
  })
  return words.length ? `${words.join(", ")} open` : undefined
}

/** the repo's epic pages' folder, `<epic folder>/epics`;  its settings won't read:  `undefined` */
function epicsFolderOf(checkout: string): string | undefined {
  try {
    return join(EpicConfig.of(checkout).contentFolder, "epics")
  } catch {
    return undefined
  }
}

/** the repo's base branch;  `main` when its settings can't be read */
function baseBranchOf(checkout: string): string {
  try {
    return EpicConfig.of(checkout).baseBranch
  } catch {
    return "main"
  }
}
