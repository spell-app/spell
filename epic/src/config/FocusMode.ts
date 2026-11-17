import { join } from "node:path"

import { DataFile } from "spell/server/DataFile"
// By its file, with its `.ts`:  plain `node` loads this file (the session-start hook)
import { EpicHome } from "./EpicHome.ts"

/****************
 * ### `FocusMode`
 * Focus mode (epic `epic-engine` T93;  Owen, 2026-11-17:  "/focus means I need to focus on something else.  Epics
 * should keep going on running things that are in flight.  When I say /back, summarize outstanding stuff that happened
 * while I was in focus mode."):  ONE switch per machine, and the lines each running epic session is told.
 * - `epic focus on [--why "..."]` turns it on, `off` off, `status` says which;  `/focus` and `/back` call those
 * - kept in the epic home's `focus.json5`:  `{ on, since, why?, ended? }`;  turning it off keeps the file, with `ended`,
 *   so `/back` and `epic focus summary` still know when it ran
 * - while it's on, an epic's session asks Owen nothing:  the same "no modals" rule as bedtime mode (bedtime's SKILL.md,
 *   "4. Bedtime mode"), but by day, and for every running epic at once
 * - the session-start hook says it's on ([focus-notice.mjs](../../hooks/focus-notice.mjs)), so a session started
 *   during focus behaves too
 * - Read on every call:  the switch changes while sessions run, and tests point the epic home elsewhere
 * - Plain `node` loads it (the hook):  node's own modules, `DataFile` and `EpicHome` only
 ****************/
export class FocusMode {
  /** The switch's file:  `focus.json5` in the epic home (`$SPELL_EPIC_HOME`, else `~/.spell-epic`). */
  static get file(): string {
    return join(EpicHome.folder(), FOCUS_FILE)
  }

  /**
   * The switch as it was last set, on or off;  `undefined` when focus mode never ran on this machine.
   * - NEVER throws:  a file that won't read is never set
   */
  static read(): FocusState | undefined {
    try {
      const state = DataFile.read<FocusState>(FocusMode.file)
      return state?.since ? state : undefined
    } catch {
      return undefined
    }
  }

  /** Whether focus mode is on now. */
  static get isOn(): boolean {
    return !!FocusMode.read()?.on
  }

  /**
   * Turn focus mode on from `now`;  returns the new state.
   * - already on:  keeps its start, and takes a new `why` when given
   */
  static on({ why, now = new Date() }: { why?: string; now?: Date } = {}): FocusState {
    const before = FocusMode.read()
    const state: FocusState = {
      on: true,
      since: before?.on ? before.since : now.toISOString(),
      ...((why ?? (before?.on ? before.why : undefined)) && { why: why ?? before!.why })
    }
    DataFile.write(FocusMode.file, state)
    return state
  }

  /**
   * Turn focus mode off at `now`;  returns the state it ended (its `ended` set), `undefined` when it wasn't on.
   * - keeps the file, with `ended`:  what ran is still known afterwards
   */
  static off(now = new Date()): FocusState | undefined {
    const before = FocusMode.read()
    if (!before?.on) return undefined
    const state: FocusState = { ...before, on: false, ended: now.toISOString() }
    DataFile.write(FocusMode.file, state)
    return state
  }

  ////////////////
  // ## What each session is told
  ////////////////

  /** The line every running epic session is sent at `/focus`:  what to do until the `/back` line. */
  static onMessage(state: FocusState): string {
    const why = state.why ? ` (${state.why})` : ""
    return (
      `/focus:  Owen is focusing on something else${why}, since ${clock(state.since)}.  ` +
      "Keep building what's in flight (an accepted next phase too) and merge what's clean, as by day.  " +
      "Ask him NOTHING until the /back line:  no AskUserQuestion, no details pages, no `epic ask show`;  " +
      "each choice a calm judgement call (`epic add <epic>#J ... --calm`), each question a Q item on your page, " +
      "left to wait.  `epic focus status` says whether it's still on.  Don't reply."
    )
  }

  /** The line running epic session `epic` is sent at `/back`:  post its own status in its own window. */
  static backMessage(epic: string, state: FocusState): string {
    const ran = state.ended ? `${clock(state.since)}-${clock(state.ended)}` : `since ${clock(state.since)}`
    return (
      `/back:  Owen is back (focus ran ${ran}).  Post YOUR status in YOUR window now, as your reply:  ` +
      "`## Waiting on you` first, with link pairs (Q, J, failed tests, M tests, red items, requests), then what " +
      `merged, then what's still running, all since ${clock(state.since)}.  Its data:  ` +
      `\`epic focus summary ${epic} --since ${state.since}\`.  Then ask him as usual again.`
    )
  }

  /**
   * What the session-start hook says while focus mode is on:  a line for Owen, one for Claude;  `undefined` while off.
   */
  static notice(state = FocusMode.read()): { person: string; claude: string } | undefined {
    if (!state?.on) return undefined
    const why = state.why ? ` (${state.why})` : ""
    return {
      person: `Focus mode is on since ${clock(state.since)}${why}:  /back ends it.`,
      claude:
        `Focus mode is on (epic tooling, /focus) since ${state.since}${why}.  If this is an epic's session, follow ` +
        `this until /back:  ${FocusMode.onMessage(state)}`
    }
  }
}

////////////////
// ## Helpers
////////////////

/** The switch's file name, in the epic home. */
const FOCUS_FILE = "focus.json5"

/** `14:30`, local:  when focus started or ended, as a line says it. */
function clock(iso: string): string {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return iso
  return `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`
}

////////////////
// ## Types
////////////////

/** Focus mode, as last set. */
export type FocusState = {
  /** on now? */
  on: boolean
  /** when it went on (ISO) */
  since: string
  /** what Owen is focusing on, when he said */
  why?: string
  /** when it went off (ISO);  only once it's off */
  ended?: string
}
