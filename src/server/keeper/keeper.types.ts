import type { SRV } from "spell/server"

/**
 * Types and constants of Spell's SERVER KEEPER (`ServerKeeper`, epic `editor` P48):  what it keeps, how each server
 * stands, its calls.
 * - Data only:  nothing here starts a server or touches the disk.
 * - The epic hub's until P48 (`epic/src/server/server.types.ts`), which still keeps its own facts beside them
 *   (`ServerFactsAnswer`:  what merged into main, what waits).
 */

////////////////
// ## What it keeps
////////////////

/**
 * A checkout the keeper keeps:  its MAIN checkout and a name for it.
 * - its worktrees come from git's own records (`worktreesOf()`), never a list
 * - the epic hub hands its repos, which carry more (`content`, `prefix`):  only these two are read
 */
export type KeeperRepo = { name: string; checkout: string }

/**
 * A server of a checkout's own that the keeper watches (a work project's proxy server, say):  registered with
 * `spell keeper add`, or handed in by the epic hub from a repo's `.epic/config.json5` (`servers`).
 * - `check`:  a URL that answers while it's up, or a port that something listens on
 * - `start`:  the shell command that starts it;  none:  only watched, and shown down when it is
 * - `folder`:  where `start` runs (default the checkout)
 * - `what`:  what it's for, a few words for its card
 * - `checkout`:  the main checkout it belongs to (in the keeper's list;  the hub's are per repo already)
 */
export type KeeperServer = {
  name: string
  check: string
  start?: string
  folder?: string
  what?: string
  checkout?: string
}

/**
 * The keeper's list, `~/.spell/keeper.json5` (`KeeperList`):  the main checkouts it keeps, and the extra servers.
 * - a main checkout's `spell server start` adds it;  `spell keeper add --checkout <dir>` by hand
 */
export type KeeperListData = { checkouts?: KeeperRepo[]; servers?: KeeperServer[] }

////////////////
// ## How each server stands
////////////////

/**
 * How a server stands, as the keeper's last look found it (`ServerKeeper`):
 * - `running`:  it answers
 * - `starting`:  the keeper started it, and it doesn't answer yet
 * - `stopped`:  not running, and that's fine:  stopped by hand, a worktree's unused, an editor with no page server
 * - `down`:  it should be running and isn't:  the Servers tab's red dot
 */
export type KeptServerState = "running" | "starting" | "stopped" | "down"

/**
 * One server the keeper keeps, a row of the Servers tab.
 * - `id`:  `<repo>/<name>`, a worktree's `<repo>/<worktree>/<name>`
 * - `repo`:  the repo it's for (`""`:  the keeper's own);  `worktree`:  the worktree's name, a main checkout's none
 * - `name`, `what`:  what it's called and what it's for
 * - `checkout`:  the checkout it serves:  what the buttons send back (`POST /api/servers/<action>`)
 * - `address`:  where it answers, while it does (a worktree's stopped one:  `port`, the one written down for it)
 * - `why`:  a few words on its state:  why it's down, what the keeper just did
 * - `since`:  when the keeper last started it;  `lastRequest`:  a worktree's last use
 * - `canStart`:  whether Start and Restart apply;  `own`:  one of the checkout's own servers (`KeeperServer`)
 */
export type KeptServer = {
  id: string
  repo: string
  worktree?: string
  name: string
  what: string
  checkout: string
  address?: string
  port?: number
  state: KeptServerState
  why?: string
  since?: string
  lastRequest?: string
  canStart: boolean
  /** the buttons it takes, when not every one (main's editor:  Start and Restart, never Stop) */
  actions?: ("start" | "stop" | "restart")[]
  own?: boolean
}

/**
 * `GET /api/servers`, the keeper's part:  every server, how often it looks, whether the page servers speak HTTPS
 * (`https`) and whether the person said hands off (`handsOff`).
 * - the epic hub's keeper adds its own facts beside them (`ServerKeeper`'s `moreAnswer`)
 */
export type KeptServersAnswer = {
  servers: KeptServer[]
  lookSeconds: number
  /** which keeper answers:  `spell`, or the epic hub's (`KeeperRecord.keeper`) */
  keeper?: string
  https?: HttpsStatus
  /** the person is working on the servers themselves:  the keeper leaves main's alone (`ServerKeeper.isHandsOff`) */
  handsOff?: boolean
  /**
   * each repo whose `spaces/` the kit's page server can serve, and which of its checkouts it serves now
   * (`ServerKeeper.editorSpaces()`):  each checkout's Show in the editor on the Servers page
   */
  editorSpaces?: EditorSpaces[]
}

/**
 * A repo whose projects live in its own `spaces/` folder (orgs of its own, `@acme/`), which the kit's page server
 * serves beside spell.spaces from ONE of its checkouts at a time (`SRV.switchSpaces()`, `~/.spell/more-spaces.json5`):
 * its main checkout, or an epic's worktree, to see work before it's merged.
 */
export type EditorSpaces = {
  repo: string
  /** the orgs its `spaces/` holds, `acme` */
  orgs: string[]
  /** each checkout with a `spaces/`:  main (no `worktree`) first, then its worktrees by name */
  checkouts: Array<{ worktree?: string; served: boolean }>
}

/**
 * Whether the page servers speak HTTPS (and HTTP/2), as the Servers tab draws it (`HttpsSwitch`, epic `epic-engine`
 * T164):  from the page server's certificate's state (`SRV.LocalCertificate`), ONE for every page server of this Mac
 * - `state`:  `on`;  `off` (no certificate, or no mkcert to make one);  `needs-trust` (made, not trusted);
 *   `out-of-date` (expired, or missing a name)
 * - `certificate`:  the certificate's own state, as `spell server certificate --check` says it
 * - `words`:  what it means, for the card's tooltip;  `address`:  where browsers open the pages, while it's on
 * - `canTurnOn`, `canTurnOff`:  which buttons apply;  `whyNot`:  why Turn on doesn't (no mkcert, or not a Mac)
 */
export type HttpsStatus = {
  state: HttpsState
  certificate: SRV.CertificateState
  words: string
  address?: string
  canTurnOn: boolean
  canTurnOff: boolean
  whyNot?: string
}

/** `HttpsStatus.state`. */
export type HttpsState = "on" | "off" | "needs-trust" | "out-of-date"

////////////////
// ## Its calls
////////////////

/** `POST /api/servers/editor-spaces`, `{ repo, worktree? }`:  serve that checkout's `spaces/`, then restart the page server. */
export const EDITOR_SPACES_API = "/api/servers/editor-spaces"

/** `POST /api/servers/https`'s body:  which way to turn it. */
export type HttpsTurn = { turn: "on" | "off" }

/** Where the Servers tab turns HTTPS on and off:  under `SRV.KEEPER_API`, before its `/:action`. */
export const HTTPS_API = "/api/servers/https"

/** Where the tab's hands-off switch asks:  the keeper leaves main's servers alone while it's on (T164). */
export const HANDS_OFF_API = "/api/servers/hands-off"

/** `POST /api/servers/hands-off`'s body. */
export type HandsOff = { on: boolean }

/** Where main's Restart all asks:  every main page server and its editor restarted (epic `epic-engine` T164). */
export const RESTART_ALL_API = "/api/servers/restart-all"

////////////////
// ## Its files
////////////////

/** The keeper's list, in the keeper's home (`KeeperList`). */
export const KEEPER_LIST_FILE = "keeper.json5"

/**
 * The keeper's holds, in the keeper's home:  `{ held, handsOff }`, the servers stopped by hand and the hands-off
 * switch;  the epic home's `server-keeper.json` until epic `editor` P48, carried over once.
 */
export const KEEPER_HOLDS_FILE = "server-keeper-holds.json"

/** `spell keeper start`'s background output, in the keeper's home. */
export const KEEPER_LOG_FILE = "keeper.log"

/** The own servers' logs' folder, in the keeper's home. */
export const KEEPER_SERVER_LOGS = "servers"

/** Spell's own keeper's name in its record (`KeeperRecord.keeper`);  the epic hub's says `epic hub`. */
export const SPELL_KEEPER = "spell"

/** Spell's own keeper's port:  `SPELL_KEEPER_PORT`, else 4949;  taken:  any free one (its record says which). */
export const DEFAULT_KEEPER_PORT = Number(process.env.SPELL_KEEPER_PORT) || 4949
