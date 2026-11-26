import { spawn } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

/**
 * Before any `spell` command:  Spell's server keeper started in the background when none is running (epic `editor`
 * P48), so the servers it keeps come back whatever was typed.
 * - Fast, and quiet:  node's own modules only, one file read and one process check;  only when it finds no live
 *   keeper does it start `spell keeper ensure --quiet`, detached, and never waits for it
 * - Only once something was registered (`~/.spell/keeper.json5`:  a main checkout's `spell server start` adds it),
 *   so a `spell` with nothing to keep starts nothing
 * - Not under CI or the tests (`CI`, `VITEST`), not for `spell keeper` itself, nor with `SPELL_KEEPER=off`
 * - Not while the record is the epic hub's, live or not:  until the hub hands over (epic `epic-engine`'s switch-over,
 *   its `spell keeper ensure --take-over`), it keeps itself up as before, and a keeper started here in the moment one
 *   hub replaces another would take the record from it
 * - The same files as `SRV.keeperHome()` and `SRV.KeeperLink`, read by hand:  this runs before anything is loaded
 * - NEVER throws
 */
export function ensureKeeperSoon(args: string[] = process.argv.slice(2), env = process.env): void {
  try {
    if (env.CI || env.VITEST || env.SPELL_KEEPER === "off" || args[0] === "keeper") return
    if (args.some((arg) => arg === "--help" || arg === "-h" || arg === "--version" || arg === "-V")) return
    const home = env.SPELL_KEEPER_HOME || join(homedir(), ".spell")
    if (!existsSync(join(home, "keeper.json5"))) return
    const record = readRecord(env.SPELL_KEEPER_FILE ?? join(home, "server-keeper.json"))
    // the epic hub's record, live or not:  the hub keeps itself up (`epic hub ensure`) until it hands over to Spell's
    if (record && (record.keeper ?? "epic hub") !== "spell") return
    if (record?.pid && isAlive(record.pid)) return
    const bin = process.argv[1]
    if (!bin) return
    spawn(process.execPath, [bin, "keeper", "ensure", "--quiet"], { detached: true, stdio: "ignore" }).unref()
  } catch {
    // the next command tries again
  }
}

/** the keeper's record, as written;  none or unreadable:  `undefined` */
function readRecord(file: string): { pid?: number; keeper?: string } | undefined {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as { pid?: number; keeper?: string }
  } catch {
    return undefined
  }
}

/** whether process `pid` runs */
function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    // EPERM:  alive, someone else's
    return (error as NodeJS.ErrnoException).code === "EPERM"
  }
}
