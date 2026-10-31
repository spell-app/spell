// Import directly:  the persist barrel would bring the database and server places too
import { PrefStore } from "spell/util/persist/PrefStore"

import { FOCUS_KEY, FOCUS_KINDS, type FocusKind, type FocusPlaceData } from "./EpicFocus.types"

/****************
 * ### `FocusPlace`
 * Where Focus mode was left on a page, kept in this browser across reloads (`spell-focus:<path>`), as the page keeps
 * its folds:  open or not, the tab, the item, each tab's chips.
 * - Through the kit's `PrefStore` (`getAt()` / `setAt()`):  a browser without storage keeps nothing, and nothing throws.
 * - Plain data, no DOM, no Solid:  `<epic-focus>` reads and writes it, `<epic-page>` reads `open` as it connects.
 ****************/
export class FocusPlace {
  /** The place kept for page `path` (`location.pathname`);  `{}` for none, or for anything that isn't one. */
  static read(path: string): FocusPlaceData {
    const kept = PrefStore.getAt(FOCUS_KEY + path)
    if (!kept || typeof kept !== "object") return {}
    const { open, tab, item, shown } = kept as Record<string, unknown>
    return {
      open: open === true || undefined,
      tab: FocusPlace.isKind(tab) ? tab : undefined,
      item: typeof item === "string" ? item : undefined,
      shown: shown && typeof shown === "object" ? FocusPlace.shownOf(shown as Record<string, unknown>) : undefined
    }
  }

  /** Keep `changes` over what page `path` kept.  NEVER throws. */
  static write(path: string, changes: FocusPlaceData): void {
    PrefStore.setAt(FOCUS_KEY + path, { ...FocusPlace.read(path), ...changes })
  }

  /** Is `value` one of the tabs' kinds? */
  static isKind(value: unknown): value is FocusKind {
    return FOCUS_KINDS.some((look) => look.kind === value)
  }

  /** The kept chips, only lists of states under known tabs. */
  private static shownOf(kept: Record<string, unknown>): FocusPlaceData["shown"] {
    const shown: Partial<Record<FocusKind, string[]>> = {}
    for (const [kind, states] of Object.entries(kept)) {
      if (FocusPlace.isKind(kind) && Array.isArray(states)) shown[kind] = states.map(String)
    }
    return shown
  }
}
