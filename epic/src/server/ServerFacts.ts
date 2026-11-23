import { SRV } from "spell/server"

import { EpicConfig } from "spell/epic/config/EpicConfig"
import { RunningEpics } from "spell/epic/list/RunningEpics"
import { Turns } from "spell/epic/command/Turns"

import type { MainMove, Repo, ServerFactsAnswer, WaitingEpic } from "./server.types"

/****************
 * ### `ServerFacts`
 * What the Servers tab says beside the servers (epic `epic-engine` P82):  read from git and the epic pages, with no
 * Claude call, at each ask.
 * - `justOnMain`:  what just reached `main`, from its reflog:  the last `RECENT_MINUTES` minutes marked new, and never
 *   fewer than `AT_LEAST` moves shown
 * - `waitingForMain`:  a line per running epic (its worktree):  its commits `main` hasn't got, the phase under way,
 *   its agents, a turn it holds (the test queue)
 * - `waitingForGitHub`:  one line:  `main`'s commits `origin` hasn't got;  only the tooling home's session pushes
 * - the DEFAULT repo's only:  its main checkout's git, its epic folder's pages
 * - static, NEVER throws:  what can't be read is left out
 ****************/
export class ServerFacts {
  /** the facts of `repos`' default repo (else the first);  none:  empty lists */
  static of(repos: Repo[], now = Date.now()): ServerFactsAnswer {
    const repo = repos.find((each) => each.isDefault) ?? repos[0]
    if (!repo) return { justOnMain: [], waitingForMain: [] }
    const base = baseBranchOf(repo.checkout)
    return {
      justOnMain: ServerFacts.justOnMain(repo.checkout, base, now),
      waitingForMain: ServerFacts.waitingForMain(repo.checkout, base),
      ...withValue("waitingForGitHub", ServerFacts.waitingForGitHub(repo.checkout, base))
    }
  }

  /**
   * The base branch's last moves, newest first, from its reflog:  each move's time, its commit's subject, how many
   * commits it brought;  `isNew` within `RECENT_MINUTES`
   * - every move of the last `RECENT_MINUTES` minutes, and at least `AT_LEAST` (older ones too, unmarked)
   */
  static justOnMain(checkout: string, base: string, now = Date.now()): MainMove[] {
    const lines = SRV.Git.lines(
      ["log", "-g", `-n${REFLOG_LOOK}`, "--date=iso-strict", `--format=%H%x09%gd%x09%gs%x09%s`, `refs/heads/${base}`],
      checkout
    )
    const moves = lines.flatMap((line): MainMove[] => {
      const [sha, selector, action, subject] = line.split("\t")
      const at = /\{(.+)\}/.exec(selector ?? "")?.[1]
      if (!sha || !at) return []
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
   * - left out:  one with nothing to merge, no phase under way and no agents (a worktree left from finished work)
   */
  static waitingForMain(checkout: string, base: string): WaitingEpic[] {
    const turns = Turns.held()
    const lines = new RunningEpics(checkout).list().map((epic) => {
      const ahead = Number(SRV.Git.out(["rev-list", "--count", `${base}..${epic.worktree}`], checkout) || 0)
      const turn = turns.find(({ holder }) => holder.label.includes(epic.worktree))
      return {
        epic: epic.name,
        worktree: epic.worktree,
        url: epic.url,
        ahead,
        ...(epic.active && { phase: epic.active }),
        ...(epic.agents && { agents: epic.agents }),
        ...(turn && { turn: turn.kind }),
        why: whyWaiting({ ahead, phase: epic.active, agents: epic.agents, turn: turn?.kind })
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

/** The fewest moves shown, however old. */
export const AT_LEAST = 5

/** why an epic's work hasn't reached main, in a few words */
function whyWaiting({
  ahead,
  phase,
  agents,
  turn
}: {
  ahead: number
  phase?: string
  agents?: number
  turn?: string
}): string {
  if (turn) return `in the ${turn} turn now`
  if (!ahead) return phase ? `nothing to merge yet;  ${phase} under way` : "nothing to merge"
  const commits = `${ahead} ${ahead === 1 ? "commit" : "commits"} not merged`
  if (agents) return `${commits};  ${agents} ${agents === 1 ? "agent" : "agents"} still building`
  return phase ? `${commits};  ${phase} under way` : `${commits};  waiting for a merge`
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
