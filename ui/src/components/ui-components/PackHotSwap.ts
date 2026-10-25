import { HotDefinitions } from "spell/element/HotDefinitions"

// Through the family's barrel, its lib entry:  so `hot.js` shares `ComponentPacks` with `ui-components.js`
import { ComponentPacks } from "spell-ui/components/ui-components"
import type { PackSwap } from "./UIComponents.types"

/****************
 * ### `PackHotSwap`
 * A page that swaps in a REBUILT component pack instead of reloading (epic `epic-engine` I116;  Owen, 2026-10-25,
 * on every epic page reloading at each merge:  "YUCK.  Can you do something about that?").
 * - The page server's live client says which scripts changed, and offers them (`spell-server:scripts`) before it
 *   reloads.  When every one is a pack on the page, this takes them:  no reload.
 * - Each pack's script runs again (`ComponentPacks.reload()`), and only the families whose sources changed are
 *   swapped into the live elements, which re-render in place (the kit's `HotDefinitions`);
 *   the rest keep their elements as they are.
 * - A change the platform can't take in place (a new tag, observed attributes ...):  ONE page reload, as before.
 * - What a re-rendered element keeps:  itself, its attributes and properties, its light DOM;
 *   what it loses:  state inside its component (an open popover).
 * - `install()` it as the page's bundle loads, BEFORE any pack defines its tags:  `HotDefinitions` records each
 *   definition as it happens.  The docs bundle (spell-epic's `spell-ui.entry.js`) and the site's (`SitePacks.ts`) do.
 * - Its own lib entry, `spell-ui/hot`:  only the pages that swap carry `HotDefinitions`.
 * - STATIC:  one per page.
 ****************/
export class PackHotSwap {
  /** Install it on this page:  `HotDefinitions`, and the live client's offer;  idempotent. */
  static install() {
    if (PackHotSwap.isInstalled) return
    PackHotSwap.isInstalled = true
    HotDefinitions.install()
    addEventListener(SCRIPTS_EVENT, PackHotSwap.onScripts as EventListener)
  }

  /** How `ComponentPacks.reload()` swaps a pack in:  `HotDefinitions`' keep predicate, then its update. */
  static readonly swap: PackSwap = {
    keep(keeps) {
      HotDefinitions.keeps = keeps
    },
    finish() {
      return !HotDefinitions.update().refused.length
    }
  }

  /**
   * The live client offers the scripts that changed (`spell-server:scripts`):  take them when every one is a pack on
   * the page, and swap each in;  else leave them, and the page reloads.
   */
  private static onScripts(event: CustomEvent<{ paths: string[] }>) {
    const paths = event.detail?.paths ?? []
    const sources = paths.map((path) => ComponentPacks.sourceOf(path))
    if (!paths.length || sources.some((source) => !source)) return
    event.preventDefault()
    Promise.all(sources.map((source) => ComponentPacks.reload(source!, PackHotSwap.swap))).then(
      (results) => {
        if (results.includes("reload")) location.reload()
      },
      (error: unknown) => {
        console.error("PackHotSwap:  couldn't swap the rebuilt pack in;  reloading", error)
        location.reload()
      }
    )
  }

  /** `install()` ran. */
  private static isInstalled = false
}

/** The live client's offer of the scripts that changed, before it reloads (the kit's `liveClient()`). */
const SCRIPTS_EVENT = "spell-server:scripts"
