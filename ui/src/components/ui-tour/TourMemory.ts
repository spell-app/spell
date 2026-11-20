import { PrefStore } from "spell/util/persist/PrefStore"
import { ServerPlace } from "spell/util/persist/ServerPlace"

/****************
 * ### `TourMemory`
 * Where a `<ui-tour remember>` keeps that it was taken, so it isn't offered again:
 * - `remember` alone:  this browser's storage, `spell-ui-tours:seen:<name>`
 * - `remember="on server"`:  the page server's preferences (`ServerPlace`), kept with the person's account,
 *   so it follows them to every machine
 * - Plain data, no Solid:  `UITour` makes one per tour, from its attributes.
 * - NEVER throws:  storage that fails (blocked, offline) just doesn't remember, as `PrefStore` does.
 * - Taken means finished, or closed by its ✕ or Escape, or turned down in its offer:
 *   the Help menu still starts it whenever asked.
 ****************/
export class TourMemory {
  /** The tour's name:  its key. */
  readonly key: string

  /** Kept on the server, with the person's account, rather than in this browser. */
  readonly isOnServer: boolean

  constructor({ name, remember }: { name: string; remember: string }) {
    this.key = SEEN + name
    this.isOnServer = ON_SERVER.test(remember)
  }

  /** Was it taken before?  Waits for the server, for `remember="on server"`. */
  async hasBeenSeen(): Promise<boolean> {
    if (!this.isOnServer) return !!TourMemory.local.get(this.key)
    return !!(await TourMemory.server.load(this.key))
  }

  /** Remember it was taken. */
  async markSeen(): Promise<void> {
    if (!this.isOnServer) return void TourMemory.local.set(this.key, true)
    await TourMemory.server.save(this.key, true)
  }

  /** Forget it was taken:  it can be offered again. */
  forget(): void {
    // a waited-on place takes a quick write, and does it later
    ;(this.isOnServer ? TourMemory.server : TourMemory.local).forget(this.key)
  }

  /** The browser's store, made on first use. */
  private static get local(): PrefStore {
    return (TourMemory.localStore ??= new PrefStore(STORE_NAME))
  }

  /** The server's store, made on first use. */
  private static get server(): PrefStore {
    return (TourMemory.serverStore ??= new PrefStore(STORE_NAME, { place: ServerPlace.shared }))
  }

  /** `local`'s, once made. */
  private static localStore?: PrefStore

  /** `server`'s, once made. */
  private static serverStore?: PrefStore
}

/** Every tour's store:  the start of each key. */
const STORE_NAME = "spell-ui-tours"

/** Before a tour's name, in its key. */
const SEEN = "seen:"

/** `remember="on server"`:  with the person's account. */
const ON_SERVER = /server/i
