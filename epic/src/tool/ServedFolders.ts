import { realpathSync } from "node:fs"
import { join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { EpicConfig } from "$/epics/config/EpicConfig"
import { COMPONENT_SETS } from "$/server/page/page.types"

/****************
 * ### `ServedFolders`
 * The folders a checkout's page server serves at ANOTHER address:  what a linker under that checkout is told
 * (`AS.Linker`'s `served`), so a link to the address checks as the folder it serves.
 *
 * ```ts
 * ServedFolders.under("/Users/owen/www/spell-app/spell-app")
 * // => { "components/ui": "packages/ui/docs", "components/epics": "spell-epic/src/docs", ...,
 * //      templates: "spell-epic/templates" }
 * ```
 *
 * - the component sets' (`COMPONENT_SETS` in `$/server/page`):  `components/epics` is `spell-epic/src/docs`
 * - the engine's templates, at `templates/` (epic `epic-eject` T11), through the checkout's `spell-epic` link when it
 *   has one to this engine's repo;  nothing when they ARE the checkout's (spell-epic's own)
 * - Who asks:  the docs tools' linker (`doc-links.js`) and the `epic` tool's (`PlanDocFiles.linker`:  `epic check`'s
 *   link check, and every write), so both read `../../components/epics/` and `../../templates/` alike
 *   (epic `epic-engine` I27:  `epic check` called them missing)
 * - STATIC:  reads the disk (the link), keeps nothing.
 ****************/
export class ServedFolders {
  /** spell-epic's root:  this engine's checkout (`src/tool/` is two folders down). */
  static readonly ENGINE = resolve(fileURLToPath(import.meta.url), "..", "..", "..")

  /**
   * The folders served at another address under checkout `root`, by their address folder, both relative to `root`.
   * - `engine`:  the engine's checkout, whose `templates/` are served (default `ENGINE`)
   */
  static under(root: string, engine = ServedFolders.ENGINE): Record<string, string> {
    const templates = ServedFolders.templatesDir(root, engine)
    return {
      ...Object.fromEntries(COMPONENT_SETS.map((set) => [set.prefix.slice(1), set.dir])),
      ...(templates !== "templates" && { templates })
    }
  }

  /**
   * The engine's templates from checkout `root`:  through its `spell-epic` link when it has one to the engine's repo
   * (spell-app:  `spell-epic/templates`, inside the repo, so its links check as the repo's own);  else as they are
   * (`templates` in spell-epic itself).
   */
  private static templatesDir(root: string, engine: string): string {
    const link = join(root, "spell-epic")
    try {
      // any checkout of it:  `node bin/epic` run from a worktree of spell-epic, its link the main checkout
      if (EpicConfig.mainOf(realpathSync(link)) === EpicConfig.mainOf(realpathSync(engine)))
        return relative(root, join(link, "templates"))
    } catch {
      // no link
    }
    return relative(root, join(engine, "templates"))
  }
}
