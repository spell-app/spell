import { rewriteEngineLinks } from "$/epics/server/engineLinks"

import type { Migration, MigrationContext } from "./migrations.types"

/****************
 * ### `EngineAssetRoutes`
 * The migration `engine-asset-routes` (epic `epic-eject` P7):
 * an epic page loads the engine's files from the epic server's routes, no longer from paths inside the repo's checkout.
 *
 * ```text
 * ../../packages/epics/tools/_assets/spell-doc.css            =>  /_epic/assets/spell-doc.css
 * ../../packages/epics/tools/_assets/spell-ui.js               =>  /_epic/assets/spell-ui.js
 * ../../packages/epics/components/__pack/epics.pack.js         =>  /_epic/pack/epics.pack.js
 * ```
 *
 * - Why:  the engine lives in spell-epic now, ONE copy for every repo,
 *   which the repos' content folders can't reach by a relative path.
 *   The epic server serves it at `/_epic/` for every repo (`EpicServer`).
 * - only what the page LOADS:  `<link href>`, `<script src>`, `<ui-components source>` (`rewriteEngineLinks()`);
 *   a link or a `title` naming a source file is left as written
 * - the old folders too:  `packages/docs/tools/_assets/`, `packages/epics/pack/`
 * - IDEMPOTENT:  a page loading from the routes already changes nothing
 * - Runs on command (`migrate`), never on every edit:
 *   a migrated page needs a server that serves `/_epic/` (the epic server, or spell-app's page server from epic
 *   `epic-eject` on), so it moves when Owen says, not when an edit happens to touch it
 ****************/
export class EngineAssetRoutes implements Migration {
  readonly name = "engine-asset-routes"
  readonly kind = "epic"
  readonly date = "2026-10-17"
  readonly everyEdit = false
  readonly description = "the page loads the engine's assets and pack from /_epic/, not from paths in the checkout"

  /** Point `document`'s engine links at the engine routes, IN PLACE;  did it change anything? */
  run(document: Document, context: MigrationContext): boolean {
    const changes = rewriteEngineLinks(document)
    for (const { from, to } of changes) context.notes?.push(`${this.name}:  ${from} -> ${to}`)
    return changes.length > 0
  }
}
