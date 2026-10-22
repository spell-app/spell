#!/usr/bin/env node
/**
 * Patches one checkout, in the background:  `node patch-checkout.mjs <folder>` (epic `epic-engine` P17).
 * - What `epic worktree patch` does, for the checkout `<folder>` is in (its child repos too, in a multi-repo top):
 *   the fixes its repo lists in `"checkoutPatches"` that it doesn't have yet (`CheckoutPatches`).
 * - The session-start hook (`behind-main.mjs`) starts it DETACHED, so a slow `run` patch never holds a session up.
 * - Plain `node`, no `tsx`:  it loads `CheckoutPatches` by path, before a worktree's `yarn install`.
 * - Prints a line per checkout, which the hook sends to `epic-patches.log` in the checkout's git folder.
 * - Always exits 0.
 */
import { realpathSync } from "node:fs"

import { CheckoutPatches } from "spell-epic/command/CheckoutPatches.ts"

try {
  const folder = process.argv[2] ?? process.cwd()
  const reports = new CheckoutPatches().patchAll(CheckoutPatches.checkoutsAt(folder))
  const lines = CheckoutPatches.lines(reports, realpathSync(folder))
  console.log(`${new Date().toISOString()}  ${lines.join("\n  ")}`)
} catch (error) {
  console.log(`${new Date().toISOString()}  FAILED:  ${error?.message ?? error}`)
}
process.exit(0)
