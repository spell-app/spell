import { UI } from "spell/ui/core"
// A leaf, not the barrel:  the barrel defines `<ui-example>`, which `<ui-root>` does on first use
import { ExampleSource } from "spell/ui/components/ui-example/ExampleSource"
import type { PageChange } from "spell/server/liveClient"
import { PagePatch, serverConfig } from "spell/server/site"
import { SiteSections } from "./SiteSections"
import { SiteShell } from "./SiteShell"
import { PAGE_MAIN } from "./site.types"

/****************
 * ### `SitePatch`
 * An edit to the shown page's file shows IN PLACE, with no reload and no flash (epic `epic-engine` P40):
 * only what changed redraws, text edited where it stands.
 * - The page server sends the new page with its change;  the live client offers it (`spell-server:reloading`),
 *   this takes it, and the kit's patcher (`PagePatch`) changes only what differs in `main`,
 *   from the page's source as it LOADED (`shown()`)
 *   - scroll, folds, the tab shown, focus and typed text stay
 * - The site's rules, over the shared ones:
 *   - `<ui-example>` and `<ui-docs-api>` are replaced whole when they change:
 *     an example draws its live demo and its code from its markup once (`ExampleSource.keep()`, on the copy)
 *   - what the site adds in `main` (`data-spell-added`:  the page's subtitle, the comments' threads) is stepped around
 *   - a copy brought in gets absolute URLs (`SiteShell.absolutize()`), as the router's pages do
 * - then the sections are shown again (`SiteSections.show()`:  sticky offsets, folds), and the router's cache of the
 *   page dropped, so coming back to it shows the new one
 * - a full reload instead (the client's `reload()`) when it can't be patched:  `PagePatch.page()` says when
 * - its own save (`own`) only moves the baseline:  the page shows it already
 ****************/
export class SitePatch {
  /** The patcher, with the site's rules. */
  private readonly patcher = new PagePatch({
    skip: "[data-spell-added]",
    replacedWhole: "ui-example, ui-docs-api, ui-select, ui-dropdown, ui-accordion",
    prepare: (copy) => {
      SiteShell.absolutize(copy, location.href)
      ExampleSource.keep(copy)
      if (copy.localName === EXAMPLE_TAG) keepExample(copy)
    }
  })

  /** The shown page's source as it loaded:  `null` when it can't be trusted (it changed before it was read). */
  private base: Promise<string | null>

  /** One update at a time, in order. */
  private queue: Promise<void> = Promise.resolve()

  /** The page's `main`, as the router shows it. */
  private readonly main: () => HTMLElement | undefined

  constructor({ main }: SitePatchProps) {
    this.main = main
    const server = serverConfig()
    this.base = server?.readPage
      ? server.readPage().then(
          ({ html, etag }) => (etag && etag === server.etag ? html : null),
          () => null
        )
      : Promise.resolve(null)
  }

  /** Take the page's own changes from the live client.  SIDE EFFECT:  a window listener, for good. */
  start(): void {
    addEventListener("spell-server:reloading", (event) => {
      // the detail as sent, checked:  a page may hear the event from somewhere else
      const { html, reload, own } = ((event as CustomEvent).detail ?? {}) as Partial<PageChange>
      if (typeof html !== "string" || typeof reload !== "function") return
      event.preventDefault()
      this.queue = this.queue.then(() => this.update(html, reload, own)).catch(() => reload())
    })
  }

  /** The router showed another page:  `html`, its source as fetched, is the new baseline. */
  shown(html: string): void {
    this.base = Promise.resolve(html)
  }

  /** Patch `main` to page `html`;  reload when it can't be patched.  `own`:  the page shows it already. */
  private async update(html: string, reload: () => void, own?: boolean): Promise<void> {
    const before = await this.base
    const main = this.main()
    this.base = Promise.resolve(html)
    // the router's copy of the page, so coming back to it shows the new one
    const page = location.origin + location.pathname + location.search
    void UI.load()
      .then((ui) => ui.sources.forget(page))
      .catch(() => undefined)
    if (own) return
    const patched =
      before !== null && main
        ? this.patcher.page({
            before: parse(before),
            after: parse(html),
            live: main,
            mainOf: (root) => root.querySelector(PAGE_MAIN),
            top: () => SiteSections.instance.stuckBottom
          })
        : null
    if (!patched) return reload()
    SiteSections.instance.show(main!, { isFirst: false })
  }
}

/** What a `SitePatch` needs:  the page's `main` as shown. */
export type SitePatchProps = {
  /** the page's `main`, in the layout */
  main: () => HTMLElement | undefined
}

/** The example tag:  a copy that IS an example is kept by itself (`ExampleSource.keep()` looks inside). */
const EXAMPLE_TAG = "ui-example"

/**
 * Keep `example`'s authored markup, as `ExampleSource.keep()` does for the examples inside a root:
 * `example`, a copy not yet in the page, goes in a holder for it, and out again.
 */
function keepExample(example: Element): void {
  const holder = document.createElement("div")
  holder.append(example)
  ExampleSource.keep(holder)
  example.remove()
}

/** Parse a page's HTML into an inert document. */
function parse(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html")
}
