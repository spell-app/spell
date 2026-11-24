#!/usr/bin/env node
/**
 * The spell-epic plugin's `asyncRewake` `Stop` hook for `/epic fresh all` (epic `epic-engine` T113):  a session marked
 * pending by `epic fresh all` is woken at its first CLEAR MOMENT, to run `/epic fresh`.
 * - stdin `{ session_id, transcript_path, cwd, ... }`.
 * - Not pending (every other turn):  exits 0 at once.
 * - During `epic fresh all --pause` (epic `epic-engine` T139) nobody is pending;  after it, paused agents don't count
 *   as running.
 * - Pending:  waits in the background (`FreshAll.waitForClear()`) until the session is clear:  no agents of its epic
 *   running, no question waiting on the person, no prompt from them in the last few minutes;  the one that asked goes
 *   last.  Then prints the line to stderr and exits 2, which wakes the session.
 *   - a new turn (the transcript grows) ends the wait:  that turn's end starts it again
 * - NEVER in an unattended session (`ClaudeSession.isUnattended()`):  nobody's there to hand on.
 * - Never fails the turn:  any error exits 0.
 */
import { readFileSync } from "node:fs"

import { ClaudeSession } from "spell/epic/config/ClaudeSession.mjs"

try {
  if (!ClaudeSession.isUnattended()) {
    const input = JSON.parse(readFileSync(0, "utf8") || "{}")
    const { session_id: sessionId, transcript_path: transcript, cwd } = input
    const { FreshAll } = await import("spell/epic/command/FreshAll.ts")
    if (FreshAll.pending(sessionId)) {
      const line = await FreshAll.waitForClear({ sessionId, transcript, cwd })
      if (line) {
        process.stderr.write(`${line}\n`)
        process.exitCode = 2
      }
    }
  }
} catch (error) {
  process.stderr.write(`fresh-wait hook:  ${error.message}\n`)
  process.exitCode = 0
}
