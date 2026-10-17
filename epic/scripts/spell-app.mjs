#!/usr/bin/env node
/**
 * `node scripts/spell-app.mjs <args...>`:  spell-app's own `spell` command line, from the spell-app checkout
 * spell-epic links its packages from (`portal:` in the root `package.json`), run with `<args>` in the current folder.
 * - For what spell-epic still borrows from spell-app's CLI:  the component pack's build and check
 *   (`spell dev pack build | check epics`, the epics package's `pack:build` / `pack:check`).
 * - The checkout:  `.spell-app`, the root's link to it.
 * - REFACTOR: the pack tooling (`packBuild.ts`) belongs with the packs;  until it moves, spell-epic needs spell-app's
 *   CLI installed (`yarn install` in that checkout).
 */
import { spawnSync } from "node:child_process"
import { realpathSync } from "node:fs"
import { join } from "node:path"

/** The spell-app checkout spell-epic's `@spell-app/*` packages are linked from. */
export const SPELL_APP = realpathSync(join(import.meta.dirname, "..", ".spell-app"))

if (import.meta.filename === realpathSync(process.argv[1] ?? "")) {
  const spell = join(SPELL_APP, "packages", "cli", "bin", "spell.mjs")
  const run = spawnSync(process.execPath, [spell, ...process.argv.slice(2)], { stdio: "inherit" })
  process.exit(run.status ?? 1)
}
