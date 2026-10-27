// Import directly:  in `core`'s util barrel it cost every page 1.9 kB
import { PrefStore } from "spell/util/persist/PrefStore"
import { TOC_ALL_FOLDS, TOC_PREFS, type TocAllFolds, type TocFolds } from "./UIToc.types"

/****************
 * ### `TocPreferences`
 * The viewer's folds in a table of contents, kept in this browser (`localStorage`, through `PrefStore`).
 * - Expand all / collapse all (`all()`):  ONE for every page, until the viewer presses the other
 *   (Owen, 2026-10-25:  "keep if I've said 'expand all' -- I probably want that on other pages").
 * - A section folded or opened by hand (`foldsFor()`):  per page, by its path.
 * - Where storage is blocked (a private window), kept for this page only;  NEVER throws.
 * - Static only:  the storage is one per page, and holds no state of its own.
 ****************/
export class TocPreferences {
  /** What the toggle last did, on any page;  `undefined` until it's pressed (or a value it can't read). */
  static all(): TocAllFolds | undefined {
    const value = TocPreferences.store.get(TOC_PREFS.all)
    return TOC_ALL_FOLDS.find((each) => each === value)
  }

  /** Remember what the toggle did, for every page. */
  static setAll(all: TocAllFolds): void {
    TocPreferences.store.set(TOC_PREFS.all, all)
  }

  /** The viewer's own folds on the page at `path`;  `{}` when none, or a value it can't read. */
  static foldsFor(path: string): TocFolds {
    const value = TocPreferences.store.get(TOC_PREFS.folds + path)
    if (!value || typeof value !== "object" || Array.isArray(value)) return {}
    return Object.fromEntries(Object.entries(value).filter(([, open]) => typeof open === "boolean")) as TocFolds
  }

  /** Keep the viewer's folds on the page at `path`;  none forgets them. */
  static setFoldsFor(path: string, folds: TocFolds): void {
    TocPreferences.store.set(TOC_PREFS.folds + path, Object.keys(folds).length ? folds : undefined)
  }

  /** The store:  made on first use, so a server render never touches storage. */
  private static get store(): PrefStore {
    return (TocPreferences.made ??= new PrefStore(TOC_PREFS.store))
  }
  private static made?: PrefStore
}
