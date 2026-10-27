#!/usr/bin/env node
/**
 * Claude Code's `SessionStart` hook (the plugin's `hooks/hooks.json`):
 * a worktree's session that starts outside its worktree is told to enter it first (epic `epic-eject` I3);  one that
 * starts IN it without `EnterWorktree` is recorded, quietly (epic `epic-engine` P12:  entering asks Owen every time).
 * - The rules are the epic code's, `WorktreeGuard` (`src/command/WorktreeGuard.ts`);
 *   this hook is its thin caller.
 * - stdin `{ cwd, transcript_path, source, session_id, ... }`;
 *   stdout `WorktreeGuard.check()`'s answer, JSON, or nothing.
 * - Only in a repo that uses epics (it has `.epic/config.json5`):  the plugin's hooks run in every repo.
 * - Plain `node`:  `WorktreeGuard.ts` loads with its types stripped.
 * - Always exits 0, within a few seconds:  never blocks a session.
 * - Its tests:  `tests/src/command/WorktreeGuard.test.ts`, which runs this file as the hook too.
 */
import { readFileSync } from "node:fs"

try {
  const input = JSON.parse(readFileSync(0, "utf8") || "{}")
  // loaded in here, so a guard that won't load never fails the hook
  const { WorktreeGuard } = await import("spell/epic/command/WorktreeGuard.ts")
  const output = WorktreeGuard.check(input)
  if (output) console.log(JSON.stringify(output))
} catch (error) {
  console.error(`worktree-guard hook:  ${error.message}`)
}
process.exit(0)
