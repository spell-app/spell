import { join, resolve } from "node:path"

import { SRV } from "spell/server"
import { KeeperList, KeeperProgram, SPELL_KEEPER, type KeptServer, type KeptServersAnswer } from "spell/server/keeper"
import { CLI } from "spell/cli"

/**
 * `spell keeper ...`:  Spell's SERVER KEEPER, the one program per Mac that keeps every main checkout's page server and
 * editor up, and the servers registered with it (`spell/server/keeper`;  epic `editor` P48).
 * - `start`:  in the background, taking over from whichever keeper is in charge (the epic hub's, say)
 * - `ensure`:  `start` only when no keeper is in charge;  quiet;  `--take-over`:  only Spell's own counts
 * - `add`:  a server to watch, or (`--checkout`) a main checkout to keep
 * - `status`:  the keeper in charge, and every server as its last look saw it
 * - `local`:  in this terminal, until Ctrl-C:  what `start` runs in the background
 * - Which code runs it:  the MAIN checkout's of the kit this `spell` is (it keeps main's servers on main's code);
 *   `--here` runs this checkout's, to try a branch
 */

/** Options of `spell keeper`'s verbs. */
export type KeeperOptions = {
  json?: boolean
  quiet?: boolean
  takeOver?: boolean
  here?: boolean
  check?: string
  start?: string
  checkout?: string
  what?: string
  port?: string
}

/** `spell keeper <verb>`;  resolves to the exit code.  Throws `CliError` for a mistake on the command line. */
export async function keeperCommand(verb: string, name: string | undefined, options: KeeperOptions): Promise<number> {
  switch (verb) {
    case "start":
      return startKeeper(options)
    case "ensure":
      return ensureKeeper(options)
    case "add":
      return addToKeeper(name, options)
    case "status":
      return keeperStatus(options)
    default:
      throw new CLI.CliError(`spell keeper ${verb}?  start, ensure, add, status or local`)
  }
}

/** `spell keeper local`:  the keeper in this process;  it runs until stopped, so it never resolves to an exit code. */
export async function runKeeperHere(options: KeeperOptions): Promise<void> {
  const port = options.port ? Number(options.port) : undefined
  await programFor(options).run(port ? { port } : {})
}

/** `start`:  a keeper in the background, in charge */
async function startKeeper(options: KeeperOptions): Promise<number> {
  const record = await programFor(options).start()
  CLI.out(`server keeper:  running at ${record.base} (pid ${record.pid}), its log ${logFile()}`)
  return CLI.EXIT.OK
}

/** `ensure`:  a keeper started only when none is in charge */
async function ensureKeeper(options: KeeperOptions): Promise<number> {
  const { record, started } = await programFor(options).ensure({ takeOver: options.takeOver })
  if (!options.quiet) {
    const who = record.keeper ?? "epic hub"
    CLI.out(`server keeper:  ${started ? "started" : `${who}'s running`} at ${record.base} (pid ${record.pid})`)
  }
  return CLI.EXIT.OK
}

/** `add`:  a server registered, or a main checkout kept;  the keeper asked to look at once */
async function addToKeeper(name: string | undefined, options: KeeperOptions): Promise<number> {
  const list = new KeeperList()
  if (!name) {
    if (!options.checkout)
      throw new CLI.CliError(
        'add what?  spell keeper add <name> --check <url | port> [--start "<command>"], or --checkout <dir>'
      )
    const main = mainOf(options.checkout)
    CLI.out(`${main}:  ${list.addCheckout(main) ? "kept from now on" : "kept already"}`)
  } else {
    if (!options.check) throw new CLI.CliError(`add ${name}:  how is it checked?  --check <url | port>`)
    const checkout = mainOf(options.checkout ?? process.cwd())
    list.addCheckout(checkout)
    list.addServer({
      name,
      check: options.check,
      checkout,
      ...(options.start && { start: options.start }),
      ...(options.what && { what: options.what })
    })
    CLI.out(`${name}:  watched${options.start ? ", and started when it's down" : ""} (${checkout})`)
  }
  await askToLook()
  return CLI.EXIT.OK
}

/** `status`:  the keeper in charge, and every server */
async function keeperStatus(options: KeeperOptions): Promise<number> {
  const record = KeeperProgram.running()
  if (!record) {
    if (options.json) CLI.out(JSON.stringify({ keeper: null, servers: [] }, null, 2))
    else CLI.out("server keeper:  none running -- spell keeper start")
    return CLI.EXIT.ERRORS
  }
  const answer = await keeperAnswer(record)
  if (options.json) {
    CLI.out(JSON.stringify({ keeper: { ...record, token: undefined }, ...answer }, null, 2))
    return CLI.EXIT.OK
  }
  const who = record.keeper ?? "epic hub"
  CLI.out(`server keeper:  ${who === SPELL_KEEPER ? "Spell's" : `${who}'s`}, at ${record.base} (pid ${record.pid})`)
  if (answer.handsOff) CLI.out("Hands off is on:  the keeper starts and stops nothing by itself.")
  for (const row of answer.servers) CLI.out(`  ${statusLine(row)}`)
  return CLI.EXIT.OK
}

////////////////
// ## Helpers
////////////////

/** the keeper's program, run by the main checkout's `spell` (or this one's, `--here`) */
function programFor(options: KeeperOptions): KeeperProgram {
  const kit = options.here ? CLI.KIT_ROOT : (SRV.checkoutOf(CLI.KIT_ROOT)?.main ?? CLI.KIT_ROOT)
  const command = [process.execPath, join(kit, "bin", "spell.mjs"), "keeper", "local"]
  if (options.port) command.push("--port", options.port)
  return new KeeperProgram({ command })
}

/** `dir`'s main checkout (a worktree's main);  not in git:  `dir` itself */
function mainOf(dir: string): string {
  return SRV.checkoutOf(resolve(dir))?.main ?? resolve(dir)
}

/** the keeper's log */
function logFile(): string {
  return join(SRV.keeperHome(), "keeper.log")
}

/** the keeper's `GET /api/servers` */
export async function keeperAnswer(record: SRV.KeeperRecord): Promise<KeptServersAnswer> {
  const response = await fetch(`${record.base}${SRV.KEEPER_API}`, { signal: AbortSignal.timeout(STATUS_WAIT_MS) })
  if (!response.ok) throw new CLI.CliError(`the server keeper answered ${response.status}`)
  return (await response.json()) as KeptServersAnswer
}

/** the keeper in charge asked to look now, so what's just added shows.  NEVER throws */
async function askToLook(): Promise<void> {
  const record = KeeperProgram.running()
  if (!record) return
  try {
    await fetch(`${record.base}${SRV.KEEPER_API}/look`, {
      method: "POST",
      headers: { "x-server-token": record.token },
      signal: AbortSignal.timeout(STATUS_WAIT_MS)
    })
  } catch {
    // its next look sees it anyway, within 10 seconds
  }
}

/** one server's line:  where, its name, state, address and why */
export function statusLine(row: KeptServer): string {
  const where = row.repo ? `${row.repo}${row.worktree ? ` ⎇ ${row.worktree}` : ""}` : ""
  return [where.padEnd(20), row.name.padEnd(14), row.state.padEnd(9), row.address ?? "", row.why ? ` (${row.why})` : ""]
    .join(" ")
    .trimEnd()
}

/** How long `status` waits for the keeper, ms. */
const STATUS_WAIT_MS = 15_000
