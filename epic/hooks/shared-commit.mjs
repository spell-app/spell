#!/usr/bin/env node
/**
 * Claude Code's `Stop` hook (the plugin's `hooks/hooks.json`):
 * after every turn, commit whatever changed in the shared content repo (epic `shared-content`).
 * - It runs `epic shared commit` in the session's checkout.
 * - stdin `{ session_id, cwd, ... }`.
 * - Only in a repo that uses epics (it has `.epic/config.json5`), and whose content repo exists (`contentFolder`):
 *   the plugin's hooks run in every repo.  Else exits at once.
 * - The commit runs DETACHED, its output appended to `<shared repo>/.git/spell-shared.log`:
 *   - the turn never waits for git
 *   - a failed commit never shows as a failed hook
 *   - the next turn's commit picks up anything left
 * - The `epic` it runs is this plugin's own (`bin/epic`), with its packages installed.
 * - Always exits 0.
 */
import { spawn } from "node:child_process"
import { existsSync, openSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"

/** This plugin's `bin/epic`:  `hooks/` is beside `bin/`. */
const EPIC = join(dirname(import.meta.dirname), "bin", "epic")

try {
  const { session_id: session, cwd } = JSON.parse(readFileSync(0, "utf8") || "{}")
  // the MAIN checkout's config, from the session's folder:  the shared repo is its `contentFolder`.
  // Loaded in here, so a config that won't read never fails the hook
  const { EpicConfig } = await import("../src/config/EpicConfig.ts")
  const config = cwd && EpicConfig.of(cwd)
  const dir = config && existsSync(config.file) && config.contentFolder
  if (dir && existsSync(join(dir, ".git"))) {
    const log = openSync(join(dir, ".git", "spell-shared.log"), "a")
    const args = [EPIC, "shared", "commit", "--quiet"]
    if (session) args.push("--session", session)
    spawn(process.execPath, args, { cwd, detached: true, stdio: ["ignore", log, log] }).unref()
  }
} catch {
  // never block a turn
}
process.exit(0)
