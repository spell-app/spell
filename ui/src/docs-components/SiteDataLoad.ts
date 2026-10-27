import { isServer } from "@solidjs/web"

import { E } from "spell-ui/core"
import type { SiteDataFile } from "./docs-components.types"
import { SiteData } from "./SiteData"

/****************
 * ### `SiteDataLoad`
 * The docs site's data (`SiteData.load()`) as a docs element holds it:  the data once it's in, why it didn't come,
 * and whether it's on its way (epic `coherence` P23).
 * - A field of the element, `readonly data = new SiteDataLoad()`, as `F.HighlightedOption` is:
 *   reactive (`@E.state`), so the element's JSX, getters, `@E.derived` and effects follow it as its own members.
 * - Starts loading as it's made, in a browser;  in a server render nothing loads, and it's never loading.
 * - Its users:  `<ui-docs-api>`, `<ui-docs-tokens>`, `<ui-docs-nav>`.
 *   Not `<ui-docs-search>`:  it loads on first use, and the search's own file beside the data.
 ****************/
export class SiteDataLoad {
  /** The site's data, once it's in. */
  @E.state accessor value: SiteDataFile | undefined = undefined

  /** Why the data didn't come, if it didn't:  always an `Error`. */
  @E.state accessor error: Error | undefined = undefined

  /** Settles once `value` or `error` is set;  at once in a server render. */
  readonly loaded: Promise<void> = isServer ? Promise.resolve() : this.load()

  /** On its way:  neither in nor failed (never in a server render:  nothing loads). */
  get isLoading(): boolean {
    return !isServer && !this.value && !this.error
  }

  /** Fetch the data (once per page, `SiteData`) into `value`, or why it failed into `error`.  NEVER rejects. */
  private load(): Promise<void> {
    return SiteData.load().then(
      (data) => {
        this.value = data
      },
      (error: unknown) => {
        this.error = error instanceof Error ? error : new Error(String(error))
      }
    )
  }
}
