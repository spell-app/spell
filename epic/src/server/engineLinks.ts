/**
 * The ENGINE's files (its stylesheet, its scripts, the epics pack) behind the epic server's engine routes
 * (`/_epic/assets/...`, `/_epic/pack/...`;  epic `epic-eject` P7), read from the disk.
 * - The page rewrite the asset-route migrations ran (`rewriteEngineLinks()`) went with them (epic `repo-split` Q45).
 * - Plain `node` loads it (`check-spell.js`):
 *   node built-ins and the kit's `RealPath` only, relative imports by their `.ts` name, no `enum`.
 */
import { join, resolve } from "node:path"

import { pathInside } from "spell/server/RealPath"

import { ENGINE_ROUTES } from "./server.types.ts"

/**
 * The engine's file an engine route serves, from the engine's checkout `engine`:
 * `/_epic/assets/spell-ui.js` => `<engine>/src/tools/_assets/spell-ui.js`.
 * - `undefined` for another path
 * - for a page checked from `file://` (`check-spell.js`):  its engine routes answered from the disk
 * - never a file outside the route's folder:  `undefined` for a path with `..` out of it
 */
export function engineFileFor(path: string, engine: string): string | undefined {
  for (const route of Object.values(ENGINE_ROUTES)) {
    if (!path.startsWith(route.prefix)) continue
    const folder = join(engine, route.dir)
    const file = resolve(folder, decodeURIComponent(path.slice(route.prefix.length)))
    // never outside its folder (`..`)
    return pathInside(folder, file) === undefined ? undefined : file
  }
  return undefined
}
