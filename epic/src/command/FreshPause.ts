import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { DataFile } from "spell/server/DataFile"
// By package path, `.ts` and all:  the `SessionStart` hook and the window script load this file with plain `node`
import { ClaudeHome, type RunningSession } from "spell/epic/config/ClaudeHome.ts"
import { EpicHome } from "spell/epic/config/EpicHome.ts"
import { FreshAll, SESSION_ID } from "spell/epic/command/FreshAll.ts"

/****************
 * ### `FreshPause`
 * The PAUSE ROUND of `epic fresh all --pause` (epic `epic-engine` T139):  every running epic session pauses its agents
 * first, and only once all are quiet does `epic fresh all` hand them to fresh sessions.
 * - Owen, 2026-11-22:  "tell all active agent sessions that we are going to start epic fresh ASAP ... Once they are
 *   quiet, they should report back to the initiating agent.  Then that session runs epic fresh all."
 * - How it goes:
 *   1. `epic fresh all --pause` starts the round, its INITIATOR the session that ran it
 *   2. each session saves its agents (`epic agents pause`), then says it's quiet (`epic fresh quiet`),
 *      which prints the line to send the initiator
 *   3. all quiet:  `epic fresh all` runs as ever, its marks `paused`, and the round is over
 *   - `epic fresh cancel` ends it instead, at any point
 * - A session in the round is one of:
 *   - quiet:  it said so, and none of its epic's agents run
 *   - pausing:  not yet;  it holds the round up, however long it takes (Owen:  no skip after a timeout)
 *   - waiting:  on the person, so it can't read its message;  holds it up too
 *   - untold:  it started after the round did;  holds it up until `--pause` is run again
 *   - exited:  its process is gone;  holds nothing up
 * - One round a machine, in the epic home's `fresh-pause/`:  `round.json5`, and `quiet/<session id>` per session that
 *   reported, so no two sessions write one file
 * - No round:  `round()` is `undefined`, `holds()` false, and everything that asks behaves as it always did
 * - Its position:  node's own modules, the kit's `DataFile`, Claude's folder, the epic home and `FreshAll`, so plain
 *   `node` loads it.  It moves and messages nobody.
 * - STATIC:  the round is the machine's.  A test points the epic home elsewhere (`$SPELL_EPIC_HOME`).
 ****************/
export class FreshPause {
  /** The round's folder:  `<epic home>/fresh-pause/`. */
  static folder(): string {
    return EpicHome.subfolder(FOLDER)
  }

  ////////////////
  // ## The round
  ////////////////

  /** The round under way, or `undefined`.  NEVER throws:  one that won't read is none. */
  static round(): PauseRound | undefined {
    try {
      const round = DataFile.read<PauseRound>(join(FreshPause.folder(), ROUND_FILE))
      return round?.since && round.initiator && Array.isArray(round.sessions) ? round : undefined
    } catch {
      return undefined
    }
  }

  /**
   * Start a round for the `running` sessions, or tell the one under way about the new ones among them;  returns it.
   * - `initiator`:  who the sessions report back to;  it takes over a round already under way
   * - SIDE EFFECT:  a new round drops every mark of an earlier `epic fresh all`, so none goes fresh before all are quiet
   */
  static start({ initiator, running, now = Date.now() }: PauseStart): PauseRound {
    const before = FreshPause.round()
    if (!before) FreshPause.end()
    const sessions = [...(before?.sessions ?? [])]
    for (const session of running)
      if (!sessions.some((one) => one.sessionId === session.sessionId)) sessions.push(session)
    const round: PauseRound = { since: before?.since ?? new Date(now).toISOString(), initiator, sessions }
    mkdirSync(FreshPause.folder(), { recursive: true })
    DataFile.write(join(FreshPause.folder(), ROUND_FILE), round)
    for (const { sessionId } of FreshAll.allPending()) FreshAll.drop(sessionId)
    return round
  }

  /** The round is over, gone fresh or cancelled. */
  static end(): void {
    rmSync(FreshPause.folder(), { recursive: true, force: true })
  }

  /** Session `sessionId` says it's quiet.  Throws if that isn't a session id. */
  static markQuiet(sessionId: string, now = Date.now()): void {
    if (!SESSION_ID.test(sessionId)) throw new TypeError(`FreshPause.markQuiet():  '${sessionId}' isn't a session id`)
    mkdirSync(join(FreshPause.folder(), QUIET_FOLDER), { recursive: true })
    writeFileSync(FreshPause.quietFile(sessionId), new Date(now).toISOString())
  }

  /** When session `sessionId` said it was quiet, or `undefined`. */
  static quietAt(sessionId: string): string | undefined {
    const file = FreshPause.quietFile(sessionId)
    return existsSync(file) ? readFileSync(file, "utf8") : undefined
  }

  /**
   * Whether epic `epic` must start no new work:  it's in the round, or session `sessionId` paused and now waits to go
   * fresh (`epic fresh all`'s mark, `paused`).
   */
  static holds(epic: string | undefined, sessionId?: string): boolean {
    if (FreshAll.pending(sessionId)?.paused) return true
    return Boolean(epic && FreshPause.round()?.sessions.some((one) => one.epic === epic))
  }

  ////////////////
  // ## Where it stands
  ////////////////

  /**
   * Where each session of `round` stands, the ones started since (`running`) as untold.
   * - `cwd`:  where the epics' agents lists are found;  `live`:  Claude Code's running sessions
   * - a session is exited only when neither `running` nor `live` has it
   */
  static report(
    round: PauseRound,
    { running, cwd, live = ClaudeHome.liveSessions(), now = Date.now() }: PauseLook
  ): PauseReport {
    const minutes = Math.max(0, Math.floor((now - Date.parse(round.since)) / 60_000))
    const told = round.sessions.map((session): PauseState => {
      const { sessionId, epic } = session
      const record = live.find((one) => one.sessionId === sessionId)
      if (!record && !running.some((one) => one.sessionId === sessionId))
        return { ...session, state: "exited", why: "closed, so the restart won't wait for it" }
      const agents = FreshAll.runningAgents(epic, cwd)
      const still = agents.length ? `its agents are still working:  ${agents.join(", ")}` : ""
      if (FreshPause.quietAt(sessionId))
        return still ? { ...session, state: "pausing", why: still } : { ...session, state: "quiet", why: "paused" }
      if (record?.status === "waiting" || FreshAll.questionWaits(ClaudeHome.transcriptOf(sessionId)))
        return {
          ...session,
          state: "waiting",
          why: "needs your answer before it can pause.  Go to its window and answer there"
        }
      const since = `${minutes} minute${minutes === 1 ? "" : "s"} after the pause began`
      const why = `hasn't said it's paused, ${since}${still && `.  Also, ${still}`}`
      return { ...session, state: "pausing", why }
    })
    const untold = running
      .filter((one) => !round.sessions.some((session) => session.sessionId === one.sessionId))
      .map((session): PauseState => ({
        ...session,
        state: "untold",
        why: "started after the pause began, so it wasn't asked.  To ask it:  epic fresh all --pause"
      }))
    const sessions = [...told, ...untold]
    const outstanding = sessions.filter(({ state }) => state !== "quiet" && state !== "exited")
    return { sessions, outstanding, allQuiet: !outstanding.length }
  }

  /** Session `sessionId`'s quiet file. */
  private static quietFile(sessionId: string): string {
    return join(FreshPause.folder(), QUIET_FOLDER, sessionId)
  }
}

////////////////
// ## Types
////////////////

/** One session of a round. */
export type PauseSession = {
  /** the epic it runs */
  epic: string
  /** its address (`SendMessage`'s `to`) */
  session: string
  /** its id */
  sessionId: string
}

/** A round under way:  `fresh-pause/round.json5`. */
export type PauseRound = {
  /** when it began, ISO */
  since: string
  /** who started it, and is reported back to:  any session, an epic's or not */
  initiator: Omit<PauseSession, "epic"> & { epic?: string }
  /** every running epic session told, the initiator's own too */
  sessions: PauseSession[]
}

/** What `FreshPause.start()` takes. */
export type PauseStart = {
  /** who the sessions report back to */
  initiator: PauseRound["initiator"]
  /** the epic sessions running now */
  running: PauseSession[]
  /** the time now, ms */
  now?: number
}

/** What `FreshPause.report()` looks at. */
export type PauseLook = {
  /** the epic sessions running now */
  running: PauseSession[]
  /** where the epics' agents lists are found */
  cwd: string
  /** Claude Code's running sessions;  default its registry */
  live?: RunningSession[]
  /** the time now, ms */
  now?: number
}

/** One session, as the round sees it. */
export type PauseState = PauseSession & {
  /** see `FreshPause` */
  state: "quiet" | "pausing" | "waiting" | "untold" | "exited"
  /** the same in words, for the person */
  why: string
}

/** Where a whole round stands. */
export type PauseReport = {
  /** every session of it */
  sessions: PauseState[]
  /** those holding it up */
  outstanding: PauseState[]
  /** none holds it up:  `epic fresh all` may run */
  allQuiet: boolean
}

/** The epic home's folder of the round. */
const FOLDER = "fresh-pause"

/** The round's file, in it. */
const ROUND_FILE = "round.json5"

/** The folder of the sessions that said they're quiet, in it. */
const QUIET_FOLDER = "quiet"
