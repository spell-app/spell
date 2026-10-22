import { existsSync, readFileSync, rmSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

import { SRV } from "spell-kit/server"
import { PageServer, findRoot, pageServerSettings } from "spell-kit/server/page"
import { CLI } from "spell-kit/cli"

/**
 * `spell server ...`:  this checkout's page server, and every web server of the checkout.
 * - `pageServer()`:  `local`, `start`, `status`, `url <file>`, `prune`:  the page server's own command line
 *   (`src/server/page/cli.ts`), its arguments verbatim;  root `yarn server` runs the same file
 * - `startAll()`:  `spell server start all`
 * - `stopServers()`:  `spell server stop [local|all]`
 */

/** The page server's command line, as `runTool()` runs it:  under `tsx`, with the kit's node settings. */
const PAGE_SERVER_CLI: CLI.ToolSpec = { tool: "src/server/page/cli.ts", tsx: "tsconfig.node.json" }

/**
 * Run the page server's own command line (`src/server/page/cli.ts`) with `args` verbatim, in the current folder:
 * its checkout is the one the current folder is in (`--root` says another).  Resolves to its exit code.
 * - Inside a kit, from a folder whose checkout has no page server settings (the kit's root, the content folder,
 *   spell-ui ...):  the kit's repo that has them, by an added `--root` (`withServersRoot()`, epic `repo-split` I62)
 */
export function pageServer(args: string[]): Promise<number> {
  return CLI.runTool(PAGE_SERVER_CLI, withServersRoot(args))
}

/**
 * `args`, with `--root <checkout>` added when the page server of the current folder's checkout would serve nothing:
 * - inside a kit, and `serversRoot()` isn't the checkout the folder is in (`findRoot()`):
 *   from the kit's root, `spell server start` starts spell-app's page server, and `status` finds it
 * - unchanged when `args` say `--root` already, outside a kit, or in the checkout that has the settings
 */
export function withServersRoot(args: string[], from = process.cwd()): string[] {
  if (args.includes("--root") || !CLI.findCheckout(CLI.KIT_MARKER, from, "")) return args
  const root = serversRoot(from)
  return root === (findRoot(from) ?? resolve(from)) ? args : [...args, "--root", root]
}

////////////////
// ## `spell server start all`
////////////////

/**
 * `spell server start all`:  start every web server of the checkout that isn't running, wait until each answers,
 * and print where they are.  What `/spell-serve` runs, and `/spell-docs` before it shows a page.
 * - Which checkout:  `serversRoot()`.
 * - The PAGE SERVER:  docs, epic pages, the app's `/api`.  Started in the background if it isn't running.
 * - The EDITOR (Vite, the spell app):  the page server's child (spell-app's `EditorServer`), started once the page
 *   server listens;  this waits for its record, `.spell-server.editor.json`, to answer.
 *   Only where the page server's settings run spell-app's routes (`appRoutes`).
 * - SPELL UI's docs site:  static pages the page server itself serves at `/components/ui/`;  this checks its bundle
 *   answers (`/components/ui/_assets/site.js`:  not committed;  the page server builds it when it starts, if stale).
 *   Only where the settings name Spell UI's component set (`ui`).
 * - Prints one row per server:  name, port, URL, state.  Exits 1 if any didn't come up.
 * - Was spell-app's `scripts/serve.mjs` (`yarn serve`) until epic `repo-split` P13.
 */
export async function startAll(): Promise<number> {
  const root = serversRoot()
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

/**
 * The checkout whose servers `start all` and `stop all` mean:  the nearest folder from the current one up whose
 * `package.json` has page server settings (`"pageServer"`:  spell-app's);  else the first installed repo that has
 * them (`spell-app/`, from the kit's root);  else the nearest git checkout.
 */
export function serversRoot(from = process.cwd()): string {
  for (let dir = resolve(from); ; dir = dirname(dir)) {
    if (hasPageServer(dir)) return dir
    if (dirname(dir) === dir) break
  }
  const kit = CLI.findCheckout(CLI.KIT_MARKER, from)
  const repo = CLI.spellRepos(kit).find((each) => hasPageServer(each.root))
  return repo?.root ?? findRoot(from) ?? resolve(from)
}

/** Does `dir`'s `package.json` have page server settings? */
function hasPageServer(dir: string): boolean {
  const file = join(dir, "package.json")
  if (!existsSync(file)) return false
  try {
    return "pageServer" in (JSON.parse(readFileSync(file, "utf8")) as object)
  } catch {
    return false
  }
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
 * - `local` (default):  the page server of the checkout the current folder is in, as `src/server/page/cli.ts stop`
 *   (its editor stops with it);  inside a kit, the one `serversRoot()` names (`pageServer()`)
 * - `all`:  every web server `start all` starts (`serversRoot()`):  the page server, then the editor too, from its
 *   record, when it's still running;  e.g. after the page server died without stopping it (kill -9)
 * - Throws `CliError` for another word.
 */
export async function stopServers(which = "local"): Promise<number> {
  if (which === "local") return pageServer(["stop"])
  if (which !== "all") throw new CLI.CliError(`stop what?  '${which}':  local (default) or all`)
  const root = serversRoot()
  const stopped = await new SRV.PidFile(root).stop()
  CLI.out(`page server:  ${stopped ? "stopped" : "not running"}`)
  CLI.out(`editor:  ${stopEditor(root)}`)
  return CLI.EXIT.OK
}

/**
 * Stop the editor `root`'s record names, when it's still running;  what happened, in a word or two.
 * - Its whole process group (Vite starts it detached), else the one process;  the record goes either way.
 * - NEVER throws.
 */
function stopEditor(root: string): string {
  const file = join(root, EDITOR_FILE)
  if (!existsSync(file)) return "not running"
  let pid: number | undefined
  try {
    pid = (JSON.parse(readFileSync(file, "utf8")) as { pid?: number }).pid
  } catch {
    // an unreadable record:  nothing to stop, just the file
  }
  rmSync(file, { force: true })
  if (!pid) return "not running"
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
