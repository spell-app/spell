import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

/**
 * The kit whose page server serves Spell UI's docs site (`/components/ui/`), and the `spell` command that starts it:
 * what `yarn site:dev` and `yarn site:check` run (`spell server start`, from the kit's root).
 * - The page server is the KIT's since epic `repo-split` P16:  it starts from the kit's root, whatever repos are
 *   installed, so the docs site needs only the kit and Spell UI (spell-app's checkout before P16,
 *   `$SPELL_APP_CHECKOUT`).
 * - Both found by package (`spell-kit`), never by a path into the kit.
 * - Only RUN, as a child process, never imported.
 */
export const KIT_ROOT = dirname(fileURLToPath(import.meta.resolve("spell-kit/package.json")))

/** The kit's `spell` command (`bin/spell.mjs`), never the `spell` on `PATH` (maybe another checkout's). */
export const SPELL_CLI = resolve(KIT_ROOT, "bin", "spell.mjs")
