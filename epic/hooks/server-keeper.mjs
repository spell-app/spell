#!/usr/bin/env node
/**
 * Claude Code's `SessionStart` hook (the plugin's `hooks/hooks.json`):  SPELL'S SERVER KEEPER up (epic `editor` P48;
 * the epic hub kept the servers itself until epic `epic-engine` P85).
 * - Any session's start makes sure the one program that keeps every project's servers up runs:  no macOS login item
 *   needed.
 * - What it runs:  `spell keeper ensure --take-over --quiet`, DETACHED, so a keeper that takes seconds to start never
 *   holds a session up;  `--take-over`:  only Spell's own keeper counts, so an older hub's keeper hands over
 * - The kit's `spell` bin beside this plugin's folder (`<kit>/bin/spell.mjs`, the plugin being the kit's `epic/`);
 *   an npm install's plugin has none there:  the `spell` on the `PATH`
 * - Only in a repo set up for epics (`EpicConfig.ofSetUp()`):  the plugin's hooks run in every repo.
 * - QUIET:  nothing on stdout.  Always exits 0, at once.
 * - stdin `{ cwd, ... }`.
 */
import { spawn } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

try {
  const input = JSON.parse(readFileSync(0, "utf8") || "{}")
  // loaded in here, so code that won't load never fails the hook
  const { EpicConfig } = await import("spell/epic/config/EpicConfig.ts")
  if (input.cwd && EpicConfig.ofSetUp(input.cwd)) {
    const bin = join(dirname(dirname(dirname(fileURLToPath(import.meta.url)))), "bin", "spell.mjs")
    const [command, args] = existsSync(bin) ? [process.execPath, [bin]] : ["spell", []]
    spawn(command, [...args, "keeper", "ensure", "--take-over", "--quiet"], {
      cwd: input.cwd,
      detached: true,
      stdio: "ignore"
    })
      .on("error", () => {})
      .unref()
  }
} catch (error) {
  console.error(`server-keeper hook:  ${error.message}`)
}
process.exit(0)
