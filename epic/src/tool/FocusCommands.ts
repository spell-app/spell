import { Requests } from "spell/epic/command/Requests"
import { FocusMode } from "spell/epic/config/FocusMode"
import { PlanDocError } from "./planDoc.types"

import { FocusSummary, type EpicFocusSummary } from "./FocusSummary"
import type { Flags, PlanDocCommands } from "./PlanDocCommands"
import type { EpicListing, PlanDocFiles } from "./PlanDocFiles"

/****************
 * ### `FocusCommands`
 * `epic focus on | off | status | summary` (epic `epic-engine` T93):  focus mode's switch, and what each running epic
 * session is told, for `/focus` and `/back` (their SKILL.md files).
 * - `on [--why "..."]`:  the switch on (`FocusMode`), then a `TELL:` line for each running epic session:  keep building
 *   what's in flight, merge what's clean, ask Owen nothing
 * - `off`:  the switch off, then a `TELL:` line for each running epic session:  post your own status in your window;
 *   and the epics with no session that had something happen, a line each (`FocusSummary.oneLine()`)
 * - `status [--json]`:  on or off, since when, why
 * - `summary [<epic>] [--since <time>] [--json]`:  what happened on an epic since focus started (`FocusSummary`);
 *   no epic:  a line for each epic in progress that had something happen
 * - The `TELL:` lines are printed, never sent:  the skill sends each with `SendMessage`, as `epic migrate --notify`'s
 *   are;  the session running the command is left out, and named as `this session:` when it's one of them
 * - The running sessions:  `PlanDocCommands`' `sessionsOf` (the `epic` command's `Sessions.ofEpic()`);  a test hands
 *   in its own
 ****************/
export class FocusCommands {
  /** the epic-page command line this belongs to:  its files, output and running sessions.  STATIC */
  readonly owner: PlanDocCommands

  constructor(owner: PlanDocCommands) {
    this.owner = owner
  }

  /** The checkout's epic pages. */
  get files(): PlanDocFiles {
    return this.owner.files
  }

  /** `focus <verb> ...`, `positional` after `focus`;  resolves to the exit code, `undefined` for 0. */
  async run([verb = "status", ...rest]: string[], flags: Flags): Promise<number | void> {
    const json = Boolean(flags.json)
    switch (verb) {
      case "status":
        return this.status(json)
      case "on":
        return this.on(stringOf(flags.why), json)
      case "off":
        return this.off(json)
      case "summary":
        return this.summary(rest[0], stringOf(flags.since), json)
      default:
        throw new PlanDocError(`focus what?  on | off | status | summary (not '${verb}')`)
    }
  }

  ////////////////
  // ## The verbs
  ////////////////

  /** `status`:  on or off, since when. */
  private status(json: boolean): void {
    const state = FocusMode.read()
    if (json) return this.owner.print(JSON.stringify(state ?? { on: false }, null, 2))
    if (!state) return this.owner.print("focus off (never on)")
    const why = state.why ? `:  ${state.why}` : ""
    this.owner.print(
      state.on ? `focus on since ${state.since}${why}` : `focus off (last on ${state.since} to ${state.ended}${why})`
    )
  }

  /** `on`:  the switch on, and a `TELL:` line for each running epic session. */
  private async on(why: string | undefined, json: boolean): Promise<void> {
    const state = FocusMode.on({ why })
    const sessions = await this.runningSessions()
    const tell = sessions.others.map(({ epic, session }) => ({ epic, session, line: FocusMode.onMessage(state) }))
    if (json) return this.owner.print(JSON.stringify({ state, tell, self: sessions.self }, null, 2))
    this.owner.print(`focus on since ${state.since}${state.why ? `:  ${state.why}` : ""}`)
    this.printTell(tell, sessions.self, "follow the focus line yourself until /back")
  }

  /** `off`:  the switch off;  a `TELL:` line for each running epic session;  a line for each idle epic with news. */
  private async off(json: boolean): Promise<number | void> {
    const state = FocusMode.off()
    if (!state) {
      this.owner.warn("epic:  focus mode isn't on")
      return 1
    }
    const sessions = await this.runningSessions()
    const tell = sessions.others.map(({ epic, session }) => ({
      epic,
      session,
      line: FocusMode.backMessage(epic, state)
    }))
    const running = new Set([...sessions.others, ...sessions.self].map(({ epic }) => epic))
    const idle = this.newsSince(
      this.inProgress().filter((listing) => !running.has(listing.name)),
      new Date(state.since)
    )
    if (json) return this.owner.print(JSON.stringify({ state, tell, self: sessions.self, idle }, null, 2))
    this.owner.print(`focus off:  it ran ${state.since} to ${state.ended}`)
    this.printTell(tell, sessions.self, "post your own epic's status here (`epic focus summary <epic>`)")
    if (idle.length) {
      this.owner.print("NO SESSION:  epics with news and nobody running them")
      for (const summary of idle) this.owner.print(`  ${FocusSummary.oneLine(summary)}`)
    }
  }

  /** `summary [<epic>]`:  one epic's lines (or JSON);  no epic, a line each for the epics in progress with news. */
  private summary(epic: string | undefined, sinceText: string | undefined, json: boolean): void {
    const since = this.sinceOf(sinceText)
    if (!epic) {
      const news = this.newsSince(this.inProgress(), since)
      if (json) return this.owner.print(JSON.stringify(news, null, 2))
      return this.owner.print(
        news.length
          ? news.map((one) => FocusSummary.oneLine(one)).join("\n")
          : `nothing new since ${since.toISOString()}`
      )
    }
    const summary = this.summaryOf(epic, this.files.findDoc(epic), since)
    this.owner.print(json ? JSON.stringify(summary, null, 2) : FocusSummary.lines(summary).join("\n"))
  }

  ////////////////
  // ## Helpers
  ////////////////

  /**
   * Every running epic session, as `{ epic, session }`:  `others`, to tell;  `self`, the one running this command
   * (`CLAUDE_CODE_SESSION_ID`), told nothing.
   * - only epics in progress:  a done one has nothing in flight
   * - `epic fresh all` asks it too (`FreshCommands`, epic `epic-engine` T113)
   */
  async runningSessions(): Promise<{ others: EpicSession[]; self: EpicSession[] }> {
    const finder = this.owner.migrator.sessionsOf
    if (!finder) throw new PlanDocError("focus:  needs the running sessions, which only the `epic` command can see")
    const me = process.env.CLAUDE_CODE_SESSION_ID
    const others: EpicSession[] = []
    const self: EpicSession[] = []
    for (const listing of this.inProgress())
      for (const session of await finder(listing.name)) {
        const found = { epic: listing.name, session: session.name, sessionId: session.sessionId }
        if (session.sessionId === me) self.push(found)
        else others.push(found)
      }
    return { others, self }
  }

  /** The epics in progress, standing ones included. */
  private inProgress(): EpicListing[] {
    return this.files.listEpics().filter((listing) => listing.status === "in progress")
  }

  /** `listings`' summaries since `since`, the ones with news only;  a page that won't read is left out. */
  private newsSince(listings: EpicListing[], since: Date): EpicFocusSummary[] {
    const found: EpicFocusSummary[] = []
    for (const listing of listings) {
      try {
        const summary = this.summaryOf(listing.name, listing.file, since)
        if (!FocusSummary.isEmpty(summary)) found.push(summary)
      } catch (error) {
        this.owner.warn(`epic:  focus:  ${listing.name}'s page won't read:  ${(error as Error).message}`)
      }
    }
    return found
  }

  /** Epic `epic`'s summary since `since`, from its page `file`, its commits on `main` and its requests. */
  private summaryOf(epic: string, file: string, since: Date): EpicFocusSummary {
    const { files } = this
    return FocusSummary.of(epic, this.owner.read(file), since, {
      isMerged: (sha) => files.isMerged(file, sha),
      merged: FocusSummary.mergedSince(files.checkoutOf(file), epic, since),
      requests: new Requests({ root: files.root }).list(epic)
    })
  }

  /** `--since`, else when focus mode last went on;  throws when neither says. */
  private sinceOf(text: string | undefined): Date {
    const given = text ?? FocusMode.read()?.since
    if (!given) throw new PlanDocError("focus summary:  since when?  --since <time>;  focus mode never ran here")
    const since = new Date(given)
    if (Number.isNaN(since.getTime()))
      throw new PlanDocError(`focus summary:  --since ${given}?  a time, e.g. 2026-11-17T14:30`)
    return since
  }

  /** The `TELL:` lines, and the session running this one when it's an epic's. */
  private printTell(tell: { session: string; line: string }[], self: EpicSession[], selfNote: string): void {
    if (tell.length) {
      this.owner.print("TELL:  send each running session its line (SendMessage:  this command can't send them itself)")
      for (const { session, line } of tell) this.owner.print(`  to ${session}:  ${line}`)
    }
    for (const { epic } of self) this.owner.print(`this session:  ${epic}:  ${selfNote}`)
    this.owner.print(`sessions to tell:  ${tell.length}`)
  }
}

/** A flag's text, or `undefined`. */
function stringOf(value: Flags[string]): string | undefined {
  return typeof value === "string" ? value : undefined
}

/** A running epic session:  its epic, and its address (`SendMessage`'s `to`). */
export type EpicSession = { epic: string; session: string; sessionId: string }
