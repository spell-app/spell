import { existsSync, readFileSync, rmSync } from "node:fs"
import { join } from "node:path"

import { SRV } from "spell/server"
import { PageServer, pageServerRoot, pageServerSettings } from "spell/server/page"
import { CLI } from "spell/cli"

/**
 * `spell server ...`:  the kit's page server, and every web server of the kit.
 * - `pageServer()`:  `local`, `start`, `status`, `url <file>`, `prune`:  the page server's own command line
 *   (`src/server/page/cli.ts`), its arguments verbatim;  root `yarn server` runs the same file
 * - `startAll()`:  `spell server start all`
 * - `stopServers()`:  `spell server stop [local|all]`
 * - Which server:  the kit's, from any folder of it (`pageServerRoot()`, epic `repo-split` P16)
 */

/** The page server's command line, as `runTool()` runs it:  under `tsx`, with the kit's node settings. */
const PAGE_SERVER_CLI: CLI.ToolSpec = { tool: "src/server/page/cli.ts", tsx: "tsconfig.node.json" }

/**
 * Run the page server's own command line (`src/server/page/cli.ts`) with `args` verbatim, in the current folder;
 * resolves to its exit code.
 * - Its checkout:  the kit the folder is in, from any folder of it (`pageServerRoot()`);  `--root` says another.
 */
export function pageServer(args: string[]): Promise<number> {
  return CLI.runTool(PAGE_SERVER_CLI, args)
}

////////////////
// ## `spell server start all`
////////////////

/**
 * `spell server start all`:  start every web server of the checkout that isn't running, wait until each answers,
 * and print where they are.  What `/spell-serve` runs, and `/spell-docs` before it shows a page.
 * - Which checkout:  the kit the current folder is in (`pageServerRoot()`).
 * - The PAGE SERVER:  docs, epic pages, the app's `/api`.  Started in the background if it isn't running.
 * - The EDITOR (Vite, the spell app):  the page server's child (spell-app's `EditorServer`), started once the page
 *   server listens;  this waits for its record, `.spell-server.editor.json` at the page server's root, to answer.
 *   Only where the page server's settings run spell-app's routes (`appRoutes`).
 * - SPELL UI's docs site:  static pages the page server itself serves at `/components/ui/`;  this checks its bundle
 *   answers (`/components/ui/_assets/site.js`:  not committed;  the page server builds it when it starts, if stale).
 *   Only where the settings name Spell UI's component set (`ui`).
 * - Prints one row per server:  name, port, URL, state.  Exits 1 if any didn't come up.
 * - Was spell-app's `scripts/serve.mjs` (`yarn serve`) until epic `repo-split` P13.
 */
export async function startAll(): Promise<number> {
  const root = pageServerRoot(process.cwd())
  const settings = pageServerSettings(root)
  const page = await PageServer.ensure(root)
  const rows: ServerRow[] = [
    {
      name: "page server",
      url: `${page.base}/`,
      what: "docs, epics, /api",
      state: page.launched ? "started" : "running"
    }
  ]
  if (settings.routes?.some((route) => route.includes("appRoutes"))) rows.push(await editorRow(root))
  if (settings.componentSets?.ui) rows.push(await spellUIRow(page.base))
  CLI.out(serverLines(root, rows).join("\n"))
  return rows.some((row) => row.failed) ? CLI.EXIT.ERRORS : CLI.EXIT.OK
}

/** One server `start all` reports. */
type ServerRow = { name: string; url: string; what: string; state: string; failed?: boolean }

/** The editor's row, once its record answers -- or why not. */
async function editorRow(root: string): Promise<ServerRow> {
  const row = { name: "editor", what: "the spell app (vite)" }
  const started = Date.now()
  while (Date.now() - started < EDITOR_TIMEOUT_MS) {
    try {
      const { url } = JSON.parse(readFileSync(join(root, EDITOR_FILE), "utf8")) as { url: string }
      await fetch(url, { signal: AbortSignal.timeout(2000) })
      return { ...row, url, state: "running" }
    } catch {
      await new Promise((done) => setTimeout(done, 250))
    }
  }
  return { ...row, url: "-", state: "didn't answer:  see .spell-server.editor.log", failed: true }
}

/** The row of Spell UI's docs site, once its bundle answers -- or why not. */
async function spellUIRow(base: string): Promise<ServerRow> {
  const row = { name: "Spell UI's docs site", url: `${base}/components/ui/`, what: "static pages, by the page server" }
  try {
    const response = await fetch(`${base}/components/ui/_assets/site.js`, {
      signal: AbortSignal.timeout(UI_TIMEOUT_MS)
    })
    if (response.ok) return { ...row, state: "running" }
    const fix = "see .spell-server.log, or run `spell bundle ui-site`"
    return { ...row, state: `its bundle answered ${response.status}:  ${fix}`, failed: true }
  } catch (error) {
    return { ...row, state: `didn't answer (${(error as Error).message}):  see .spell-server.log`, failed: true }
  }
}

/** `rows` as aligned lines:  name, port, URL, what it serves, state;  under a line naming checkout `root`. */
export function serverLines(root: string, rows: ServerRow[]): string[] {
  const width = (key: "name" | "url" | "what") => Math.max(...rows.map((row) => row[key].length))
  const port = (url: string) => (url === "-" ? "-" : new URL(url).port)
  return [
    `Spell servers of ${root}:`,
    ...rows.map(
      (row) =>
        `  ${row.name.padEnd(width("name"))}  ${port(row.url).padStart(5)}  ${row.url.padEnd(width("url"))}  ` +
        `${row.what.padEnd(width("what"))}  ${row.state}`
    )
  ]
}

/** Where the page server records its editor:  spell-app's `EditorServer`'s `{ url, pid }`. */
const EDITOR_FILE = ".spell-server.editor.json"

/** How long the editor may take:  Vite may be building its dependency cache. */
const EDITOR_TIMEOUT_MS = 90_000

/** How long the Spell UI check may take:  a static file from the page server, which may wait for its build. */
const UI_TIMEOUT_MS = 130_000

////////////////
// ## `spell server stop`
////////////////

/**
 * `spell server stop [local|all]`:
 * - `local` (default):  the kit's page server, as `src/server/page/cli.ts stop` (its editor stops with it)
 * - `all`:  every web server `start all` starts (`pageServerRoot()`):  the page server, then the editor too, from its
 *   record, when it's still running;  e.g. after the page server died without stopping it (kill -9)
 * - Throws `CliError` for another word.
 */
export async function stopServers(which = "local"): Promise<number> {
  if (which === "local") return pageServer(["stop"])
  if (which !== "all") throw new CLI.CliError(`stop what?  '${which}':  local (default) or all`)
  const root = pageServerRoot(process.cwd())
  // read first:  a page server that stops takes its editor down with it, and the editor's record too
  const editorPid = editorPidOf(root)
  const stopped = await new SRV.PidFile(root).stop()
  CLI.out(`page server:  ${stopped ? "stopped" : "not running"}`)
  CLI.out(`editor:  ${stopEditor(root, editorPid, { withPageServer: stopped })}`)
  return CLI.EXIT.OK
}

/** The editor's pid, from `root`'s record;  `undefined` when there's none, or it can't be read. */
function editorPidOf(root: string): number | undefined {
  const file = join(root, EDITOR_FILE)
  if (!existsSync(file)) return undefined
  try {
    return (JSON.parse(readFileSync(file, "utf8")) as { pid?: number }).pid
  } catch {
    // an unreadable record:  nothing to stop
    return undefined
  }
}

/**
 * Stop editor `pid` (from `root`'s record, read before the page server stopped);  what happened, in a few words.
 * - Gone already, after `withPageServer` stopped:  the page server took it down with it
 *   (epic `repo-split` I68:  this said "not running");  gone with no page server stopped:  "not running".
 * - Else its whole process group (Vite starts it detached), else the one process;  the record goes either way.
 * - NEVER throws.
 */
function stopEditor(root: string, pid: number | undefined, { withPageServer }: { withPageServer: boolean }): string {
  rmSync(join(root, EDITOR_FILE), { force: true })
  if (!pid) return "not running"
  if (!SRV.isProcessAlive(pid)) return withPageServer ? "stopped, with the page server" : "not running"
  for (const target of [-pid, pid]) {
    try {
      process.kill(target, "SIGTERM")
      return "stopped"
    } catch {
      // not a group, or gone:  try the next
    }
  }
  return "not running"
}
