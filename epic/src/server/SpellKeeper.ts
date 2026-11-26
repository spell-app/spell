import { spawn } from "node:child_process"
import { statSync } from "node:fs"
import { join } from "node:path"

import { CLI } from "spell/cli"
import { KeeperList, type KeeperServer } from "spell/server/keeper"

import { EngineFiles } from "spell/epic/config/EngineFiles.mjs"
import { EpicConfig } from "spell/epic/config/EpicConfig"

import { DEFAULT_EPIC_PORT, type Repo } from "./server.types"

/****************
 * ### `SpellKeeper`
 * The epic hub's side of SPELL'S SERVER KEEPER (`spell/server/keeper`, epic `editor` P48):  since epic `epic-engine`
 * P85 the hub keeps no servers itself.  It hands Spell's keeper what's its own, and makes sure it runs.
 * - `register()`:  each repo the hub serves is a main checkout for the keeper to keep (`spell keeper add --checkout`),
 *   and each of its own servers (its `.epic/config.json5` `servers`:  a work project's proxy server, say) a server it
 *   watches and starts (`spell keeper add <name> --check ...`);  the hub itself too, as one of the default repo's, so
 *   the keeper brings it back when it's down
 *   - written to the keeper's list (`KeeperList`, `~/.spell/keeper.json5`) the way `spell keeper add` writes it, but
 *     in this process:  a server already there as it is changes nothing, and nothing is written
 * - `ensure()`:  `spell keeper ensure --take-over --quiet`, detached:  Spell's keeper started, taking over from a
 *   keeper an older hub runs, so there's never a gap
 * - `settingsStamp()`:  when the repos' settings last changed, so the hub registers again after an edit
 * - NEVER throws:  the hub serves its pages whatever the keeper does
 ****************/
export class SpellKeeper {
  /** the keeper's list */
  readonly list: KeeperList

  /** - `list`:  default the keeper's own (`KeeperList`;  `SPELL_KEEPER_HOME` moves it) */
  constructor({ list = new KeeperList() }: { list?: KeeperList } = {}) {
    this.list = list
  }

  /**
   * SIDE EFFECT:  `repos` and their own servers registered with Spell's keeper, and the hub (`hub`:  its port) as the
   * default repo's;  returns how many entries were new or changed.  NEVER throws.
   */
  register(repos: Repo[], { hub = DEFAULT_EPIC_PORT }: { hub?: number } = {}): number {
    let changed = 0
    for (const repo of repos) {
      try {
        if (this.list.addCheckout(repo.checkout, repo.name)) changed++
        const servers: KeeperServer[] = EpicConfig.of(repo.checkout).servers.map((server) => ({
          ...server,
          checkout: repo.checkout
        }))
        if (repo.isDefault) servers.push(hubServer(repo.checkout, hub))
        for (const server of servers) if (this.addServer(server)) changed++
      } catch (error) {
        console.error(`epic server:  couldn't hand ${repo.name}'s servers to Spell's keeper:`, error)
      }
    }
    return changed
  }

  /**
   * SIDE EFFECT:  Spell's keeper started in the background unless it's the one in charge already, taking over from a
   * keeper an older hub runs.  Detached:  never waits for it.  NEVER throws.
   */
  static ensure(): void {
    try {
      const args = [join(CLI.KIT_ROOT, "bin", "spell.mjs"), "keeper", "ensure", "--take-over", "--quiet"]
      spawn(process.execPath, args, { detached: true, stdio: "ignore" }).unref()
    } catch (error) {
      console.error("epic server:  couldn't start Spell's server keeper:", error)
    }
  }

  /** the newest change of the repos' epic settings (`.epic/config.json5`), ms;  none readable:  0 */
  static settingsStamp(repos: Repo[]): number {
    let newest = 0
    for (const repo of repos) {
      try {
        newest = Math.max(newest, statSync(join(repo.checkout, SETTINGS_FILE)).mtimeMs)
      } catch {
        // no settings file:  nothing to time
      }
    }
    return newest
  }

  /** `server` added, unless the list has it as it is;  whether it was */
  private addServer(server: KeeperServer): boolean {
    const known = this.list.serversOf(server.checkout).find((each) => each.name === server.name)
    if (known && sameServer(known, server)) return false
    this.list.addServer(server)
    return true
  }
}

/** The repo's epic settings, from its main checkout. */
const SETTINGS_FILE = ".epic/config.json5"

/** The hub as one of the default repo's servers:  checked at its own address, started with `epic hub ensure`. */
function hubServer(checkout: string, port: number): KeeperServer {
  return {
    name: HUB_NAME,
    check: `http://127.0.0.1:${port}/api/server`,
    start: `"${process.execPath}" "${EngineFiles.bin}" hub ensure`,
    what: "the epic pages of every project, and the Servers tab",
    checkout
  }
}

/** The hub's name on the keeper's list and the Servers page. */
export const HUB_NAME = "epic hub"

/** whether two registrations say the same, the checkout by its spelling in the list */
function sameServer(one: KeeperServer, other: KeeperServer): boolean {
  return (
    one.check === other.check &&
    one.start === other.start &&
    one.what === other.what &&
    (one.folder ?? one.checkout) === (other.folder ?? other.checkout)
  )
}
