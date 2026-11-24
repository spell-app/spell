#!/usr/bin/env node
/**
 * Claude Code's `SessionStart` hook (the plugin's `hooks/hooks.json`):  the SERVER KEEPER up, and looking now
 * (epic `epic-engine` P82).
 * - Any session's start makes sure the epic hub runs, the one program that keeps every project's servers up
 *   (`ServerKeeper`):  no macOS login item needed.
 * - And asks it to look at once:  an epic starting work gets its servers on main's code now, not in 10 seconds.
 * - What it runs:  `epic hub kick` (`Hub`), DETACHED, so a hub that takes seconds to start never holds a session up.
 * - Only in a repo set up for epics (`EpicConfig.ofSetUp()`):  the plugin's hooks run in every repo.
 * - QUIET:  nothing on stdout.  Always exits 0, at once.
 * - stdin `{ cwd, ... }`.
 */
import { spawn } from "node:child_process"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

try {
  const input = JSON.parse(readFileSync(0, "utf8") || "{}")
  // loaded in here, so code that won't load never fails the hook
  const { EpicConfig } = await import("spell/epic/config/EpicConfig.ts")
  if (input.cwd && EpicConfig.ofSetUp(input.cwd)) {
    const epic = join(dirname(dirname(fileURLToPath(import.meta.url))), "bin", "epic")
    spawn(process.execPath, [epic, "hub", "kick"], { cwd: input.cwd, detached: true, stdio: "ignore" }).unref()
  }
} catch (error) {
  console.error(`server-keeper hook:  ${error.message}`)
}
process.exit(0)
