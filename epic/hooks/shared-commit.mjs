#!/usr/bin/env node
/**
 * The end-of-turn hook, Claude Code's `Stop` ([hooks.json](hooks.json)) and Codex's ([codex-hooks.json](codex-hooks.json)):
 * after every turn, commit whatever changed in the shared content repo, then sync it.
 * - It starts `epic turn end` in the session's folder (`TurnEnd.inBackground()`):  the SAME step any other agent runs
 *   by hand (epic `epic-friend` P11), so there's one path.
 * - That commits, one commit per epic, guide or folder, then SYNCS when the repo's config names the content repo's
 *   remote (`contentRemote`;  epic `epic-friend` P5):  pull (rebasing), renumber ids two people both made, push.
 *   Offline, the commits wait for the next turn's push;  a conflict it can't settle is undone, and the next session's
 *   start says so ([sync-notice.mjs](sync-notice.mjs)).
 * - stdin `{ session_id, cwd, ... }`:  Claude Code's and Codex's alike.
 * - Only in a repo set up for epics (`EpicConfig.ofSetUp()`:  it has `.epic/config.json5`),
 *   and whose content repo exists (`contentFolder`):  the plugin's hooks run in every repo.  Else exits at once.
 * - DETACHED, its output appended to `<shared repo>/.git/spell-shared.log`:
 *   - the turn never waits for git
 *   - a failed commit never shows as a failed hook
 *   - the next turn's commit picks up anything left
 * - Prints nothing:  Codex takes a `Stop` hook's output as JSON, and plain text as a mistake.
 * - Always exits 0.
 * - Run by the Codex PLUGIN (`--codex-plugin`) while Codex's own hooks file runs it too:  nothing (`CodexHome`, J37).
 */
import { readFileSync } from "node:fs"

try {
  // the plugin started it (--codex-plugin) while Codex's user hooks file runs it too:  one route, never both
  const { CodexHome } = await import("spell/epic/config/CodexHome.ts")
  if (CodexHome.skipPluginHook()) process.exit(0)
  const input = JSON.parse(readFileSync(0, "utf8") || "{}")
  // loaded in here, so a config that won't read never fails the hook
  const { TurnEnd } = await import("spell/epic/command/TurnEnd.ts")
  TurnEnd.inBackground(input)
} catch {
  // never block a turn
}
process.exit(0)
