import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
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

/**
 * This checkout's running EDITOR's address, e.g. `http://localhost:64794/`:
 * it runs the Spell UI site (`SPELL_UI_SITE`), which `site:check` checks.
 * - SIDE EFFECT:  `spell server start all` starts the page server and the editor in the background,
 *   if they aren't running;  what it prints goes to our stderr
 * - read from the page server's note of it, `.spell-server.editor.json` at the kit's root
 * - throws when it can't start, or leaves no note:  `execFileSync()`'s error, or an `Error` naming the note
 */
export function ensureEditor(): string {
  execFileSync(process.execPath, [SPELL_CLI, "server", "start", "all"], {
    cwd: KIT_ROOT,
    stdio: ["ignore", process.stderr, "inherit"],
    timeout: EDITOR_START_MS
  })
  const note = join(KIT_ROOT, EDITOR_NOTE)
  if (!existsSync(note)) throw new Error(`ensureEditor():  no ${note} after \`spell server start all\``)
  return (JSON.parse(readFileSync(note, "utf8")) as { url: string }).url
}

/**
 * Where the editor runs the Spell UI site, from its root:
 * a page of the site is this plus its address (`/run/@spell/guides/SpellUI/button/examples`).
 */
export const SPELL_UI_SITE = "run/@spell/guides/SpellUI"

/**
 * The Spell UI site's own file, from the page server's root:
 * it lists every page with its address (`it has a button usage page at "/button" ...`).
 */
export const SPELL_UI_SITE_FILE = "spaces/@spell/guides/SpellUI/SpellUI.spell"

/** The page server's note of the running editor, at the kit's root. */
const EDITOR_NOTE = ".spell-server.editor.json"

/** Longest `spell server start all` may take, ms:  the editor's first start builds its bundles. */
const EDITOR_START_MS = 180_000

/** Longest `spell server start` may take, ms:  a stale site bundle is built first. */
const SERVER_START_MS = 60_000
