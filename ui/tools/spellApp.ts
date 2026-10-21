import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

/**
 * The spell-app checkout whose page server serves Spell UI's docs site (`/components/ui/`), and the `spell` command
 * that starts it:  what `yarn site:dev` and `yarn site:check` run (`spell server start`, in that checkout).
 * - `$SPELL_APP_CHECKOUT`, else spell-app's beside this repo in the top repo `spell` (`../spell-app`, epic `repo-split`
 *   P8;  `packages/ui/../..` in the monorepo before it).
 * - Only RUN, as a child process, never imported:  spell-app is above Spell UI, which never imports it.
 * - The kit's own `spell` command with `node`, never the `spell` on `PATH` (maybe another checkout's):  it's the
 *   kit's since epic `repo-split` P13, spell-app's before.
 */
export const SPELL_APP = resolve(
  process.env.SPELL_APP_CHECKOUT ?? resolve(fileURLToPath(new URL("..", import.meta.url)), "..", "spell-app")
)

/** The kit's `spell` command (`spell-kit`'s `cli/bin/spell.mjs`), found by package, never by a path into the kit. */
export const SPELL_CLI = resolve(
  dirname(fileURLToPath(import.meta.resolve("spell-kit/package.json"))),
  "cli",
  "bin",
  "spell.mjs"
)
