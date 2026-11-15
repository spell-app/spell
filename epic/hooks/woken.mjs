#!/usr/bin/env node
/**
 * Claude Code's `SessionStart` hook (the plugin's `hooks/hooks.json`):
 * a session the page server opened for an epic's Send is titled `🚧 <epic>` as it starts (epic `epic-engine` I286).
 * - The rules are the epic code's, `WakeMarks` (`src/tool/WakeMarks.ts`);  this hook is its thin caller.
 * - stdin `{ cwd, source, session_id, ... }`;  stdout `{ hookSpecificOutput:  { sessionTitle } }`, or nothing.
 * - Only on a fresh start (`source` `startup`):  never a resume or a `/clear`.
 * - Plain `node`:  `WakeMarks.ts` loads with its types stripped.
 * - Always exits 0, within a second:  never blocks a session.
 */
import { readFileSync } from "node:fs"

try {
  const input = JSON.parse(readFileSync(0, "utf8") || "{}")
  if (input.cwd && (!input.source || input.source === "startup")) {
    // loaded in here, so a mark reader that won't load never fails the hook
    const { WakeMarks } = await import("spell/epic/tool/WakeMarks.ts")
    const title = WakeMarks.claim(input.cwd)
    if (title)
      console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", sessionTitle: title } }))
  }
} catch (error) {
  console.error(`woken hook:  ${error.message}`)
}
process.exit(0)
