import { execFileSync } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

/**
 * The kit whose page server serves Spell UI's docs site (`/components/ui/`), the `spell` command that starts it, and
 * starting it:  what `yarn site:dev` and `yarn site:check` run (`spell server start`, from the kit's root).
 * - The page server is the KIT's since epic `repo-split` P16:  it starts from the kit's root, whatever repos are
 *   installed, so the docs site needs only the kit and Spell UI (spell-app's checkout before P16,
 *   `$SPELL_APP_CHECKOUT`).
 * - Both found by package (`spell`), never by a path into the kit.
 * - Only RUN, as a child process, never imported:  the page server's code stays out of these tools.
 */
export const KIT_ROOT = dirname(fileURLToPath(import.meta.resolve("spell/package.json")))

/** The kit's `spell` command (`bin/spell.mjs`), never the `spell` on `PATH` (maybe another checkout's). */
export const SPELL_CLI = resolve(KIT_ROOT, "bin", "spell.mjs")

/** Where the page server serves Spell UI's docs (the page server's `componentSets` setting):  `site:check`, `spell icon --open`. */
export const SITE_ADDRESS = "/components/ui"

/**
 * The kit's page server's origin, e.g. `http://127.0.0.1:54769`:  it serves this site (epic `coherence` P23, from
 * `site:dev`'s and `site:check`'s own copies).
 * - SIDE EFFECT:  `spell server start` starts it in the background if it isn't running
 * - `spell server start` prints `{ base, port, ... }` as JSON, maybe after other lines:  parsed from the first `{`;
 *   what it says on stderr goes to ours
 * - throws when it can't start, or prints no JSON:  `execFileSync()`'s error, or a `SyntaxError`
 */
export function ensurePageServer(): string {
  const text = execFileSync(process.execPath, [SPELL_CLI, "server", "start"], {
    cwd: KIT_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    timeout: SERVER_START_MS
  })
  return (JSON.parse(text.slice(text.indexOf("{"))) as { base: string }).base.replace(/\/$/, "")
}

/** Longest `spell server start` may take, ms:  a stale site bundle is built first. */
const SERVER_START_MS = 60_000
