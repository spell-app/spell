import { LoadOnce } from "spell/util/LoadOnce"
import type { SiteHost } from "spell/parser/core/core.types"
import type { LoadedRuntime } from "./loadRuntime"

/****************
 * ### `LazyPages`
 * A built site's pages, each loaded the first time it's shown (epic `solid-2-final` P13, TLDR 45):
 * the page server cuts the program into its main chunk and a chunk per page alone in its file (`SP.PageChunks`),
 * and this runs each page's chunk on the running program as the site is about to show it.
 * - The main chunk names them, on a line of its own (`// spell-lazy-pages: Grammar,Theming`):  `forProgram()`.
 *   With none (a host that sends the whole file, the static build), the program runs whole, as always.
 * - The site asks before it shows a page (`SiteHost.pageNeeded()`):  `hostFor()` answers for the host, once the page's
 *   chunk has run;  meanwhile the site shows its waiting state.
 * - Fetched EARLY, never run early (P6's `LoadOnce`):
 *   - on hover, focus or press of a link to the page (`LoadOnce.ahead()`)
 *   - the site's navigation's first pages at idle (`LoadOnce.atIdle()`), one at a time
 *   - never with Save-Data on:  then each loads as it's shown
 *   - only code:  a page's reads start when it's shown
 * - The editor's own Run stays ONE module:  it compiles its program itself, with every class.
 * - Its position:  the runner's, in every bundle that runs a built program (`SpellAppRunner`);  no Solid, and nothing of
 *   `spell/parser/core` but its types:  each chunk runs on the runtime copy's own (`runPageChunk()`).
 ****************/
export class LazyPages {
  /** The pages' class names, each with a chunk of its own. */
  readonly names: ReadonlySet<string>

  /** The program's address:  `/spaces/@spell/guides/SpellUI/SpellUI.spell.js?pages=lazy`. */
  private readonly compiledUrl: string

  /** The runtime copy the program runs on. */
  private readonly copy: LoadedRuntime

  /** Each page's chunk run on this program, by its class:  once. */
  private readonly ran = new Map<string, Promise<void>>()

  /** The links watched for a hover:  each once. */
  private readonly watched = new WeakSet<Element>()

  constructor({ names, compiledUrl, copy }: LazyPagesProps) {
    this.names = new Set(names)
    this.compiledUrl = compiledUrl
    this.copy = copy
  }

  /**
   * The lazy pages of `text`, a program as `compiledUrl` answered it, on `copy`:  `undefined` for a program that came
   * whole.
   */
  static forProgram(text: string, compiledUrl: string, copy: LoadedRuntime): LazyPages | undefined {
    const names = LAZY_PAGES_LINE.exec(text)?.[1]?.split(",").filter(Boolean)
    return names?.length ? new LazyPages({ names, compiledUrl, copy }) : undefined
  }

  /**
   * `host`, answering for the site that a lazy page can show once its chunk has run (`pageNeeded()`);
   * everything else `host`'s own.
   */
  hostFor(host: SiteHost): SiteHost {
    const lazy = Object.create(host) as SiteHost
    lazy.pageNeeded = (className) => {
      const own = () => host.pageNeeded?.(className)
      if (!this.names.has(className)) return own()
      return this.run(className).then(async () => (await own()) ?? true)
    }
    return lazy
  }

  /**
   * Fetch the chunk of page `className` ahead of its showing, if it has one:  its code only, nothing run.
   * - NEVER throws:  a chunk that won't come is fetched again when it's shown.
   */
  fetchAhead(className: string): void {
    if (this.names.has(className)) this.text(className).catch(() => undefined)
  }

  /**
   * Fetch ahead each page a link in `root` goes to, once the pointer rests on it, it takes focus or it's pressed;
   * and the site's navigation's first pages at idle.  Returns what stops it.
   * - A link is anything with a site address to go to:  `<a href>`, `<ui-button link>`, inside shadow roots too.
   */
  fetchAheadIn(root: Element): () => void {
    const onOver = (event: Event) => {
      const link = event
        .composedPath()
        .find(
          (node): node is Element => node instanceof Element && (node.hasAttribute("link") || node.hasAttribute("href"))
        )
      if (!link || this.watched.has(link)) return
      this.watched.add(link)
      const href = link.getAttribute("link") ?? link.getAttribute("href") ?? ""
      LoadOnce.ahead(link, () => this.fetchAheadFor(href))
      // a focus or a press:  `ahead()` listens from now on, and this one already happened
      if (event.type !== "pointerover") this.fetchAheadFor(href)
    }
    root.addEventListener("pointerover", onOver)
    root.addEventListener("focusin", onOver)
    const stopIdle = this.navigationAtIdle()
    return () => {
      root.removeEventListener("pointerover", onOver)
      root.removeEventListener("focusin", onOver)
      stopIdle()
    }
  }

  /** The class of the page the running site shows at `href`, one of its own addresses;  `undefined` for none. */
  private pageAt(href: string): string | undefined {
    if (!href.startsWith("/") || href.startsWith("//")) return undefined
    const address = href.split(/[?#]/)[0] || "/"
    return this.site?.pageFor(address)?.entry.page
  }

  /** Fetch ahead the page at `href`, if it's a lazy one. */
  private fetchAheadFor(href: string): void {
    const page = this.pageAt(href)
    if (page) this.fetchAhead(page)
  }

  /**
   * Fetch ahead the site's navigation's first pages, `AHEAD_AT_IDLE` of them, each at an idle moment of its own.
   * - Skipped under Save-Data (`LoadOnce.atIdle()`).
   */
  private navigationAtIdle(): () => void {
    let stop = () => {}
    const pages = (this.site?.navPages() ?? [])
      .map(({ href }) => (href ? this.pageAt(href) : undefined))
      .filter((page): page is string => !!page && this.names.has(page))
      .slice(0, AHEAD_AT_IDLE)
    const next = () => {
      const page = pages.shift()
      if (!page) return
      this.text(page)
        .catch(() => undefined)
        .finally(() => (stop = LoadOnce.atIdle(next)))
    }
    stop = LoadOnce.atIdle(next)
    return () => stop()
  }

  /** The running program's site, as far as this asks it. */
  private get site(): RunningSite | undefined {
    return this.copy.runtime.core.RUNTIME?.site as RunningSite | undefined
  }

  /** Run page `className`'s chunk on the program, once. */
  private run(className: string): Promise<void> {
    let running = this.ran.get(className)
    if (!running) {
      running = this.text(className)
        .then((chunk) => this.copy.runtime.runPageChunk(chunk, { coreUrl: this.copy.coreUrl, name: className }))
        .catch((problem: unknown) => {
          // the site shows what it can:  its waiting page;  showing the page again tries again
          this.ran.delete(className)
          console.error(`LazyPages:  couldn't load the page ${className}`, problem)
        })
      this.ran.set(className, running)
    }
    return running
  }

  /** Page `className`'s chunk's text, fetched once a page. */
  private text(className: string): Promise<string> {
    const url = LazyPages.chunkUrl(this.compiledUrl, className)
    return CHUNKS.get(url, async () => {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`${url}:  ${response.status}`)
      return response.text()
    })
  }

  /**
   * The address of page `className`'s chunk, beside the program's:
   * `.../SpellUI.spell.js?pages=lazy` => `.../SpellUI.spell.js?page=Grammar`.
   */
  static chunkUrl(compiledUrl: string, className: string): string {
    const url = new URL(compiledUrl, globalThis.location?.href ?? "http://localhost/")
    url.searchParams.delete(LAZY_PARAM)
    url.searchParams.set(PAGE_PARAM, className)
    return compiledUrl.startsWith("/") ? `${url.pathname}${url.search}` : url.href
  }
}

/** Every page's chunk fetched on this page, by its address:  a failure is forgotten, to try again when it's shown. */
const CHUNKS = new LoadOnce<string, string>({ failures: "forgotten" })

/**
 * The main chunk's line naming its pages' chunks:  `SP.PageChunks`' `LAZY_PAGES_MARK`.
 * - NOTE: a copy, NOT imported:  `spell/parser/spell` would pull the whole parser into the runner bundle.
 */
const LAZY_PAGES_LINE = /^\/\/ spell-lazy-pages: (.*)$/m

/** How many of the navigation's pages are fetched ahead at idle. */
const AHEAD_AT_IDLE = 8

/** The query asking for the main chunk:  `?pages=lazy` (spaces' `PageChunkFiles.LAZY`). */
export const LAZY_PARAM = "pages"

/** The query asking for a page's chunk:  `?page=Grammar`. */
const PAGE_PARAM = "page"

/** What a running site says, as `LazyPages` asks it:  `SiteBase`'s, by type only. */
type RunningSite = {
  pageFor(address: string): { entry: { page: string } } | undefined
  navPages(): { href?: string }[]
}

/** Constructor props of `LazyPages`. */
export type LazyPagesProps = {
  /** the pages' class names, each with a chunk of its own */
  names: readonly string[]
  /** the program's address, as it was fetched */
  compiledUrl: string
  /** the runtime copy the program runs on */
  copy: LoadedRuntime
}
