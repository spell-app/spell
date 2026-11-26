import { readFileSync } from "node:fs"
import { join } from "node:path"

import { checkoutOf } from "./checkout.ts"
import { isProcessAlive } from "./Heartbeat.ts"

/**
 * A WORKTREE'S ADDRESS BY NAME, through main's page server (epic `editor` P49;  epic `epic-engine` T167):
 * `http://epic-engine.localhost:4747` for its page server, `http://epic-engine--app.localhost:4747` for its editor,
 * `https://` while main's page server speaks HTTPS.
 * - the ONE maker of those addresses:  main's `HostRoutes` (the names page), `mainServerUrl()` (`spell server url`,
 *   `epic pages link`, the side bar), and the epic tools' openers (`epic open`, `epic pages open`)
 * - main's own pages keep `127.0.0.1:4747`:  only a worktree has a name
 * - Its position:  node's own modules, `./checkout.ts` and `./Heartbeat.ts` only, so plain `node` loads it by its own name
 *   (`spell/server/hostNames`;  the docs tools' `pages.js`);  `PortBook` and the barrel re-export it
 */
export function namedAddress(
  worktree: string,
  { port, secure = false, editor = false }: { port: number; secure?: boolean; editor?: boolean }
): string {
  return `${secure ? "https" : "http"}://${hostNameOf(worktree)}${editor ? EDITOR_SUFFIX : ""}${LOCALHOST}:${port}`
}

/**
 * Checkout `path`'s address by name (`namedAddress()`), read off its MAIN checkout's page server record
 * (`.spell-server.json`:  its port, and `https` while it speaks HTTPS);  `undefined`:
 * - `path` is in no worktree (main's own pages keep their address)
 * - main's page server isn't running:  no record, or its process gone
 * - `secure`:  `false` for plain HTTP whatever main speaks (VS Code's side bar);  default:  as main speaks
 * - NEVER throws
 */
export function namedAddressOf(
  path: string,
  { editor = false, secure }: { editor?: boolean; secure?: boolean } = {}
): string | undefined {
  const checkout = checkoutOf(path)
  if (!checkout?.worktree) return undefined
  try {
    const record = JSON.parse(readFileSync(join(checkout.main, PAGE_SERVER_RECORD), "utf8")) as MainRecord
    if (!record.port || !record.pid || !isProcessAlive(record.pid)) return undefined
    return namedAddress(checkout.worktree, { port: record.port, secure: secure ?? !!record.https, editor })
  } catch {
    return undefined
  }
}

/** A worktree's name as a host's first part:  lower case, letters, digits and dashes (`My_Work` => `my-work`). */
export function hostNameOf(worktree: string): string {
  return worktree
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** What follows a worktree's name for its editor's host:  `editor--app.localhost`. */
export const EDITOR_SUFFIX = "--app"

/** What every worktree's host name ends in. */
export const LOCALHOST = ".localhost"

/** The page server's record at a checkout's root (`PidFile`'s, read here as plain JSON:  `PidFile` isn't node-safe). */
const PAGE_SERVER_RECORD = ".spell-server.json"

/** What `namedAddressOf()` reads of main's page server record. */
type MainRecord = { pid?: number; port?: number; https?: string }
