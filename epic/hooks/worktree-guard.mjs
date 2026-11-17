#!/usr/bin/env node
/**
 * Claude Code's `SessionStart` hook (the plugin's `hooks/hooks.json`):
 * a worktree's session that starts outside its worktree is told to enter it first (epic `epic-eject` I3);  one that
 * starts IN it without `EnterWorktree` is recorded, quietly (epic `epic-engine` P12:  entering asks the person every time).
 * - The rules are the epic code's, `WorktreeGuard` (`src/command/WorktreeGuard.ts`);
 *   this hook is its thin caller.
 * - And, with the superpowers plugin turned on, in an epic's worktree:  where superpowers stands aside in an epic
 *   (`Superpowers`, `src/command/Superpowers.ts`;  epic `epic-engine` P72), on every start, `/clear` and compaction,
 *   when superpowers' own hook speaks too.
 * - stdin `{ cwd, transcript_path, source, session_id, ... }`;
 *   stdout both answers, joined (`WorktreeGuard.withNotice()`), as JSON, or nothing.
 * - Only in a repo set up for epics (`EpicConfig.ofSetUp()`:  it has `.epic/config.json5`):
 *   the plugin's hooks run in every repo.
 * - Plain `node`:  `WorktreeGuard.ts` and `Superpowers.ts` load with their types stripped.
 * - Always exits 0, within a few seconds:  never blocks a session.
 * - Its tests:  `tests/command/WorktreeGuard.test.ts`, which runs this file as the hook too, and
 *   `tests/command/Superpowers.test.ts`.
 */
import { readFileSync } from "node:fs"

try {
  const input = JSON.parse(readFileSync(0, "utf8") || "{}")
  // loaded in here, so a guard that won't load never fails the hook
  const { WorktreeGuard } = await import("spell/epic/command/WorktreeGuard.ts")
  const { Superpowers } = await import("spell/epic/command/Superpowers.ts")
  const output = WorktreeGuard.withNotice(WorktreeGuard.check(input), Superpowers.notice(input))
  if (output) console.log(JSON.stringify(output))
} catch (error) {
  console.error(`worktree-guard hook:  ${error.message}`)
}
process.exit(0)
