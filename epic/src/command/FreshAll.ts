import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import JSON5 from "json5"

// By package path, `.ts` and all:  the `Stop` hook (`hooks/fresh-wait.mjs`) loads this file with plain `node`
import { EpicConfig } from "spell/epic/config/EpicConfig.ts"
import { EpicHome } from "spell/epic/config/EpicHome.ts"
import { Transcript } from "spell/epic/config/Transcript.ts"

/****************
 * ### `FreshAll`
 * `/epic fresh all` (epic `epic-engine` T113):  every running epic session hands itself to a fresh session,
 * each at its first CLEAR MOMENT.
 * - Owen, 2026-11-19:  "anything not actively working or interacting with me ... does it immediately, others do it on
 *   their next clear moment"
 * - How it goes:
 *   1. `epic fresh all` (`FreshCommands`) marks every running epic session as PENDING here, one file each,
 *      `fresh-pending/<session id>` in the epic home, and prints a `TELL:` line for each, which the skill sends
 *   2. the message wakes the session;  it finishes what it's doing and ends its turn
 *   3. at every turn's end, the `Stop` hook `hooks/fresh-wait.mjs` (in the background, `asyncRewake`) waits, while the
 *      session is pending, for its clear moment (`whyNot()`), then wakes it:  "run /epic fresh now"
 *   4. `/epic fresh` runs `epic window fresh <epic>`, which ends the wait (`drop()`)
 * - CLEAR (`whyNot()` says why not), Owen's refinement, 2026-11-19:
 *   - none of the epic's agents running (its `agents.json5`, as `epic agents` lists them)
 *   - no question from it waiting on the person (an `AskUserQuestion` with no answer)
 *   - no prompt from the person in the last `RECENT_MS`:  they may be typing to it
 *   - not mid-turn:  the hook only waits between turns, and gives up once the transcript grows
 *   - the person working on its epic PAGE is no reason to wait:  their marks and Sends sit in the inbox, and the new
 *     session reads them
 * - The session that typed `/epic fresh all` (`self`) goes LAST:  its own prompt doesn't count, and it waits for the
 *   others of its round, at most `SELF_WAIT_MS`
 * - Wakes a session at most once per `WAKE_GAP_MS` (`woken`):  a refused `epic window fresh` never loops
 * - After a pause round (`FreshPause`, epic `epic-engine` T139) the marks are `paused`:  the agents each session saved
 *   don't count as running, and wait for the fresh session
 * - Its position:  node's own modules, `json5`, and the epic config, home and transcript readers, by their `.ts` names
 *   (plain `node`);  NEVER the sessions finder, which needs `tsx`
 * - STATIC:  the marks are the machine's.  A test points the epic home elsewhere (`$SPELL_EPIC_HOME`).
 ****************/
export class FreshAll {
  /** The folder of pending marks:  `<epic home>/fresh-pending/`. */
  static folder(): string {
    return EpicHome.subfolder(FOLDER)
  }

  ////////////////
  // ## The marks
  ////////////////

  /** Mark session `sessionId` pending, for epic `epic`;  returns the mark.  `self`:  the session that asked. */
  static mark(
    sessionId: string,
    epic: string,
    { self = false, paused = false, round = "", now = Date.now() } = {}
  ): FreshMark {
    if (!SESSION_ID.test(sessionId)) throw new TypeError(`FreshAll.mark():  '${sessionId}' isn't a session id`)
    const mark: FreshMark = {
      epic,
      since: new Date(now).toISOString(),
      round,
      ...(self && { self }),
      ...(paused && { paused })
    }
    mkdirSync(FreshAll.folder(), { recursive: true })
    writeFileSync(FreshAll.fileOf(sessionId), `${JSON.stringify(mark, null, 2)}\n`)
    return mark
  }

  /** Session `sessionId`'s mark, or `undefined` when it's not pending.  NEVER throws. */
  static pending(sessionId: string | undefined): FreshMark | undefined {
    if (!sessionId || !SESSION_ID.test(sessionId)) return undefined
    try {
      return JSON.parse(readFileSync(FreshAll.fileOf(sessionId), "utf8")) as FreshMark
    } catch {
      return undefined
    }
  }

  /** Every pending session, `{ sessionId, mark }`. */
  static allPending(): { sessionId: string; mark: FreshMark }[] {
    const folder = FreshAll.folder()
    if (!existsSync(folder)) return []
    return readdirSync(folder)
      .filter((name) => SESSION_ID.test(name))
      .flatMap((sessionId) => {
        const mark = FreshAll.pending(sessionId)
        return mark ? [{ sessionId, mark }] : []
      })
  }

  /** Session `sessionId` is no longer pending:  it's handing itself on (`epic window fresh`), or was let off.  NEVER throws. */
  static drop(sessionId: string | undefined): void {
    if (!sessionId || !SESSION_ID.test(sessionId)) return
    rmSync(FreshAll.fileOf(sessionId), { force: true })
  }

  /** Note that session `sessionId` was woken at `now`, so it isn't woken again within `WAKE_GAP_MS`. */
  static noteWoken(sessionId: string, now = Date.now()): void {
    const mark = FreshAll.pending(sessionId)
    if (!mark) return
    writeFileSync(
      FreshAll.fileOf(sessionId),
      `${JSON.stringify({ ...mark, woken: new Date(now).toISOString() }, null, 2)}\n`
    )
  }

  ////////////////
  // ## The clear moment
  ////////////////

  /**
   * Why session `sessionId`, pending as `mark`, isn't at a clear moment now:  a few words, or `null` when it's clear.
   * - `transcript`:  its transcript file;  missing, only the agents count
   * - `cwd`:  where its epic's agents list is found (the checkout's epic folder)
   * - NEVER throws:  what it can't read doesn't hold it back
   */
  static whyNot(
    sessionId: string,
    mark: FreshMark,
    { transcript, cwd = process.cwd(), now = Date.now() }: { transcript?: string; cwd?: string; now?: number } = {}
  ): string | null {
    const agents = FreshAll.runningAgents(mark.epic, cwd)
    if (agents.length) return `its agents are running (${agents.join(", ")})`
    const text = FreshAll.tailOf(transcript)
    if (FreshAll.questionIn(text)) return "a question from it waits on you"
    const since = Date.parse(mark.since)
    const prompt = text ? FreshAll.lastPrompt(text) : undefined
    // the session that asked:  its own `/epic fresh all` isn't the person talking to it
    const counted = prompt !== undefined && !(mark.self && prompt <= since + SELF_SLACK_MS) ? prompt : undefined
    if (counted !== undefined && now - counted < RECENT_MS) return "you wrote to it in the last few minutes"
    if (mark.self && now - since < SELF_WAIT_MS) {
      const others = FreshAll.allPending().filter((one) => one.sessionId !== sessionId && one.mark.round === mark.round)
      if (others.length) return `it goes last:  ${others.length} other session(s) still to go`
    }
    return null
  }

  /** Whether a question from the session with transcript `transcript` waits on the person.  NEVER throws. */
  static questionWaits(transcript: string | undefined): boolean {
    return FreshAll.questionIn(FreshAll.tailOf(transcript))
  }

  /**
   * The `Stop` hook's wait:  resolves to the line that wakes session `sessionId` once it's at a clear moment, or `null`
   * when it should stop waiting.
   * - stops (`null`):  not pending, woken lately (`mayWake()`), the mark gone, a newer waiter took over, the transcript
   *   grew (a new turn:  ITS end starts the wait again), or `giveUpMs` passed
   * - one waiter per session:  `<session id>.waiter` names this one (`waiter`, the process id by default)
   * - looks every `everyMs`;  `sleep` and `now` are the test's to stub
   * - SIDE EFFECT:  notes the wake (`noteWoken()`) before resolving to the line
   * - NEVER throws
   */
  static async waitForClear({
    sessionId,
    transcript,
    cwd,
    waiter = String(process.pid),
    everyMs = WAIT_EVERY_MS,
    giveUpMs = GIVE_UP_MS,
    sleep = (ms: number) => new Promise<void>((done) => setTimeout(done, ms)),
    now = () => Date.now()
  }: FreshWait): Promise<string | null> {
    try {
      const first = FreshAll.pending(sessionId)
      if (!first || !FreshAll.mayWake(first, now())) return null
      const claim = join(FreshAll.folder(), `${sessionId}.waiter`)
      writeFileSync(claim, waiter)
      const sizeOf = () => (transcript ? (statSync(transcript, { throwIfNoEntry: false })?.size ?? 0) : 0)
      const size = sizeOf()
      const start = now()
      while (now() - start < giveUpMs) {
        const mark = FreshAll.pending(sessionId)
        if (!mark || readFileSync(claim, "utf8") !== waiter || sizeOf() !== size) return null
        if (FreshAll.whyNot(sessionId, mark, { transcript, cwd, now: now() }) === null) {
          FreshAll.noteWoken(sessionId, now())
          return FreshAll.wakeLine(mark)
        }
        await sleep(everyMs)
      }
      return null
    } catch {
      return null
    }
  }

  /** Whether a pending session may be woken now:  not woken in the last `WAKE_GAP_MS`. */
  static mayWake(mark: FreshMark, now = Date.now()): boolean {
    return !mark.woken || now - Date.parse(mark.woken) >= WAKE_GAP_MS
  }

  /** The line that wakes a session at its clear moment, for Claude. */
  static wakeLine(mark: FreshMark): string {
    const paused = mark.paused ? "  Its paused agents stay saved:  don't restart them, the new session does." : ""
    return (
      `/epic fresh all:  this session is clear now (no agents running, nothing waiting on the person, no prompt from ` +
      `them in the last few minutes):  run /epic fresh for ${mark.epic} now, the epic skill's "16. Fresh";  ` +
      "refused (no window ...):  `epic fresh drop`, and say why in one line." +
      paused
    )
  }

  /**
   * The names of epic `epic`'s agents still running:  its `agents.json5` beside its page, in the epic folder of the
   * checkout at `cwd` (`epic agents`' list), less the paused ones;  `[]` when there's none or it won't read.
   */
  static runningAgents(epic: string, cwd: string): string[] {
    return FreshAll.listedAgents(epic, cwd).flatMap(({ name, paused }) => (paused ? [] : [name]))
  }

  /** The names of epic `epic`'s paused agents (`epic agents pause`), from the same list. */
  static pausedAgents(epic: string, cwd: string): string[] {
    return FreshAll.listedAgents(epic, cwd).flatMap(({ name, paused }) => (paused ? [name] : []))
  }

  /** Epic `epic`'s agents list, the entries with a name;  `[]` when there's none or it won't read. */
  private static listedAgents(epic: string, cwd: string): { name: string; paused?: object }[] {
    try {
      const file = join(EpicConfig.contentOf(cwd), "epics", epic, AGENTS_FILE)
      if (!existsSync(file)) return []
      const agents = JSON5.parse(readFileSync(file, "utf8"))
      return Array.isArray(agents) ? agents.filter((agent) => agent?.name) : []
    } catch {
      return []
    }
  }

  /**
   * When the person last sent a prompt, in ms, in transcript text `text`;  `undefined` for none.
   * - a `user` entry with text that isn't the harness's (`isMeta`:  skills, another session's message), nor a
   *   tool result, nor an agent's (`isSidechain`)
   * - a prompt sent mid-turn:  a `queued_command` attachment from a human (as `Requests.promptBlocks()` reads it)
   * - static:  pure
   */
  static lastPrompt(text: string): number | undefined {
    let last: number | undefined
    for (const line of text.split("\n")) {
      if (!line.includes('"user"') && !line.includes('"queued_command"')) continue
      const entry = Transcript.parseLine(line)
      if (entry.isSidechain || entry.isMeta || typeof entry.timestamp !== "string") continue
      if (!FreshAll.isPrompt(entry)) continue
      const at = Date.parse(entry.timestamp)
      if (!Number.isNaN(at)) last = at
    }
    return last
  }

  /** Whether transcript entry `entry` is a prompt the person sent (see `lastPrompt()`). */
  private static isPrompt(entry: Record<string, unknown>): boolean {
    if (entry.type === "attachment") {
      const queued = entry.attachment as { type?: string; origin?: { kind?: string } } | undefined
      return queued?.type === "queued_command" && (queued.origin?.kind ?? "human") === "human"
    }
    if (entry.type !== "user") return false
    const origin = entry.origin as { kind?: string } | undefined
    if (origin?.kind && origin.kind !== "human") return false
    const blocks = Transcript.blocksOf(entry.message)
    if (blocks.some((block) => block.type === "tool_result")) return false
    const words = blocks
      .filter((block) => block.type === "text")
      .map((block) => (block.text ?? "").replace(/<(system-reminder|ide_selection|ide_opened_file)>.*?<\/\1>/gs, ""))
      .join("")
      .trim()
    return Boolean(words) && (!words.startsWith("<") || words.includes("<command-name>"))
  }

  /** Whether a question waits on the person in transcript text `text`. */
  private static questionIn(text: string | undefined): boolean {
    return Boolean(text && Transcript.pendingQuestion(text))
  }

  /** The end of transcript `transcript` (`TAIL_BYTES`), or `undefined` when there's none. */
  private static tailOf(transcript: string | undefined): string | undefined {
    try {
      if (!transcript || !statSync(transcript, { throwIfNoEntry: false })) return undefined
      return new Transcript(transcript).tail(TAIL_BYTES)
    } catch {
      return undefined
    }
  }

  /** Session `sessionId`'s mark file. */
  private static fileOf(sessionId: string): string {
    return join(FreshAll.folder(), sessionId)
  }
}

/** A pending session's mark:  `fresh-pending/<session id>`. */
export type FreshMark = {
  /** the epic it hands on */
  epic: string
  /** when `epic fresh all` marked it, ISO */
  since: string
  /** the `epic fresh all` it came from:  the asking session's id and time;  the asker waits for the rest of its round */
  round: string
  /** the session that typed `/epic fresh all`:  it goes last */
  self?: boolean
  /** its agents were paused first (`epic fresh all --pause`):  it starts nothing, and the new session restarts them */
  paused?: boolean
  /** when the hook last woke it, ISO */
  woken?: string
}

/** What `FreshAll.waitForClear()` takes:  the `Stop` hook's input, and the test's stubs. */
export type FreshWait = {
  /** the session */
  sessionId: string
  /** its transcript */
  transcript?: string
  /** its folder:  where its epic's agents list is found */
  cwd?: string
  /** this waiter's name in the claim file;  default the process id */
  waiter?: string
  /** how often it looks, in ms */
  everyMs?: number
  /** how long before it gives up, in ms */
  giveUpMs?: number
  /** waits `ms`;  a test's resolves at once */
  sleep?: (ms: number) => Promise<void>
  /** the time now, in ms */
  now?: () => number
}

/** How often the `Stop` hook's wait looks again. */
const WAIT_EVERY_MS = 30 * 1000

/** How long the `Stop` hook's wait lasts before it gives up:  the next turn's end starts another. */
const GIVE_UP_MS = 12 * 60 * 60 * 1000

/** The epic home's folder of pending marks. */
const FOLDER = "fresh-pending"

/** An epic's running-agents list, beside its page:  `AgentList`'s `LIST_FILE`. */
const AGENTS_FILE = "agents.json5"

/** How recent a prompt from the person keeps a session waiting:  they may be typing to it. */
export const RECENT_MS = 5 * 60 * 1000

/** The longest the asking session waits for the others of its round. */
const SELF_WAIT_MS = 10 * 60 * 1000

/** How long after it was marked the asking session's own prompt may be dated (the prompt comes just before the mark). */
const SELF_SLACK_MS = 60 * 1000

/** The least time between two wakes of one session:  a refused handoff never loops. */
const WAKE_GAP_MS = 30 * 60 * 1000

/** How much of a transcript's end is read:  the last prompts and the question waiting are there. */
const TAIL_BYTES = 2 * 1024 * 1024

/** A Claude Code session id:  also what keeps a mark's file name plain. */
export const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
