import { existsSync } from "node:fs"
import type { Browser, BrowserContextOptions, LaunchOptions, Page } from "playwright"

/****************
 * ### `BrowserPage`
 * A page in headless Chromium, for the tools that check or picture pages:
 * opened, its problems reported as they happen, and settled before anything looks at it.
 *
 * ```ts
 * const browser = await BrowserPage.launch()
 * const page = await BrowserPage.open(browser, url, { viewport: { width: 390, height: 844 }, onProblem: (text) => ... })
 * await page.screenshot({ path })
 * await browser.close()
 * ```
 *
 * - Every page gets `globalThis.__name`:  `tsx` compiles with esbuild's `keepNames`, which wraps the named functions
 *   a `page.evaluate()` sends to the page in `__name(...)`, a helper only the compiled file has.
 *   - Before epic `coherence` P7, three scripts each added it themselves, and the rest broke when run under `tsx`.
 * - Settled (`settle()`):  every pack tag defined and not pending, then a moment for the runtime.
 * - Its users:  Spell UI's site check, screenshots and README pictures;  spell-epic's page checks and demo checks;
 *   the brand's design check and comparison;  the kit's publish check;  the app's examples script.
 * - Its position:  node's own modules, and Playwright's types only, so plain `node` loads it by its own name,
 *   `spell/element-tools/BrowserPage` (an entry of its own in the kit's `exports`:  spell-epic's `.mjs` checks).
 *   Playwright itself is imported when `launch()` runs:  a tool that never opens a browser doesn't load it.
 * - NEVER a person's own Chrome (Owen's standing rule):  pages are looked at headlessly.
 * - STATIC and instance-free:  callers keep Playwright's own `Page`, with everything it can do.
 ****************/
export class BrowserPage {
  /** Headless Chromium, Playwright's;  close it with `browser.close()`. */
  static async launch(options?: LaunchOptions): Promise<Browser> {
    const { chromium } = await import("playwright")
    return chromium.launch(options)
  }

  /** Run `work` with a headless Chromium, closed after it, however it ends. */
  static async with<T>(work: (browser: Browser) => Promise<T>, options?: LaunchOptions): Promise<T> {
    const browser = await BrowserPage.launch(options)
    try {
      return await work(browser)
    } finally {
      await browser.close()
    }
  }

  /**
   * A new page of `browser`, in a context of its own (nothing remembered from another page), not loaded yet.
   * - each problem reported to `onProblem` as it happens
   * - requests matching a route answered from its files
   * - `globalThis.__name` defined (above)
   * - closing it closes its context:  `page.close()`
   */
  static async newPage(browser: Browser, props: BrowserPageProps = {}): Promise<Page> {
    const { viewport, colorScheme = "light", context, routes = [] } = props
    const page = await browser.newPage({ ...context, ...(viewport && { viewport }), colorScheme })
    await page.addInitScript(BrowserPage.NAME_HELPER)
    BrowserPage.watch(page, props)
    for (const { url, fileFor } of routes) {
      await page.route(url, (route) => {
        const file = fileFor(new URL(route.request().url()))
        return file && existsSync(file) ? route.fulfill({ path: file }) : route.fulfill({ status: 404 })
      })
    }
    return page
  }

  /**
   * A new page of `browser` at `url`, loaded and settled (`settle()`;  `settle: false` skips it).
   * - throws when the server answers with an error (a 404):  the page has none of its shape
   */
  static async open(browser: Browser, url: string, props: BrowserPageProps & OpenProps = {}): Promise<Page> {
    const page = await BrowserPage.newPage(browser, props)
    const response = await page.goto(url, props.timeout === undefined ? undefined : { timeout: props.timeout })
    if (response && !response.ok()) {
      await page.close()
      throw new Error(`BrowserPage.open():  ${url} answered ${response.status()} ${response.statusText()}`)
    }
    if (props.settle !== false) await BrowserPage.settle(page, props.settle)
    return page
  }

  /**
   * Report `page`'s problems to `onProblem` as they happen:  uncaught errors, and console messages of `consoleTypes`.
   * - for a page made elsewhere (a Playwright test's);  `newPage()` calls it
   * - a console message matching `ignore` isn't one (e.g. `Failed to load resource`, which a response listener
   *   reports better, with its URL)
   */
  static watch(page: Page, { onProblem, consoleTypes = ["error"], ignore }: ProblemProps): void {
    if (!onProblem) return
    page.on("pageerror", (error) => onProblem(String(error), "page error"))
    page.on("console", (message) => {
      const type = message.type()
      if (!consoleTypes.includes(type) || ignore?.test(message.text())) return
      onProblem(message.text(), `console ${type}`)
    })
  }

  /**
   * Wait until `page` is still:  every tag matching `tags` defined and not pending (or `timeout` passed), the
   * network idle (with `networkIdle`), then `quiet` ms for the runtime.
   * - pending:  a root defines its catalog's tags before their families load (`:state(pending)`, epic `solid-17` P7)
   * - returns whether every tag was defined in time:  a page that isn't is no error here, the caller says what it means
   * - NEVER throws for a slow page
   */
  static async settle(page: Page, settle: SettleProps = {}): Promise<boolean> {
    const { tags = PACK_TAGS, timeout = 10_000, networkIdle, quiet = 1000 } = settle
    const isDefined = await page
      .waitForFunction(
        (pattern) =>
          [...document.querySelectorAll("*")].every(
            (element) =>
              !new RegExp(pattern).test(element.localName) ||
              (customElements.get(element.localName) && !element.matches(":state(pending)"))
          ),
        tags.source,
        { timeout }
      )
      .then(
        () => true,
        () => false
      )
    if (networkIdle) await page.waitForLoadState("networkidle", { timeout: networkIdle }).catch(() => {})
    if (quiet) await page.waitForTimeout(quiet)
    return isDefined
  }

  /** The script that gives a page `globalThis.__name` (above), for a page made elsewhere:  `addInitScript()`. */
  static readonly NAME_HELPER = "globalThis.__name = (fn) => fn"
}

/** What `BrowserPage.newPage()` reports a problem as:  `page error`, or `console <type>` (`console error` ...). */
export type ProblemKind = "page error" | `console ${string}`

/**
 * What counts as a page's problem, and who hears of it.
 * - `onProblem(text, kind)`:  each one, as it happens
 * - `consoleTypes`:  the console messages that are problems, default `["error"]` (`["error", "warning"]` ...)
 * - `ignore`:  console text that's no problem
 */
export type ProblemProps = {
  onProblem?: (text: string, kind: ProblemKind) => void
  consoleTypes?: string[]
  ignore?: RegExp
}

/**
 * A URL pattern answered from files, not the network:  `fileFor(url)` names the file, `undefined` for a 404.
 * - e.g. a `file://` page's `/_epic/...` requests, answered from spell-epic's own folders
 */
export type BrowserRoute = { url: RegExp | string; fileFor: (url: URL) => string | undefined }

/**
 * `BrowserPage.newPage()` props.
 * - `viewport`:  the window's size;  `colorScheme`:  the page's `prefers-color-scheme`, default `light`
 * - `context`:  any other of Playwright's options (`deviceScaleFactor` ...)
 * - `routes`:  requests answered from files
 */
export type BrowserPageProps = ProblemProps & {
  viewport?: { width: number; height: number }
  colorScheme?: "light" | "dark"
  context?: BrowserContextOptions
  routes?: BrowserRoute[]
}

/**
 * `BrowserPage.open()` props, besides `newPage()`'s.
 * - `settle`:  how to settle it, or `false` not to
 * - `timeout`:  longest the load may take, ms (Playwright's 30s by default)
 */
export type OpenProps = { settle?: SettleProps | false; timeout?: number }

/**
 * How `BrowserPage.settle()` decides a page is still.
 * - `tags`:  the tags that must be defined, default `PACK_TAGS`
 * - `timeout`:  longest wait for them, ms (default 10s)
 * - `networkIdle`:  also wait (at most this many ms) for no requests in flight
 * - `quiet`:  then this long, ms, for the runtime (default 1s;  `0`:  none)
 */
export type SettleProps = { tags?: RegExp; timeout?: number; networkIdle?: number; quiet?: number }

/**
 * Tags a page's packs define:  `ui-*` (Spell UI), `epic-*` (the epics pack), `brand-*` (the brand's):
 * one that looks like theirs must be defined.
 * - not `spell-*`:  the app's are defined only where its pack loads;  a check that wants them says so (`tags`)
 */
export const PACK_TAGS = /^(ui|epic|brand)-/
