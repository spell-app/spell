import { existsSync } from "node:fs"
import { join } from "node:path"

import { Git } from "spell/server/Git"
import { EpicConfig } from "spell/epic/config/EpicConfig"

import { AgentList, AgentListError, type PausedWork, type RunningAgent } from "./AgentList"

/****************
 * ### `AgentPause`
 * What a paused agent needs to start again cleanly in a session that never knew it (epic `epic-engine` T139).
 * - `save()`:  an agent as it stands, read from its worktree by git, kept on the epic's agents list (`AgentList.pause()`)
 *   - durable:  the list is a file in the epic folder, read by any session of the epic
 *   - only READS the worktree:  it never commits, stages, stashes or removes anything, whoever's it is
 * - `brief()`:  that record as the words that start the agent again
 * - Its position:  git, the epic config and `AgentList`;  it knows nothing of rounds (`FreshPause`) or sessions.
 ****************/
export class AgentPause {
  /**
   * Save agent `name` of `list` as paused, as it stands;  returns its entry and what was saved.
   * - `root`:  the checkout the command ran in;  its epic's worktree is found from there (`checkoutOf()`)
   * - `item`:  left out, the first id its task names (`fix I407` => `I407`)
   * - throws if no such agent is listed
   */
  static save(
    list: AgentList,
    name: string,
    { root, next, item, tests, session, now = Date.now() }: PauseProps
  ): { agent: RunningAgent; saved: PausedWork } {
    const agents = list.agents
    const agent = agents.find((each) => each.name === list.fullName(name))
    if (!agent) throw new AgentListError(`AgentPause.save():  no agent \`${list.fullName(name)}\` is running`)

    const checkout = AgentPause.checkoutOf(root, list.epic)
    const claims = agent.files ?? []
    const dirty = AgentPause.changedFiles(checkout)
    const merge = AgentPause.mergeState(checkout)
    const onItem = item ?? agent.paused?.item ?? ITEM_ID.exec(agent.task)?.[0]
    const testsLeft = tests ?? agent.paused?.tests
    const saved: PausedWork = {
      at: new Date(now).toISOString(),
      checkout,
      next,
      ...(session && { session }),
      ...(onItem && { item: onItem }),
      ...(testsLeft && { tests: testsLeft }),
      ...(merge && { merge }),
      uncommitted: dirty.filter((path) => claims.some((claim) => AgentList.covers(claim, path))),
      unclaimed: dirty.filter(
        (path) => !agents.some(({ files = [] }) => files.some((claim) => AgentList.covers(claim, path)))
      ),
      commits: AgentPause.commitsTo(checkout, claims, agent.started)
    }
    return { agent: list.pause(name, saved), saved }
  }

  /**
   * The brief that starts `agent` again, from how it was saved;  `session`:  the one resuming it.
   * - the session that paused it can still message it;  any other starts a new agent
   */
  static brief(agent: RunningAgent, { session }: { session?: string } = {}): string {
    const saved = agent.paused
    if (!saved) throw new TypeError(`AgentPause.brief():  ${agent.name} has nothing saved;  pause it first`)
    const notes = (agent.redirects ?? []).filter((each) => !each.told).map(({ note }) => note)
    const canMessage = session && session === saved.session && agent.taskId
    const how = canMessage
      ? `START IT:  SendMessage to ${agent.taskId} with all of this.`
      : "START IT:  a new Agent, its description starting with that name, all of this its brief;  then " +
        `epic agents set ${agent.name} --task-id <its id>.`
    return [
      `agent:  ${agent.name}, paused ${saved.at}`,
      `task:  ${agent.task}`,
      `item:  ${saved.item ?? "none named"}`,
      `worktree:  ${saved.checkout}`,
      `next step:  ${saved.next}`,
      `tests abandoned, to run again:  ${saved.tests ?? "none said"}`,
      ...(saved.merge ? [`merge to carry on first:  ${saved.merge}`] : []),
      ...listLines("its claimed files", agent.files ?? []),
      ...listLines("uncommitted, its own", saved.uncommitted),
      ...listLines(
        "committed, merged",
        saved.commits.filter(({ merged }) => merged).map(({ sha, subject }) => `${sha} ${subject}`)
      ),
      ...listLines(
        "committed, NOT merged yet",
        saved.commits.filter(({ merged }) => !merged).map(({ sha, subject }) => `${sha} ${subject}`)
      ),
      ...listLines("uncommitted and claimed by nobody:  maybe another's, check before touching", saved.unclaimed),
      ...(notes.length
        ? listLines(`notes from the person, not passed on (epic agents told ${agent.name})`, notes)
        : []),
      "Check git status and git log before going on:  commit only its own files, by path.",
      how
    ].join("\n")
  }

  /**
   * The checkout epic `epic`'s agents work in, seen from `root`:  its worktree, else the main checkout;
   * `root` itself with no epic.
   */
  static checkoutOf(root: string, epic: string | undefined): string {
    if (!epic) return root
    const config = EpicConfig.of(root)
    if (config.worktreeNameOf(root) === epic) return root
    return config.worktreesFolders.map((folder) => join(folder, epic)).find((path) => existsSync(path)) ?? config.main
  }

  ////////////////
  // ## What git says
  ////////////////

  /** `checkout`'s uncommitted files, new ones too, from its root;  `[]` when git can't say. */
  private static changedFiles(checkout: string): string[] {
    const changed = Git.lines(["-c", "core.quotepath=false", "diff", "--name-only", "--no-renames", "HEAD"], checkout)
    const added = Git.lines(["-c", "core.quotepath=false", "ls-files", "--others", "--exclude-standard"], checkout)
    return [...new Set([...changed, ...added])].sort()
  }

  /** The branch's own commits to `claims` since `started`, newest first;  `merged`:  in the base branch. */
  private static commitsTo(checkout: string, claims: string[], started: string): PausedWork["commits"] {
    if (!claims.length) return []
    // git rounds to seconds:  from the second it started in
    const since = `--since=${new Date(Math.floor(Date.parse(started) / 1000) * 1000).toISOString()}`
    const format = ["--format=%H %s", "--first-parent", "--no-merges", since, "HEAD", "--", ...claims]
    const found = Git.lines(["log", ...format], checkout)
    if (!found.length) return []
    const base = EpicConfig.of(checkout).baseBranch
    return found.map((line) => {
      const [sha = "", ...words] = line.split(" ")
      const merged = Git.run(["merge-base", "--is-ancestor", sha, base], checkout).ok
      return { sha: sha.slice(0, 9), subject: words.join(" "), merged }
    })
  }

  /** A merge left part way in `checkout`, and how to carry it on;  `undefined` for none. */
  private static mergeState(checkout: string): string | undefined {
    if (!Git.run(["rev-parse", "-q", "--verify", "MERGE_HEAD"], checkout).ok) return undefined
    const left = Git.lines(["diff", "--name-only", "--diff-filter=U"], checkout)
    const conflicts = left.length ? `conflicts left in ${left.join(", ")}` : "no conflicts left"
    return `a merge stopped part way, ${conflicts}:  settle them, git add each, then epic worktree merge-main --continue`
  }
}

/** `title`, then `lines` under it;  `title:  none` for none. */
function listLines(title: string, lines: string[]): string[] {
  return lines.length ? [`${title}:`, ...lines.map((line) => `  ${line.replace(/\n/g, "\n  ")}`)] : [`${title}:  none`]
}

/** An item or phase id in a task's words. */
const ITEM_ID = /\b[PTIQJMD]\d+\b/

/** What `AgentPause.save()` takes. */
export type PauseProps = {
  /** the checkout the command ran in */
  root: string
  /** the next step, in words */
  next: string
  /** the item or phase it's on */
  item?: string
  /** test runs abandoned */
  tests?: string
  /** the session pausing it */
  session?: string
  /** the time now, ms */
  now?: number
}
