#!/usr/bin/env node
/**
 * Claude Code's `SessionStart` hook (`hooks.json`):  says focus mode is on (epic `epic-engine` T93), so a session
 * started during focus asks the person nothing either, as the running ones were told at `/focus`.
 * - Said the way the behind-main notice says it ([behind-main.mjs](behind-main.mjs)):  a line for the person
 *   (`systemMessage`), and one for Claude (`additionalContext`):  `FocusMode.notice()`'s.
 * - stdin `{ hook_event_name, ... }`.
 * - Focus mode is the machine's, not a repo's:  it reads one small file in the epic home, no git.
 * - Always exits 0, at once.
 */
import { readFileSync } from "node:fs"

try {
  const input = JSON.parse(readFileSync(0, "utf8") || "{}")
  // loaded in here, so a file that won't read never fails the hook
  const { FocusMode } = await import("spell/epic/config/FocusMode.ts")
  const notice = FocusMode.notice()
  if (notice)
    console.log(
      JSON.stringify({
        systemMessage: notice.person,
        hookSpecificOutput: { hookEventName: input.hook_event_name ?? "SessionStart", additionalContext: notice.claude }
      })
    )
} catch {
  // never block a session
}
process.exit(0)
