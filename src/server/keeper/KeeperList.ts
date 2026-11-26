import { mkdirSync } from "node:fs"
import { basename, dirname, join, resolve } from "node:path"

import { SRV } from "spell/server"

import { KEEPER_LIST_FILE, type KeeperListData, type KeeperRepo, type KeeperServer } from "./keeper.types"

/****************
 * ### `KeeperList`
 * What Spell's server keeper keeps, as it reads it itself (epic `editor` P48):  `~/.spell/keeper.json5`.
 * - `checkouts`:  the MAIN checkouts whose page server and editor it keeps;  each one's worktrees come from git
 *   (`ServerKeeper`), never this list
 *   - a main checkout's `spell server start` adds itself;  `spell keeper add --checkout <dir>` by hand
 * - `servers`:  other servers it watches, registered with `spell keeper add <name> --check <url | port>`, each
 *   for a checkout (a work project's proxy server, say)
 * - no epic settings read:  a person using Spell with no epics has the same keeper
 * - a JSON5 file (`SRV.DataFile`):  a comment written in it by hand stays
 ****************/
export class KeeperList {
  /** the list's file */
  readonly file: string

  /** - `home`:  the keeper's home (default `SRV.keeperHome()`) */
  constructor({ home = SRV.keeperHome() }: { home?: string } = {}) {
    this.file = join(home, KEEPER_LIST_FILE)
  }

  /** the list as written;  none yet:  empty */
  read(): KeeperListData {
    try {
      return SRV.DataFile.read<KeeperListData>(this.file) ?? {}
    } catch (error) {
      console.error(`server keeper:  ${this.file} won't read;  keeping nothing from it`, error)
      return {}
    }
  }

  /** whether the list exists:  something was registered, so the keeper has work */
  get exists(): boolean {
    return SRV.DataFile.exists(this.file)
  }

  /** the main checkouts it keeps */
  get checkouts(): KeeperRepo[] {
    return this.read().checkouts ?? []
  }

  /** the registered servers of main checkout `checkout` (all of them, given none) */
  serversOf(checkout?: string): KeeperServer[] {
    const servers = this.read().servers ?? []
    if (!checkout) return servers
    return servers.filter((server) => server.checkout && SRV.RealPath.same(server.checkout, checkout))
  }

  /**
   * SIDE EFFECT:  main checkout `checkout` kept, named `name` (default its folder's name);  already there:  nothing
   * changes.  Returns whether it was added.
   */
  addCheckout(checkout: string, name = basename(resolve(checkout))): boolean {
    const list = this.read()
    const checkouts = list.checkouts ?? []
    if (checkouts.some((each) => SRV.RealPath.same(each.checkout, checkout))) return false
    this.write({ ...list, checkouts: [...checkouts, { name, checkout: resolve(checkout) }] })
    return true
  }

  /**
   * SIDE EFFECT:  server `server` registered, in place of one of the same name for the same checkout.
   * - throws `TypeError` for one with no name or check
   */
  addServer(server: KeeperServer): void {
    if (!server.name || !server.check)
      throw new TypeError("KeeperList.addServer():  a server needs a name and a check (a URL or a port)")
    const list = this.read()
    const checkout = server.checkout && resolve(server.checkout)
    const others = (list.servers ?? []).filter(
      (each) => !(each.name === server.name && sameCheckout(each.checkout, checkout))
    )
    this.write({ ...list, servers: [...others, { ...server, ...(checkout && { checkout }) }] })
  }

  /** SIDE EFFECT:  the list written, its folder made */
  private write(list: KeeperListData): void {
    mkdirSync(dirname(this.file), { recursive: true })
    SRV.DataFile.write(this.file, list)
  }
}

/** whether two optional checkouts are the same one (both none counts) */
function sameCheckout(one: string | undefined, other: string | undefined): boolean {
  if (!one || !other) return one === other
  return SRV.RealPath.same(one, other)
}
