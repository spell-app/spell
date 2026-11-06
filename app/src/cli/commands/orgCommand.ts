import { randomBytes } from "crypto"
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs"
import { join } from "path"

import { CLI } from "spell/cli"
import { SRV } from "spell/server"
import { SpacesHost } from "spell/server/places/SpacesHost"
import environment from "spell/app/spaces/server/node/environment"

/** The network's port:  the host's is the next one up. */
const HOST_PORT = 4960

/** The host's name:  its accounts' handles end in it. */
const HOST_NAME = "spell.localhost"

/** The record of the running host, in the cloud's folder:  its accounts' passwords, so only its person reads it. */
const RECORD_FILE = "spaces-host.json"

/** How long `stop` waits for the host to end before killing it, in ms. */
const STOP_WAIT_MS = 5000

/** The two throwaway accounts it makes:  the org's, which makes spaces, and a member's. */
const ACCOUNTS = [
  { name: "org", handleVariable: "SPACES_ALPHA_HANDLE", passwordVariable: "ATMOSPHERE_APP_PASSWORD" },
  { name: "member", handleVariable: "SPACES_ALPHA_HANDLE_2", passwordVariable: "ATMOSPHERE_APP_PASSWORD_2" }
] as const

/**
 * `spell app org host start | stop` (epic `atmosphere` P13, Q14 B):
 * Spell's own Spaces host, on this machine, for the Spaces trial to run against.
 * - `start [--port <n>]`:  run it until `Ctrl-C` (or `stop`), with two throwaway accounts;  prints how to run the
 *   trial against it
 *   - the network (account documents and handles) on `--port`, default 4960;  the host on the next port up
 *   - kept in memory:  stopping it deletes the accounts, and everything they wrote
 * - `stop`:  stop the one running
 * - The org command every org phase shares:  `setup`, `recover` and `audit` join `host` (P21, P24, P35).
 * - Node only;  loads spaces' node side alone (no `loadApp()`).
 */
export async function orgCommand(verb: string, options: OrgOptions): Promise<number> {
  if (verb === "start") return start(options)
  return stop()
}

/** Options of `spell app org host`. */
export type OrgOptions = {
  /** The network's port;  the host's is the next one up. */
  port?: number
}

/** What the running host's record holds. */
type HostRecord = {
  /** Its process. */
  pid: number
  /** Where its accounts' documents and handles are answered. */
  network: string
  /** Where the host answers. */
  host: string
  /** Its two accounts, with their passwords. */
  accounts: { name: string; did: string; handle: string; password: string }[]
  /** When it started. */
  started: string
}

/** `start`:  until `Ctrl-C` or `stop`. */
async function start({ port = HOST_PORT }: OrgOptions): Promise<number> {
  const running = hostRecord()
  if (running && SRV.isProcessAlive(running.pid)) {
    throw new CLI.CliError(`a Spaces host is running already (pid ${running.pid}):  spell app org host stop`)
  }
  const host = await new SpacesHost().start([HOST_NAME], { port })
  const accounts = []
  for (const { name } of ACCOUNTS) {
    const handle = `${name}-${randomBytes(3).toString("hex")}.${HOST_NAME}`
    const did = `did:plc:${randomBytes(12).toString("hex")}`
    const password = randomBytes(12).toString("base64url")
    await host.addAccount(did, { handle, host: HOST_NAME, password })
    accounts.push({ name, did, handle, password })
  }
  const record: HostRecord = {
    pid: process.pid,
    network: host.network.directory,
    host: host.hostUrl(HOST_NAME),
    accounts,
    started: new Date().toISOString()
  }
  writeRecord(record)

  console.log(`Spell's Spaces host is up on ${record.host}, its accounts' network on ${record.network}.`)
  console.log(`Its accounts, thrown away when it stops:`)
  for (const { name, handle } of accounts) console.log(`  ${name}:  ${handle}`)
  console.log(`\nThe Spaces trial against it, from the kit's root:\n`)
  console.log(`  ${trialCommand(record)}\n`)
  console.log(`Stop it with Ctrl-C, or:  spell app org host stop`)

  await new Promise<void>((done) => {
    process.once("SIGINT", () => done())
    process.once("SIGTERM", () => done())
  })
  await host.close()
  if (hostRecord()?.pid === process.pid) rmSync(recordFile(), { force: true })
  console.log("Spell's Spaces host stopped:  its accounts are gone.")
  return 0
}

/** `stop`:  the running host ends, and its record goes. */
async function stop(): Promise<number> {
  const record = hostRecord()
  if (!record || !SRV.isProcessAlive(record.pid)) {
    rmSync(recordFile(), { force: true })
    console.log("No Spaces host is running.")
    return 1
  }
  await SRV.endProcess(record.pid, STOP_WAIT_MS)
  rmSync(recordFile(), { force: true })
  console.log(`Stopped Spell's Spaces host (pid ${record.pid}):  its accounts are gone.`)
  return 0
}

/** The trial's command line, against the host in `record`. */
function trialCommand({ network, accounts }: HostRecord): string {
  const variables = ACCOUNTS.map(({ handleVariable, passwordVariable }, index) => {
    const { handle, password } = accounts[index]!
    return `${handleVariable}=${handle} ${passwordVariable}=${password}`
  })
  return [
    `SPACES_NETWORK=${network}`,
    ...variables,
    "yarn vp test run --project server tests/server/spacesTrial.test.ts"
  ].join(" ")
}

/** Where the record is. */
function recordFile(): string {
  return join(environment.cloudDir, RECORD_FILE)
}

/** SIDE EFFECT:  the record written, readable by this machine's person only. */
function writeRecord(record: HostRecord): void {
  mkdirSync(environment.cloudDir, { recursive: true })
  writeFileSync(recordFile(), `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600 })
  chmodSync(recordFile(), 0o600)
}

/** The running host's record:  `undefined` when there's none, or it can't be read.  NEVER throws. */
function hostRecord(): HostRecord | undefined {
  if (!existsSync(recordFile())) return undefined
  try {
    return JSON.parse(readFileSync(recordFile(), "utf8")) as HostRecord
  } catch {
    return undefined
  }
}
