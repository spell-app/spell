import { readFileSync } from "node:fs"
import { join } from "node:path"

import { SRV } from "spell/server"

import { EpicConfig } from "spell/epic/config/EpicConfig"
import { RunningEpics } from "spell/epic/list/RunningEpics"
import { Turns } from "spell/epic/command/Turns"

import type { MainMove, Repo, ServerFactsAnswer, WaitingEpic } from "./server.types"

/****************
 * ### `ServerFacts`
 * What the Servers tab says beside the servers (epic `epic-engine` P82):  read from git and the epic pages, with no
 * Claude call, at each ask.
 * - `justOnMain`:  what just reached `main`, from its reflog:  its LANDINGS only (merges, pulls, commits;  never a
 *   reset or a reword), the last `RECENT_MINUTES` minutes marked new, and never fewer than `AT_LEAST` shown
 * - `waitingForMain`:  a line per running epic (its worktree):  its commits `main` hasn't got, the phase under way,
 *   its open issues, todos and questions, its agents, a turn it holds (the test queue)
 * - `waitingForGitHub`:  one line:  `main`'s commits `origin` hasn't got;  only the tooling home's session pushes
 * - EVERY repo the tab lists:  each one's own git and epic folder, its name on each line once there are two or more
 * - static, NEVER throws:  what can't be read is left out
 ****************/
export class ServerFacts {
  /** the facts of every repo in `repos`, newest first;  none:  empty lists */
  static of(repos: Repo[], now = Date.now()): ServerFactsAnswer {
    const named = repos.length > 1
    const justOnMain: MainMove[] = []
    const waitingForMain: WaitingEpic[] = []
    const github: string[] = []
    for (const repo of repos) {
      try {
        const base = baseBranchOf(repo.checkout)
        const tag = named ? { repo: repo.name } : {}
        justOnMain.push(...ServerFacts.justOnMain(repo.checkout, base, now).map((move) => ({ ...move, ...tag })))
        waitingForMain.push(
          ...ServerFacts.waitingForMain(repo.checkout, base, join(repo.content, "epics")).map((epic) => ({
            ...epic,
            ...tag
          }))
        )
        const waiting = ServerFacts.waitingForGitHub(repo.checkout, base)
        if (waiting) github.push(named ? `${repo.name}:  ${waiting}` : waiting)
      } catch (error) {
        console.error(`server facts:  couldn't read ${repo.name}'s:`, error)
      }
    }
    justOnMain.sort((one, other) => other.at.localeCompare(one.at))
    return { justOnMain, waitingForMain, ...withValue("waitingForGitHub", github.join("\n") || undefined) }
  }

  /**
   * The base branch's last LANDINGS, newest first, from its reflog:  each one's time, its commit's subject;  `isNew`
   * within `RECENT_MINUTES`
   * - a landing:  a merge, a pull, a commit (`LANDING`);  a reset, a rebase's reword or a branch made are moves, not
   *   work reaching it
   * - every landing of the last `RECENT_MINUTES` minutes, and at least `AT_LEAST` (older ones too, unmarked)
   */
  static justOnMain(checkout: string, base: string, now = Date.now()): MainMove[] {
    const lines = SRV.Git.lines(
      ["log", "-g", `-n${REFLOG_LOOK}`, "--date=iso-strict", `--format=%H%x09%gd%x09%gs%x09%s`, `refs/heads/${base}`],
      checkout
    )
    const moves = lines.flatMap((line): MainMove[] => {
      const [sha, selector, action, subject] = line.split("\t")
      const at = /\{(.+)\}/.exec(selector ?? "")?.[1]
      if (!sha || !at || !LANDING.test(action ?? "")) return []
      const time = Date.parse(at)
      return [
        {
          sha: sha.slice(0, 9),
          at: new Date(time).toISOString(),
          how: action ?? "",
          subject: subject ?? "",
          isNew: now - time < RECENT_MINUTES * 60_000
        }
      ]
    })
    const recent = moves.filter((move) => move.isNew).length
    return moves.slice(0, Math.max(recent, AT_LEAST))
  }

  /**
   * a line per running epic (a worktree) with something under way:  what waits to reach `base`, and why
   * - `epics`:  the repo's epic pages' folder, where its open items are counted
   * - left out:  one with nothing to merge, no phase under way and no agents (a worktree left from finished work)
   */
  static waitingForMain(checkout: string, base: string, epics = epicsFolderOf(checkout)): WaitingEpic[] {
    const turns = Turns.held()
    const lines = new RunningEpics(checkout).list().map((epic) => {
      const ahead = Number(SRV.Git.out(["rev-list", "--count", `${base}..${epic.worktree}`], checkout) || 0)
      const turn = turns.find(({ holder }) => holder.label.includes(epic.worktree))
      const open = epics && openItemsOf(join(epics, epic.name, `${epic.name}.plan.html`))
      return {
        epic: epic.name,
        worktree: epic.worktree,
        url: epic.url,
        ahead,
        ...(epic.active && { phase: epic.active }),
        ...(open && { open }),
        ...(epic.agents && { agents: epic.agents }),
        ...(turn && { turn: turn.kind }),
        why: whyWaiting({ ahead, phase: epic.active, open, agents: epic.agents, turn: turn?.kind })
      }
    })
    return lines.filter((line) => line.ahead || line.phase || line.agents || line.turn)
  }

  /** `base`'s commits `origin` hasn't got, in words;  none, or no `origin`:  `undefined` */
  static waitingForGitHub(checkout: string, base: string): string | undefined {
    const count = Number(SRV.Git.out(["rev-list", "--count", `origin/${base}..${base}`], checkout) || 0)
    if (!count) return undefined
    return `${count} ${count === 1 ? "commit" : "commits"} on ${base} not on GitHub yet.  Only the tooling home's session sends them.`
  }
}

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

/** why an epic's work hasn't reached main, in a few words */
function whyWaiting({
  ahead,
  phase,
  open,
  agents,
  turn
}: {
  ahead: number
  phase?: string
  open?: string
  agents?: number
  turn?: string
}): string {
  const withOpen = (words: string) => (open ? `${words};  ${open}` : words)
  if (turn) return withOpen(`in the ${turn} turn now`)
  if (!ahead) return withOpen(phase ? `nothing to merge yet;  ${phase} under way` : "nothing to merge")
  const commits = `${ahead} ${ahead === 1 ? "commit" : "commits"} not merged`
  if (agents) return withOpen(`${commits};  ${agents} ${agents === 1 ? "agent" : "agents"} still building`)
  return withOpen(phase ? `${commits};  ${phase} under way` : `${commits};  waiting for a merge`)
}

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

/** `{ [key]: value }` when there's a value, else nothing */
function withValue<K extends string, V>(key: K, value: V | undefined): Partial<Record<K, V>> {
  return value === undefined ? {} : ({ [key]: value } as Record<K, V>)
}
