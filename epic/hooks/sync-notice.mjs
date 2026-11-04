#!/usr/bin/env node
/**
 * Claude Code's and Codex's `SessionStart` hook (`hooks.json`, `codex-hooks.json`):  says when the epic repo's last
 * sync stopped on a conflict (epic `epic-friend` P5).
 * - The end-of-turn commit syncs the epic repo with its remote ([shared-commit.mjs](shared-commit.mjs)), detached:
 *   nobody sees what it came to.  A conflict it couldn't settle is undone, and kept in the epic repo's git folder
 *   (`SyncState`).
 * - Said the way the behind-main notice says it ([behind-main.mjs](behind-main.mjs)):  a line for the person
 *   (`systemMessage`), and one for Claude (`additionalContext`).
 * - stdin `{ cwd, hook_event_name, ... }`.
 * - Only in a repo set up for epics (`EpicConfig.ofSetUp()`:  it has `.epic/config.json5`),
 *   whose epic repo exists:  else nothing.
 * - Always exits 0, at once:  it reads one small file, no git.
 * - Run by the Codex PLUGIN (`--codex-plugin`) while Codex's own hooks file runs it too:  nothing (`CodexHome`, J37).
 */
import { readFileSync } from "node:fs"

try {
  // the plugin started it (--codex-plugin) while Codex's user hooks file runs it too:  one route, never both
  const { CodexHome } = await import("spell/epic/config/CodexHome.ts")
  if (CodexHome.skipPluginHook()) process.exit(0)
  const input = JSON.parse(readFileSync(0, "utf8") || "{}")
  // loaded in here, so a config that won't read never fails the hook
  const { EpicConfig } = await import("spell/epic/config/EpicConfig.ts")
  const { SyncState } = await import("spell/epic/command/SyncState.ts")
  const dir = input.cwd && EpicConfig.ofSetUp(input.cwd)?.contentFolder
  const notice = dir && SyncState.notice(dir)
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
