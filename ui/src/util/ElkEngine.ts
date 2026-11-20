// Import directly:  this file sits below `core`, so it never imports the `spell/ui/util` barrel's entry
import { once } from "spell/util/decorators"

import type { ELK } from "elkjs/lib/elk-api"

/****************
 * ### `ElkEngine`
 * ELK, the layout engine, loaded the first time anything asks for it, then kept:  ONE copy a page.
 * - The ONLY door to ELK in Spell UI.  NEVER write a second `import("elkjs")` anywhere:
 *   - `<ui-mermaid-diagram>`'s Mermaid lays out flowcharts, state, class and ER diagrams with it,
 *     and `<ui-diagram>` will (epic `editor` T115)
 *   - Mermaid imports this same file (`elkjs/lib/elk.bundled.js`) in a lazy file of its own:  Mermaid takes no ELK
 *     handed to it, so the sharing is the bundler's.  Both imports resolve to the one file in the install
 *     (pinned in the kit's `resolutions`), which becomes ONE lazy chunk, fetched once a page.
 *   - Another import of another of elkjs's files would make a second chunk:  about 1.6 MB, 470 KB zipped.
 * - A page with nothing laid out by ELK never loads it.
 * - Taken by file (`spell/ui/util/ElkEngine`), in no barrel:  in `core` every page would carry its loader.
 * - Static:  page-wide, as the chunk is.
 ****************/
export class ElkEngine {
  /**
   * Imports elkjs's bundled build;  replaceable, e.g. by a bundle that can't keep `import()`s.
   * - Read once, on first use.
   */
  static loader: () => Promise<{ default: new () => ELK }> = () => import("elkjs/lib/elk.bundled.js")

  /**
   * ELK, ready to lay out:  loaded on first use, the import started once a page.
   * - Rejects when the chunk won't load;  a later call doesn't try again (`@once`).
   */
  @once static load(): Promise<ELK> {
    return ElkEngine.loader().then((module) => new module.default())
  }
}
