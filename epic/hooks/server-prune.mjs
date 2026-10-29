#!/usr/bin/env node
/**
 * Claude Code's `SessionStart` hook (the plugin's `hooks/hooks.json`):  the safety net for servers left running by
 * removed checkouts (epic `epic-engine` I53).
 * - Stops the page and vite servers whose checkout is gone, as `epic server prune` does, at most once an hour:
 *   `CheckoutServers.atSessionStart()` (`src/command/CheckoutServers.ts`);  this hook is its thin caller.
 *   - A removal by our tooling stops its checkout's servers itself, first (`CheckoutServers.stop()`):  this catches
 *     the rest, a folder deleted by hand, a removal by older code.
 *   - NEVER a live checkout's servers:  only those whose checkout and working folder are both gone.
 * - And deletes the removed worktrees' leftover folders in the epic home's `trash/` (`LeftoverFolders.sweep()`, r22),
 *   every session start.
 * - QUIET:  nothing on stdout;  what it stopped, a line on stderr (Claude Code's debug log).
 * - stdin `{ cwd, ... }`.  Only in a repo that uses epics (it has `.epic/config.json5`):  the plugin's hooks run in
 *   every repo.
 * - Plain `node`:  `CheckoutServers.ts` loads with its types stripped.
 * - Always exits 0, within a few seconds:  never blocks a session.
 * - Its tests:  `tests/command/CheckoutServers.test.ts`, which runs this file as the hook too.
 */
import { existsSync, readFileSync } from "node:fs"

try {
  const input = JSON.parse(readFileSync(0, "utf8") || "{}")
  // loaded in here, so code that won't load never fails the hook
  const { EpicConfig } = await import("spell/epic/config/EpicConfig.ts")
  if (input.cwd && existsSync(EpicConfig.of(input.cwd).file)) {
    const { CheckoutServers } = await import("spell/epic/command/CheckoutServers.ts")
    const { stopped } = CheckoutServers.atSessionStart()
    if (stopped.length) console.error(`server-prune hook:  ${CheckoutServers.said(stopped)}, their checkouts gone`)
    // removed worktrees' folders moved aside while their windows still wrote into them (r22)
    const { LeftoverFolders } = await import("spell/epic/command/LeftoverFolders.ts")
    const { EpicHome } = await import("spell/epic/config/EpicHome.ts")
    const swept = LeftoverFolders.sweep({ home: EpicHome.folder() })
    if (swept) console.error(`server-prune hook:  deleted ${swept} leftover worktree folder(s)`)
  }
} catch (error) {
  console.error(`server-prune hook:  ${error.message}`)
}
process.exit(0)
