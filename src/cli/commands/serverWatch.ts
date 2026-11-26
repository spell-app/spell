import { SRV } from "spell/server"
import { pageServerRoot } from "spell/server/page"
import type { KeptServer } from "spell/server/keeper"
import { CLI } from "spell/cli"

/**
 * `spell server status --watch`:  every server, as the Spell Servers page shows them, in a terminal table redrawn every
 * `WATCH_SECONDS` until Ctrl-C (epic `editor` P49).
 * - From the server keeper in charge (its `/api/servers`);  none running:  from this kit's own files, its main
 *   checkout's and each worktree's page server and editor (`rowsFromFiles()`), so it works with no keeper too
 * - The table:  where, which server, its state, how long it's been up, what it's building, its address or why
 *   (`statusTable()`, pure, for the tests)
 */

/** How often the table is redrawn, seconds. */
export const WATCH_SECONDS = 2

/** `spell server status --watch`:  runs until Ctrl-C, so it never resolves */
export async function watchStatus(): Promise<number> {
  const root = pageServerRoot(process.cwd())
  for (;;) {
    const { rows, from } = await rowsNow(root)
    // clear the screen, then draw:  the table stays put as it changes
    process.stdout.write("\x1b[2J\x1b[H")
    CLI.out(`${from}  ·  ${new Date().toLocaleTimeString()}  ·  Ctrl-C to stop\n`)
    CLI.out(statusTable(rows))
    await new Promise((done) => setTimeout(done, WATCH_SECONDS * 1000))
  }
}

/** every server now, and where the rows came from:  the keeper in charge, else this kit's files.  NEVER throws */
export async function rowsNow(root: string): Promise<{ rows: KeptServer[]; from: string }> {
  const keeper = new SRV.KeeperLink().running()
  if (keeper) {
    try {
      const response = await fetch(`${keeper.base}${SRV.KEEPER_API}`, { signal: AbortSignal.timeout(5_000) })
      const answer = (await response.json()) as { servers: KeptServer[] }
      return { rows: answer.servers, from: `server keeper (${keeper.keeper ?? "epic hub"}), ${keeper.base}` }
    } catch {
      // it doesn't answer:  the files say what they can
    }
  }
  return { rows: await rowsFromFiles(root), from: "no server keeper:  this kit's own files" }
}

/** the page server and editor of `root`'s main checkout and each of its worktrees, from their records.  NEVER throws */
export async function rowsFromFiles(root: string): Promise<KeptServer[]> {
  const main = SRV.checkoutOf(root)?.main ?? root
  const checkouts: [string | undefined, string][] = [[undefined, main], ...SRV.worktreesOf(main)]
  const rows: KeptServer[] = []
  for (const [worktree, checkout] of checkouts) {
    const running = await SRV.PidFile.forPageServer(checkout).status()
    const where = { repo: "spell", checkout, canStart: true, ...(worktree && { worktree }) }
    const id = (name: string) => [worktree, name].filter(Boolean).join("/")
    // a worktree that never ran one has no row
    if (!running && worktree && !Object.keys(new SRV.PortBook().portsOf(checkout)).length) continue
    rows.push({
      ...where,
      id: id("page server"),
      name: "page server",
      what: "",
      state: running ? "running" : "stopped",
      ...(running && { address: `${running.base}/`, started: running.started }),
      ...(running?.building?.length && { building: running.building })
    })
    const editor = SRV.editorAddressOf(checkout)
    rows.push({
      ...where,
      id: id("editor"),
      name: "editor",
      what: "",
      state: editor ? "running" : "stopped",
      ...(editor && { address: editor })
    })
  }
  return rows
}

/** `rows` as a table:  one line each, its columns lined up.  Pure */
export function statusTable(rows: KeptServer[], now = Date.now()): string {
  const lines = rows.map((row) => [
    row.worktree ? `⎇ ${row.worktree}` : row.repo || "this Mac",
    row.name,
    row.state,
    row.started && row.state === "running" ? upFor(row.started, now) : "",
    row.building?.length ? `building ${row.building.join(", ")}` : "",
    row.state === "running" ? (row.address ?? "") : (row.why ?? "").replaceAll("\n", " ")
  ])
  const header = ["where", "server", "state", "up for", "doing", "address"]
  const widths = header.map((words, column) => Math.max(words.length, ...lines.map((line) => line[column]!.length)))
  const draw = (line: string[]) =>
    line
      .map((cell, column) => cell.padEnd(widths[column]!))
      .join("  ")
      .trimEnd()
  return [draw(header), ...lines.map(draw)].join("\n")
}

/** how long since `iso`, short:  `40s`, `12m`, `3h 5m`, `2d` */
export function upFor(iso: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  return hours < 24 ? `${hours}h ${minutes % 60}m` : `${Math.floor(hours / 24)}d`
}
