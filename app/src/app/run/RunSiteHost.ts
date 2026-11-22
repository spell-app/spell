import type { SiteHost } from "spell/parser/core/core.types"
import { SiteThemes } from "spell/app/app/runner/SiteThemes"

/****************
 * ### `RunSiteHost`
 * A running site's host whose address is the page's own:  the run page (`/run/<project>`), and a `<spell-viewer>`
 * given a `base` (the Spell UI site at `/components/ui/`, epic `editor` P43).
 * - `/run/@spell/examples/StarWarsSite/films/4` shows the site's `/films/4`;  the base itself, its `/`.
 * - A page the site goes to is a new address in the browser's history, so Back and Forward step through its pages.
 * - A link's `#section`, and one the page was opened or went back to, is landed on once it's drawn (`landOn()`),
 *   looked for in `root`:  where the site draws, a `<spell-viewer>`'s shadow root;  the document by default.
 * - Its theme as `<spell-viewer>`'s and the editor's Run give it (`SiteThemes`).
 * - The editor's own is `RunSite` (`spell/app/app/pages/RunSite`), which knows the editor's files and selection;
 *   this one knows only the address, so the run page loads no parser.
 ****************/
export class RunSiteHost implements SiteHost {
  /** The site's address on the page, still encoded, no `/` at its end:  `/run/@spell/examples/StarWarsSite`. */
  readonly base: string

  /** Where the site draws, where a link's section is looked for. */
  private readonly root: ParentNode

  constructor(base: string, root: ParentNode = document) {
    this.base = base.replace(/\/+$/, "")
    this.root = root
  }

  /** The site's address the page's URL names:  what follows the base, `/` for none. */
  address(): string {
    const { pathname } = location
    const rest = pathname.startsWith(this.base) ? pathname.slice(this.base.length) : ""
    return rest.length > 1 ? rest : "/"
  }

  /**
   * Go to `address`:  a new entry in the page's history, unless it's there already;  the new page starts at its top,
   * as a page loaded does (a link's `#section` is landed on after, `landOn()`).
   */
  go(address: string): void {
    const url = address === "/" ? this.base || "/" : `${this.base}${address}`
    if (url === location.pathname) return
    history.pushState(null, "", url)
    scrollTo(0, 0)
  }

  /**
   * Show the page's address again on Back and Forward, and land on its `#section`, if it names one.
   * - Each run listens again:  only the last one's `showAddress` is called, through ONE listener on the window.
   * - Called as the site starts:  so a `#section` the page was opened at is landed on too.
   */
  listen(showAddress: (address: string) => void): void {
    if (!this.showAddress)
      addEventListener("popstate", () => {
        this.showAddress?.(this.address())
        this.landOnHash()
      })
    this.showAddress = showAddress
    this.landOnHash()
  }

  /** What the last run's `listen()` asked us to call. */
  private showAddress?: (address: string) => void

  /**
   * Scroll to section `id` of the page shown, once it's drawn, as the browser's own jump to a `#section` does
   * (`scrollIntoView()`:  the section's `scroll-margin-top` keeps it below a bar stuck at the top);
   * the page's address then names it too, so it can be shared or reloaded.
   * - Waits for the section:  a page draws a moment after it's shown;  lands once more when late layout has moved it,
   *   unless the reader has scrolled since.
   * - NOT Spell UI's `HashLanding`, as the editor's Run lands:  `<spell-viewer>`'s bundle takes Spell UI only from
   *   the page's shared files (`sharedSolid()`), and they don't hold it.
   * - NEVER throws:  a section that never comes, or one the page doesn't have, is left alone.
   */
  landOn = (id: string): void => {
    let tries = 0
    const look = () => {
      const section = elementWithId(this.root, id)
      if (!section) {
        if (++tries < SECTION_TRIES) setTimeout(look, SECTION_PAUSE)
        return
      }
      section.scrollIntoView({ block: "start" })
      const landedAt = scrollY
      setTimeout(() => scrollY === landedAt && section.scrollIntoView({ block: "start" }), SETTLE_PAUSE)
      const { pathname, search, hash } = location
      if (hash !== `#${id}`) history.replaceState(null, "", `${pathname}${search}#${id}`)
    }
    look()
  }

  /** Land on the section the page's address names, if any. */
  private landOnHash(): void {
    const section = location.hash.slice(1)
    if (section) this.landOn(safelyDecoded(section))
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

/**
 * The element with `id` in `root`, looking inside every shadow root too:  a page's sections are drawn in its views'
 * own shadow roots.
 */
function elementWithId(root: ParentNode, id: string): Element | undefined {
  const found = root.querySelector(`[id="${CSS.escape(id)}"]`)
  if (found) return found
  for (const element of root.querySelectorAll("*")) {
    const inside = element.shadowRoot && elementWithId(element.shadowRoot, id)
    if (inside) return inside
  }
  return undefined
}

/** `text` decoded:  as it is when it won't decode. */
function safelyDecoded(text: string): string {
  try {
    return decodeURIComponent(text)
  } catch {
    return text
  }
}
