/**
 * A page's links to the ENGINE's files (its stylesheet, its scripts, the epics pack),
 * rewritten to the epic server's engine routes (`/_epic/assets/...`, `/_epic/pack/...`;  epic `epic-eject` P7).
 * - What the asset-route migrations run:
 *   the epic page's step (`EngineAssetRoutes`) and the other kinds' (`migrate.js` `STEPS`, `engine-asset-routes`).
 * - Plain `node` loads it (`migrate.js`, `check-spell.js`):
 *   node built-ins only, relative imports by their `.ts` name, no alias, no `enum`.
 */
import { join, relative, resolve } from "node:path"

import { ENGINE_ROUTES, engineUrlFor } from "./server.types.ts"

/**
 * The elements that LOAD an engine file, and the attribute naming it:
 * a stylesheet or preload (`<link href>`), a script (`<script src>`), a component pack (`<ui-components source>`).
 * - never a plain link (`<a href>`) or a `title`:  those name a source file for a reader, not something the page loads
 */
export const ENGINE_LINKS = [
  { selector: "link[href]", attribute: "href" },
  { selector: "script[src]", attribute: "src" },
  { selector: "ui-components[source]", attribute: "source" }
] as const

/** One link rewritten:  what it said, and what it says now. */
export type EngineLinkChange = { from: string; to: string }

/**
 * Rewrite `document`'s links to the engine's files (`ENGINE_LINKS`), IN PLACE:
 * from checkout paths (`../../packages/epics/tools/_assets/spell-ui.js`)
 * to engine routes (`/_epic/assets/spell-ui.js`).
 * - returns each change, none when every link is a route already (idempotent)
 */
export function rewriteEngineLinks(document: Document): EngineLinkChange[] {
  const changes: EngineLinkChange[] = []
  for (const { selector, attribute } of ENGINE_LINKS) {
    for (const element of document.querySelectorAll(selector)) {
      const from = element.getAttribute(attribute)!
      const to = engineUrlFor(from)
      if (!to) continue
      element.setAttribute(attribute, to)
      changes.push({ from, to })
    }
  }
  return changes
}

/** A cheap test on a page's TEXT:  does it link an engine file by a checkout path, so `rewriteEngineLinks()` would change it? */
export function linksEngineByPath(html: string): boolean {
  return LEGACY_LINK.test(html)
}

/**
 * The engine's file an engine route serves, from the engine's checkout `engine`:
 * `/_epic/assets/spell-ui.js` => `<engine>/packages/epics/tools/_assets/spell-ui.js`.
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
    return relative(folder, file).startsWith("..") ? undefined : file
  }
  return undefined
}

/** A loading attribute naming an engine file by a checkout path, from any depth (`engineUrlFor()`'s folders). */
const LEGACY_LINK =
  /\b(?:href|src|source)="(?:\.\.\/)*\/?packages\/(?:epics\/(?:tools\/_assets|components\/__pack|pack)|docs\/(?:tools\/)?_assets)\//
