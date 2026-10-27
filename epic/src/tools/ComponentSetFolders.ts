import { isAbsolute, join, relative, sep } from "node:path"

// The settings' own package entry (its `exports`, epic `repo-split` P6), not the page server's barrel:  that would load
// the whole server into every `epic` call, and plain `node` loads this file (`pages.js`), which finds only an explicit
// entry or a name with its `.ts`;  `settings.ts` is node built-ins only
import { componentSets, pageServerSettings } from "spell/server/page/settings"

import { EPIC_UI } from "spell/epic/server/server.types.ts"

/****************
 * ### `ComponentSetFolders`
 * Where each COMPONENT SET's pages are on disk, and the PAGE PATH the tools name each one by:  its address, as the
 * page servers serve it (`components/app/Chooser.html`), never its folder (spell-app's `app/docs/Chooser.html`).
 * - The sets:  the ones checkout `root`'s settings name (its root `package.json`'s `"pageServer"` `"componentSets"`,
 *   `componentSets()`), as the epic server's `componentSetMounts()` reads them:  spell-app's are Spell UI, Epic UI,
 *   App UI, Brand.
 *   - each in the folder the settings name, from checkout `root`:
 *     spell-app's `app/docs/`, or one in a repo beside it (`../ui/docs`)
 *   - except Epic UI:  the engine's own `src/docs/` (`epicUi`), wherever spell-epic is;  listed even when the
 *     settings don't name it (spell-epic's own checkout), since the epic server serves it for every repo
 * - Their pages take comments, in inbox files beside them (`commentsRoutes.ts`);
 *   `PageInboxes` finds them, and `pages.js` names them (`pagePath()`, `pageAt()`).
 * - Reads no files:  a set whose folder isn't there is listed all the same.
 ****************/
export class ComponentSetFolders {
  /** each set's page-path prefix (`components/app`) and folder, in the settings' order;  Epic UI last if they lack it */
  readonly folders: readonly ComponentSetFolder[]

  constructor({ root, epicUi }: { root: string; epicUi: string }) {
    const folders = componentSets(pageServerSettings(root)).map((set) => {
      const path = set.prefix.slice(1)
      return { name: set.name, path, dir: path === EPIC_UI.path ? epicUi : join(root, set.dir) }
    })
    const hasEpicUi = folders.some(({ path }) => path === EPIC_UI.path)
    this.folders = hasEpicUi ? folders : [...folders, { name: EPIC_UI.name, path: EPIC_UI.path, dir: epicUi }]
  }

  /**
   * The page path of `file`, a page (or folder, or inbox file) in a set's folder:  `components/app/Chooser.html`;
   * `undefined` outside every set's.
   * - `real`:  a set's folder with its links followed, for a `file` named with them followed (`pages.js` `realOf()`)
   */
  pageFor(file: string, real: (dir: string) => string = (dir) => dir): string | undefined {
    for (const { path, dir } of this.folders) {
      const inside = relative(real(dir), file)
      if (inside.startsWith("..") || isAbsolute(inside)) continue
      return [path, ...(inside ? inside.split(sep) : [])].join("/")
    }
  }

  /** The file page path `page` names in a set's folder (`pageFor()` turned round);  `undefined`:  not a set's. */
  fileFor(page: string): string | undefined {
    const folder = this.folders.find(({ path }) => page === path || page.startsWith(`${path}/`))
    return folder && join(folder.dir, page.slice(folder.path.length + 1))
  }
}

/** One component set's pages:  `{ name: "App UI", path: "components/app", dir: "<checkout>/app/docs" }`. */
export type ComponentSetFolder = {
  /** what prose calls it, `App UI` */
  name: string
  /** its pages' page paths start with it:  its address, without the leading `/` */
  path: string
  /** its pages' folder, absolute */
  dir: string
}
