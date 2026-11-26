/**
 * `epic agents <verb> ...`:  the running-agents list of this checkout's epic, else of the checkout (epic
 * `skillz`;  `AgentList.ts`).  Claude sessions call it as they start and finish background agents (`/bg`, the root
 * `CLAUDE.md`'s rule), and so do the agents they start.
 *
 *     epic agents add aaa "docstrings in string.ts" [--status "blocked on skillz-bbb"] [--task-id <id>]
 *     skillz-aaa
 *     epic agents list
 *     skillz-aaa  active  3m  docstrings in string.ts
 *
 * - `add <name> "<task>"`:  prints the full name (`skillz-aaa`);  exits 1 if it's running already
 * - `set <name> [--status active | "blocked on <name>"] [--task-id <id>]`, `done <name>`:  exit 1 if it isn't running
 *   - `done` of one its epic's log says finished already (the agent marked ITSELF done):  says so, exit 0 (I288)
 * - `done <name>` also says how long the agent WORKED, from its transcript (`WorkTime.ofAgent()`, epic `epic-engine`
 *   P41):  `skillz-aaa done:  took 21m`, and an epic's list logs it on the epic page;  best effort:  nothing found,
 *   nothing said
 * - `list [--json]` (default):  one line each, oldest first (`--json`:  the entries)
 * - `last <name>`:  exit 0 when no OTHER agent of the list runs (`name` is the last one standing, and runs the full test
 *   suite after it merges);  exit 1, listing them, when others do (epic `epic-engine` T90)
 * - `wait [--every <s>] [--max <s>] [--json]`:  run in the BACKGROUND (Bash `run_in_background`) while agents run;
 *   exits when Owen has sent one a note from the epic page's agents popover (`agentRoutes.ts`), which wakes the session:
 *   - 0:  untold redirects, printed `skillz-aaa:  <note>` (`--json`:  `[{ name, note, at }]`);  the session sends
 *     each to its agent (`SendMessage`), then `told <name>`
 *   - 3:  no agents running any more:  nothing to wait for
 *   - 2:  `--max` seconds passed (default 3600);  polls every `--every` (default 2)
 * - `told <name>`:  its redirects were passed on;  the page shows them "told"
 * - CLAIMS (epic `epic-engine` T77):  the files an agent is changing, so no two change one, and no merge moves one
 *   aside from under it:
 *   - `claim <name> <path...>`:  a file, a folder or a glob each, from the checkout's root;  exit 1, naming the other
 *     agent, if one claims any of them already:  nothing claimed
 *   - `add ... --files <path,path...>`:  claimed as it starts
 *   - `claims [--json]`:  every running agent's, one line each
 *   - they go with the agent (`done`)
 * - PAUSE (epic `epic-engine` T139), for `epic fresh all --pause`:
 *   - `pause <name> --next "<step>" [--item <id>] [--tests "<runs abandoned>"]`:  saved as it stands (`AgentPause`):
 *     task, item, claims, uncommitted files, commits and whether each is merged, a merge left part way, the next step
 *   - `resume <name>`:  paused no more, its brief printed to start it again;  once, and never during a round
 *   - `add` and `resume` exit 1 while a round holds the epic:  a paused session starts no new work
 *   - `done` of a paused one exits 1 (`--finished`:  its whole task really is done)
 * - A FRESH WAITING for this session's agents (`epic fresh later`, epic `epic-engine` T172):
 *   - `add` exits 1:  new work waits for the fresh session (`epic queue <epic> <id> "after the fresh"`)
 *   - `done` of the last one says to go fresh now (`FreshAll.afterAgent()`), or why it still waits
 * - `--epic <name>`, any verb:  that epic's list, e.g. from the main checkout;  default:  the worktree's epic, if any
 * - Which checkout:  the one this file is in, which `epic` picks from the current folder (`EpicTools.run()`)
 */
import { waitUntil } from "spell/util/timing"
import { ClaudeHome } from "spell/epic/config/ClaudeHome"
import { EpicCommandError, duration, parseVerbArgs, stringFlag } from "spell/epic/command/command.types"
import { AFTER_FRESH, FreshAll } from "spell/epic/command/FreshAll"
import { FreshPause } from "spell/epic/command/FreshPause"
import { WorkTime } from "spell/epic/command/WorkTime"
import { PlanDocFiles } from "spell/epic/tool/PlanDocFiles"
import { PlanTime } from "spell/epic/tool/PlanTime"

import { AgentList, AgentListError, type RunningAgent, type Untold } from "./AgentList"
import { AgentPause } from "./AgentPause"
import { ROOT } from "./pages.js"

const { positional, flags } = parseVerbArgs(process.argv.slice(2))
process.exitCode = await run(positional, flags)

/** Run verb `positional[0]` with its arguments;  returns the exit code. */
async function run(
  [verb = "list", name, task, ...more]: string[],
  flags: Record<string, string | true>
): Promise<number> {
  const list = new AgentList(ROOT, { epic: stringFlag(flags.epic) })
  const status = stringFlag(flags.status)
  const taskId = stringFlag(flags.taskId)
  const files = (stringFlag(flags.files) ?? "").split(",").filter(Boolean)
  try {
    if (verb === "list") {
      const agents = list.agents
      if (flags.json) console.log(JSON.stringify(agents, null, 2))
      else if (!agents.length) console.log(`no agents running (${list.prefix})`)
      else for (const agent of agents) console.log(agentLine(agent))
      return 0
    }
    if (verb === "wait") return await waitForRedirects(list, flags)
    if (verb === "claims") {
      const claims = list.claims
      if (flags.json) console.log(JSON.stringify(claims, null, 2))
      else if (!claims.length) console.log(`no files claimed (${list.prefix})`)
      else for (const { name, path } of claims) console.log(`${name}  ${path}`)
      return 0
    }
    if (!name || (verb === "add" && !task)) return usage()
    if (verb === "last") return lastStanding(list, name)
    if (verb === "pause") return pauseAgent(list, name, flags)
    if (verb === "resume") return resumeAgent(list, name)
    if (verb === "add" && FreshPause.holds(list.epic, process.env.CLAUDE_CODE_SESSION_ID)) return heldByPause()
    if (verb === "add" && list.epic && FreshAll.pending(process.env.CLAUDE_CODE_SESSION_ID)?.solo) {
      return heldByFresh(list.epic)
    }
    if (verb === "add") console.log(list.add(name, task!, { status, taskId, files }).name)
    else if (verb === "claim") {
      if (!task) return usage()
      console.log(list.claim(name, [task, ...more]).join("\n"))
    } else if (verb === "set") list.set(name, { status, taskId })
    else if (verb === "done") {
      // Done already, by the agent itself (I288):  said, not an error
      const already = list.agents.some((agent) => agent.name === list.fullName(name)) ? undefined : list.doneSaid(name)
      if (already) console.log(`${list.fullName(name)} was marked done already:  ${already}`)
      else await recordTook(list, list.done(name, { finished: Boolean(flags.finished) }))
      freshAfterDone(list.epic)
    } else if (verb === "told") list.told(name)
    else return usage()
    return 0
  } catch (error) {
    // a time `wait` can't read (`duration()`):  a usage error
    if (error instanceof EpicCommandError) {
      console.error(error.message)
      return error.exitCode
    }
    if (!(error instanceof AgentListError)) throw error
    console.error(error.message)
    return 1
  }
}

/**
 * `wait`:  poll `list` until a redirect is untold (0, printed), no agent runs (3), or `--max` passes (2).
 * - `--every` (default 2) and `--max` (default 3600):  seconds, or a time with its unit (`duration()`:  `30s`, `2h`)
 * - reads the file without its lock:  writes are atomic renames, so a read never sees half a file
 */
async function waitForRedirects(list: AgentList, flags: Record<string, string | true>): Promise<number> {
  // Until a redirect is untold or no agent runs, looking every `--every`;  gives up after `--max`
  const found = await waitUntil(() => (list.untold.length ? "untold" : !list.running.length ? "none" : undefined), {
    timeout: duration(stringFlag(flags.max) ?? "3600") / 1000,
    every: duration(stringFlag(flags.every) ?? "2") / 1000
  })
  if (found === "untold") {
    const untold = list.untold
    console.log(flags.json ? JSON.stringify(untold, null, 2) : untold.map(redirectLines).join("\n"))
    return 0
  }
  if (found === "none") {
    console.log(`no agents running (${list.prefix}):  nothing to wait for`)
    return 3
  }
  return 2
}

/**
 * `pause <name>`:  saved as it stands, so any session can start it again;  exit 2 without its next step.
 * - works with no round too:  pausing only ever saves
 */
function pauseAgent(list: AgentList, name: string, flags: Record<string, string | true>): number {
  const next = stringFlag(flags.next)?.trim()
  if (!next) {
    console.error('usage:  epic agents pause <name> --next "<what it does next>" [--item <id>] [--tests "<...>"]')
    return 2
  }
  const { agent, saved } = AgentPause.save(list, name, {
    root: ROOT,
    next,
    item: stringFlag(flags.item),
    tests: stringFlag(flags.tests),
    session: process.env.CLAUDE_CODE_SESSION_ID
  })
  const open = saved.commits.filter(({ merged }) => !merged).length
  console.log(
    `${agent.name} paused and saved:  ${saved.uncommitted.length} uncommitted file(s), ` +
      `${saved.commits.length} commit(s), ${open} not merged;  next:  ${saved.next}`
  )
  return 0
}

/** `resume <name>`:  paused no more, and the brief that starts it again;  exit 1 while a pause round is under way. */
function resumeAgent(list: AgentList, name: string): number {
  const session = process.env.CLAUDE_CODE_SESSION_ID
  if (FreshPause.round() || FreshPause.holds(list.epic, session)) return heldByPause()
  console.log(AgentPause.brief(list.resume(name, { session }), { session }))
  return 0
}

/** Refused:  a pause round, or this paused session's own wait to go fresh;  exit 1. */
function heldByPause(): number {
  console.error(
    "epic agents:  paused for epic fresh all --pause:  no agent starts until it's over " +
      "(`epic fresh status`;  `epic fresh cancel` calls it off)"
  )
  return 1
}

/**
 * `last <name>`:  is agent `name` the last one of its epic still running?  0 when it is, so it runs the full test suite
 * after merging;  1 when others run, each listed, so it leaves the full suite to the last of them (epic `epic-engine`
 * T90).
 */
function lastStanding(list: AgentList, name: string): number {
  const others = list.othersThan(name)
  if (!others.length) {
    console.log(`${list.fullName(name)} is the last agent running (${list.prefix}):  run the full test suite`)
    return 0
  }
  console.log(`${others.length} other agent(s) still running (${list.prefix}):  the last of them runs the full suite`)
  for (const agent of others) console.log(`  ${agentLine(agent)}`)
  return 1
}

/** `add` while this session waits to go fresh (T172):  exit 1, saying where new work goes. */
function heldByFresh(epic: string): number {
  console.error(
    `epic agents:  this session goes fresh once ${epic}'s agents are done:  no agent starts meanwhile;  ` +
      `queue the work for the fresh session (\`epic queue ${epic} <id> "${AFTER_FRESH}"\`), ` +
      "or call the fresh off (`epic fresh drop`)"
  )
  return 1
}

/**
 * After an agent of epic `epic` is done:  this session waiting to go fresh (`epic fresh later`, T172) is told to go now,
 * or why it still waits (`FreshAll.afterAgent()`);  nothing when no fresh waits.  NEVER throws.
 */
function freshAfterDone(epic: string | undefined): void {
  try {
    const sessionId = process.env.CLAUDE_CODE_SESSION_ID
    const transcript = sessionId ? ClaudeHome.transcriptOf(sessionId) : undefined
    const next = FreshAll.afterAgent(sessionId, epic, { transcript, cwd: ROOT })
    if (!next) return
    if ("go" in next) console.log(next.go)
    else console.log(`the fresh still waits:  ${next.wait};  the end-of-turn hook wakes this session once it's clear`)
  } catch (error) {
    console.error(`epic agents done:  ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Say how long finished agent `agent` worked (its transcript, `WorkTime.ofAgent()`):  printed, and logged on its
 * epic's page when the list is an epic's (`Agent skillz-aaa done:  took 21m`).
 * - best effort, NEVER throws:  no transcript found, nothing said;  a page that won't take the line, a warning
 */
async function recordTook(list: AgentList, agent: RunningAgent): Promise<void> {
  try {
    const minutes = new WorkTime().ofAgent(agent.name, { epic: list.epic })
    if (!minutes) return
    const line = `${agent.name} done:  took ${PlanTime.formatMinutes(minutes)}`
    console.log(line)
    if (!list.epic) return
    const files = new PlanDocFiles({ root: ROOT })
    await files.edit(files.findDoc(list.epic), (plan) => plan.log(`Agent ${line}`))
  } catch (error) {
    console.error(`epic agents done:  no time recorded:  ${error instanceof Error ? error.message : String(error)}`)
  }
}

/** An untold redirect as `wait` prints it:  `skillz-aaa:  <note>`, a note's later lines indented. */
function redirectLines({ name, note }: Untold): string {
  return `${name}:  ${note.replace(/\n/g, "\n  ")}`
}

/** One agent as `list` prints it:  `skillz-aaa  active  3m  docstrings in string.ts`. */
function agentLine(agent: RunningAgent, now = Date.now()): string {
  return `${agent.name}  ${agent.status}  ${age(now - Date.parse(agent.started))}  ${agent.task}`
}

/** `ms` as a short age:  `40s`, `3m`, `2h 5m`. */
function age(ms: number): string {
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return `${Math.max(0, Math.floor(ms / 1000))}s`
  if (minutes < 60) return `${minutes}m`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

/** Print how to call it;  exit code 2, a usage error, as the other `epic` groups' tools. */
function usage(): number {
  console.error(
    'usage:  epic agents add <name> "<task>" [--status ...] [--task-id <id>] [--files <path,...>] | ' +
      "set <name> [--status ...] [--task-id <id>] | claim <name> <path...> | claims [--json] | done <name> [--finished] | " +
      "pause <name> --next <step> [--item <id>] [--tests <runs>] | resume <name> | " +
      "list [--json] | last <name> | wait[--every <s>] [--max <s>] [--json] | told <name>   " +
      "(any verb:  [--epic <name>])"
  )
  return 2
}
