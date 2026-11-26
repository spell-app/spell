/**
 * The editor's look at this machine's servers (epic `editor` T185):  are they all up, and where is the Servers page.
 * - The page server reads the server keeper's record for the editor (`keeperRoutes`), so the page never guesses a
 *   port:  the keeper's own one changes when 4949 is taken.
 * - Help › Servers shows it (`ServersGlance`), and opens the page in a dialog.
 * - Types and one address only:  browser-safe, and node's route reads it too.
 */

/** Where the editor asks:  `GET` answers a `KeeperGlance` (`keeperRoutes`). */
export const KEEPER_GLANCE_API = "/api/keeper/glance"

/**
 * This machine's servers, at a glance:  `{}` when no keeper runs here.
 * - `page`:  the Spell Servers page, on the keeper's own port;  none:  no keeper on this machine
 * - `servers`:  how many it keeps;  none:  it runs, but didn't answer
 * - `down`:  how many of them should be running and aren't (the keeper's `down`)
 */
export type KeeperGlance = {
  page?: string
  servers?: number
  down?: number
}
