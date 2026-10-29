import { after } from "spell/util/timing"
import { HotDefinitions } from "spell/element/HotDefinitions"
// Import directly:  the site barrel would bring the site header into every page that swaps
import { PagePatch } from "spell/server/site/PagePatch"

// Through the family's barrel, its lib entry:  so `hot.js` shares `ComponentPacks` with `ui-components.js`
import { ComponentPacks } from "spell/ui/components/ui-components"
import type { PackSwap, PackSwapResult } from "./UIComponents.types"

/****************
 * ### `PackHotSwap`
 * A page that swaps in a REBUILT component pack instead of reloading (epic `epic-engine` I116;  Owen, 2026-10-25,
 * on every epic page reloading at each merge:  "YUCK.  Can you do something about that?").
 * - The page server's live client says which scripts changed, and offers them (`spell-server:scripts-reloading`) before it
 *   reloads.  When every one is a pack on the page, this takes them:  no reload.
 * - Each pack's script runs again (`ComponentPacks.reload()`), and only the families whose sources changed are
 *   swapped into the live elements, which re-render in place (the kit's `HotDefinitions`);
 *   the rest keep their elements as they are.
 * - A change the platform can't take in place (a new tag, a new lifecycle callback ...):  ONE page reload, once the page
 *   is out of sight (the live client's `reload()`, epic `epic-engine` I171).
 *   - new observed attributes and a new version of a family's DOM class swap in (`HotDefinitions`)
 * - What a re-rendered element keeps:  itself, its attributes and properties, its light DOM;
 *   what it loses:  state inside its component (an open popover).
 * - Drawn as ONE short cross-fade (the kit's `PagePatch.crossFade()`, epic `epic-engine` I171):  the old frame stays
 *   up while the pack loads and its elements re-render, and what they load as they draw (a saga's name, a See Also
 *   list) comes in, `SETTLE_MS`
 *   - measured before:  one frame with those missing, the page's top jumping up a block and back
 * - `install()` it as the page's bundle loads, BEFORE any pack defines its tags:  `HotDefinitions` records each
 *   definition as it happens.  The docs bundle (spell-epic's `spell-ui.entry.js`) and the site's (`SitePacks.ts`) do.
 * - Its own lib entry, `spell/ui/hot`:  only the pages that swap carry `HotDefinitions`.
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
   * The live client offers the scripts that changed (`spell-server:scripts-reloading`):  take them when every one is a pack on
   * the page, and swap each in;  else leave them, and the page reloads.
   */
  private static onScripts(event: CustomEvent<{ paths: string[] }>) {
    const paths = event.detail?.paths ?? []
    const sources = paths.map((path) => ComponentPacks.sourceOf(path))
    if (!paths.length || sources.some((source) => !source)) return
    event.preventDefault()
    PagePatch.crossFade(() => PackHotSwap.swapIn(sources as string[])).then(
      (results) => {
        if (results.includes("reload")) PackHotSwap.reload()
      },
      (error: unknown) => {
        console.error("PackHotSwap:  couldn't swap the rebuilt pack in;  reloading", error)
        PackHotSwap.reload()
      }
    )
  }

  /** Swap each pack in;  once all swapped, wait `SETTLE_MS` for the re-rendered elements to draw what they load. */
  private static async swapIn(sources: string[]): Promise<PackSwapResult[]> {
    const results = await Promise.all(sources.map((source) => ComponentPacks.reload(source, PackHotSwap.swap)))
    if (!results.includes("reload")) await after(SETTLE_MS / 1000)
    return results
  }

  /**
   * Reload the page:  through the live client when it's there (`SPELL_SERVER.reload()`), else a plain reload.
   * - the live client's never reloads a page in view:  its "Updated:  reload" pill waits until it's out of sight
   *   (epic `epic-engine` I116, I171);  it keeps the scroll, and holds the new page behind the old one until it's
   *   ready (I164)
   * - measured before:  `location.reload()` here lost the scroll and the item open, through ~150ms of bare background
   */
  private static reload() {
    const server = (globalThis as { SPELL_SERVER?: { reload?: () => void } }).SPELL_SERVER
    if (server?.reload) server.reload()
    else location.reload()
  }

  /** `install()` ran. */
  private static isInstalled = false
}

/** How long the old frame stays up after a swap, in ms, for the re-rendered elements to draw what they load. */
const SETTLE_MS = 150

/** The live client's offer of the scripts that changed, before it reloads (the kit's `liveClient()`). */
const SCRIPTS_EVENT = "spell-server:scripts-reloading"
