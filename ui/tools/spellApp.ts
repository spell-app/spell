import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

/**
 * The spell-app checkout whose page server serves Spell UI's docs site (`/components/ui/`), and its `spell` CLI:
 * what `yarn site:dev` and `yarn site:check` start the server with (`spell dev server ensure`).
 * - `$SPELL_APP_CHECKOUT`, else spell-app's beside this repo in the top repo `spell` (`../spell-app`, epic `repo-split`
 *   P8;  `packages/ui/../..` in the monorepo before it).
 * - Only RUN, as a child process, never imported:  spell-app is above Spell UI, which never imports it.
 * - Its own `spell` CLI with `node`, never the `spell` on `PATH` (maybe another checkout's).
 */
export const SPELL_APP = resolve(
  process.env.SPELL_APP_CHECKOUT ?? resolve(fileURLToPath(new URL("..", import.meta.url)), "..", "spell-app")
)

/** spell-app's `spell` CLI, in `SPELL_APP`. */
export const SPELL_CLI = resolve(SPELL_APP, "cli", "bin", "spell.mjs")
