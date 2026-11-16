#!/usr/bin/env node
/**
 * Claude Code's `SessionStart` hook (the plugin's `hooks/hooks.json`), run `asyncRewake`:
 * a session VS Code started again whose epic's helper agents the restart cut off is woken at once to resume them
 * (epic `epic-engine` I310).
 * - The rules are the epic code's, `RestartWake` (`src/tool/RestartWake.ts`);  this hook is its thin caller.
 * - stdin `{ cwd, source, session_id, ... }`;  a line:  printed to stderr, exit 2, which wakes the session
 *   (the `asyncRewake` contract, as the inbox poller's hook);  none:  exit 0, silent
 * - Every start:  a resume, a fresh start, a `/clear` alike;  `RestartWake` decides by the agents' times.
 * - Plain `node`:  `RestartWake.ts` loads with its types stripped.
 * - Exits 0 on any error:  never breaks a session's start.
 */
import { readFileSync } from "node:fs"

let code = 0
try {
  const input = JSON.parse(readFileSync(0, "utf8") || "{}")
  if (input.cwd) {
    // loaded in here, so a reader that won't load never fails the hook
    const { RestartWake } = await import("spell/epic/tool/RestartWake.ts")
    const line = RestartWake.lineFor(input.cwd)
    if (line) {
      console.error(line)
      code = 2
    }
  }
} catch (error) {
  console.error(`restarted hook:  ${error.message}`)
  code = 0
}
process.exit(code)
