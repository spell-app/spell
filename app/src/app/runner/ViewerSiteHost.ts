import type { SiteHost } from "spell/parser/core/core.types"
import { SiteThemes } from "./SiteThemes"

/****************
 * ### `ViewerSiteHost`
 * A running site's host in a page's `<spell-viewer>` (`SpellAppRunner`):  its theme, and, given a `base`, the page's
 * address.
 * - With no `base`, the site keeps its address itself, as with no host:  it starts at `/`, and a page going to another
 *   changes nothing outside it.  The page's own URL stays the page's.
 * - With a `base` (`<spell-viewer base="/components/ui">`, epic `editor` P43), the site's address IS the page's,
 *   after it, as the editor's Run keeps it (`RunSite`):
 *   - `/components/ui/button/api` shows the site's `/button/api`, so a link to one page, and one section, opens there
 *   - a page going to another changes the URL, so the browser's back and forward work, and hear the site
 *   - a link's `#section` lands on it once it's drawn, inside the viewer's shadow root (`root`)
 *   - the page server answers every address under the base with the same page (a component set's `sitePage`)
 * - Its theme, `galaxy guide is a site with theme "harbor"`, as the editor's Run gives it (`SiteThemes`):  the
 *   project's own, beside its Spell, else one of Spell UI's.
 * - One per run:  a run that keeps its things keeps its host too, so a restart stays on the page it showed.
 *   A new run's host `stop()`s the last one's.
 ****************/
export class ViewerSiteHost implements SiteHost {
  /** The page's address its site's go under, `/components/ui`, with no `/` at its end;  none:  the site's own. */
  readonly base?: string

  /** Where the site draws:  the viewer's shadow root, where a link's section is looked for. */
  private readonly root?: ParentNode

  /** The address the site last went to, with no `base`:  `/` to start. */
  private here = "/"

  /** Stops hearing the browser's back and forward (`listen()`). */
  private listening?: AbortController

  constructor({ base, root }: { base?: string; root?: ParentNode } = {}) {
    this.base = base?.replace(/\/+$/, "") || undefined
    this.root = root
  }

  /** The address to show now:  the page's, after `base`;  else where the site last went. */
  address(): string {
    const { base } = this
    if (!base) return this.here
    const { pathname } = globalThis.location
    return pathname.startsWith(`${base}/`) ? pathname.slice(base.length) : "/"
  }

  /** Go to `address`:  the page's URL follows, a step the back button takes back;  with no `base`, only remembered. */
  go(address: string): void {
    this.here = address
    const { base } = this
    if (!base || address === this.address()) return
    globalThis.history.pushState(null, "", `${base}${address}`)
  }

  /**
   * Call `showAddress` when the browser's back or forward changes the page's address:  only with a `base`.
   * - Called as the site starts:  so a `#section` the page was opened at, or went back to, is landed on too.
   */
  listen(showAddress: (address: string) => void): void {
    if (!this.base) return
    this.listening?.abort()
    this.listening = new AbortController()
    const landOnHash = () => {
      const section = globalThis.location.hash.slice(1)
      if (section) this.landOn(safelyDecoded(section))
    }
    globalThis.addEventListener(
      "popstate",
      () => {
        showAddress(this.address())
        landOnHash()
      },
      { signal: this.listening.signal }
    )
    landOnHash()
  }

  /** Stop hearing the browser:  a new run's host takes over. */
  stop(): void {
    this.listening?.abort()
  }

  /**
   * Scroll to section `id` of the page shown, once it's drawn, as the browser's own jump to a `#section` does
   * (`scrollIntoView()`:  the section's `scroll-margin-top` keeps it below a bar stuck at the top).
   * - Waits for the section:  a page draws a moment after it's shown.
   * - NOT Spell UI's `HashLanding`, as the editor's Run lands:  this runs in `<spell-viewer>`'s bundle, which takes
   *   Spell UI only from the page's shared files (`sharedSolid()`), and they don't hold it.
   * - NEVER throws:  a section that never comes, or one the page doesn't have, is left alone.
   */
  landOn = (id: string): void => {
    const { root } = this
    if (!root) return
    const found = () => elementWithId(root, id)
    let tries = 0
    const look = () => {
      const section = found()
      if (!section) {
        if (++tries < SECTION_TRIES) setTimeout(look, SECTION_PAUSE)
        return
      }
      section.scrollIntoView({ block: "start" })
      // once more when late layout (pictures, examples drawing) has moved it, unless the reader has scrolled since
      const landedAt = globalThis.scrollY
      setTimeout(() => globalThis.scrollY === landedAt && section.scrollIntoView({ block: "start" }), SETTLE_PAUSE)
      // the page's address names the section too, so it can be shared or reloaded
      const { pathname, search, hash } = globalThis.location
      if (this.base && hash !== `#${id}`) globalThis.history.replaceState(null, "", `${pathname}${search}#${id}`)
    }
    look()
  }

  /** Theme `name`'s look for the site alone (`SiteThemes.tokens()`). */
  themeTokens(name: string, projectFolder?: string): Promise<string> {
    return SiteThemes.tokens(name, projectFolder)
  }
}

/** How many times a link's section is looked for, `SECTION_PAUSE` apart:  five seconds, as the editor's Run. */
const SECTION_TRIES = 50

/** How long between looks for a link's section, in milliseconds. */
const SECTION_PAUSE = 100

/** How long after landing on a section it lands once more, in milliseconds:  as Spell UI's `HashLanding` settles. */
const SETTLE_PAUSE = 1500

/** `text` decoded:  as it is when it won't decode. */
function safelyDecoded(text: string): string {
  try {
    return decodeURIComponent(text)
  } catch {
    return text
  }
}

/**
 * The element with `id` in `root`, looking inside every shadow root too:  a page's sections are drawn in its views'
 * own shadow roots.
 */
function elementWithId(root: ParentNode, id: string): Element | undefined {
  const selector = `[id="${CSS.escape(id)}"]`
  const found = root.querySelector(selector)
  if (found) return found
  for (const element of root.querySelectorAll("*")) {
    const inside = element.shadowRoot && elementWithId(element.shadowRoot, id)
    if (inside) return inside
  }
  return undefined
}
