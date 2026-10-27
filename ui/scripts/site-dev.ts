/**
 * `yarn site:dev`:  work on the Spell UI site live.
 * - The page server (started if it isn't running) serves the pages at `/components/ui/`.
 * - The site bundle, `site/_assets/`, rebuilds on every source edit,
 *   and the page server's live reload then reloads every open page.
 * - Why not a dev server:  the pages are static files loading ONE bundle
 *   (`yarn site:bundle`, which the page server runs when it starts, if stale).
 *   This is that same build, watched, so what you see is what it builds.
 * - Starts with `yarn site:bundle` (clears `_assets/`, makes the `icon-packs` link, prints sizes),
 *   then Vite's watch build with the same config (`vite.site.config.ts`):
 *   edits under `src/`, `components/` or `site/_src/` rebuild in seconds.
 * - Page edits (the site's pages, `docs/`:  `*.html`, `__parts/`) and new data (`docs/__data/`) need no rebuild:
 *   the page server reloads them itself.
 * - NOT watched:  `site:data`, `site:index`, `site:kitchen` (a vocabulary, a family sheet's tokens, an example):
 *   rerun `yarn site:build` for those.
 * - A watch rebuild doesn't clear `_assets/`, so a chunk whose hash changed leaves its old file behind.
 *   - Harmless, since `_assets/` isn't committed.
 *   - The page server's next start rebuilds it clean:
 *     its `site.js` is newer than the last recorded build (`spell/server`'s `Bundle`).
 * - `Ctrl-C` stops the watch;  the page server keeps running (`spell server stop`).
 */
import { execFileSync } from "node:child_process"
import path from "node:path"
import { build, type Rolldown } from "vite"

import { KIT_ROOT, SPELL_CLI } from "spell/ui/tools/pageServer"
import { Terminal } from "spell/element-tools/Terminal"

/** Spell UI's folder. */
const UI = path.resolve(import.meta.dirname, "..")

execFileSync("yarn", ["site:bundle"], { cwd: UI, stdio: "inherit" })
const base = ensurePageServer()
Terminal.out(
  `\nSpell UI site:  ${base}/components/ui/  (live reload);  watching the bundle's sources, Ctrl-C to stop\n`
)
const watcher = (await build({
  configFile: path.join(UI, "vite.site.config.ts"),
  build: { watch: {} }
})) as Rolldown.RolldownWatcher
watcher.on("event", report)

/** One line per rebuild (the config's `logLevel` is `warn`, so Vite lists nothing). */
function report(event: Rolldown.RolldownWatcherEvent): void {
  if (event.code === "BUNDLE_END") Terminal.out(`${new Date().toLocaleTimeString()}  rebuilt in ${event.duration}ms`)
  if (event.code === "ERROR") Terminal.err(`${new Date().toLocaleTimeString()}  build failed:  ${event.error.message}`)
}

/**
 * The kit's page server origin, e.g. `http://127.0.0.1:54769` (`KIT_ROOT`'s:  it serves this site).
 * - SIDE EFFECT:  `spell server start` starts it in the background if it isn't running
 * - it prints `{ base, port, ... }` as JSON, maybe after other lines:  parsed from the first `{`
 */
function ensurePageServer(): string {
  const text = execFileSync(process.execPath, [SPELL_CLI, "server", "start"], {
    cwd: KIT_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    timeout: 60000
  })
  return (JSON.parse(text.slice(text.indexOf("{"))) as { base: string }).base.replace(/\/$/, "")
}
