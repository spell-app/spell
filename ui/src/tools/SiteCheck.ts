/// <reference types="node" />

import { mkdirSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { parseArgs } from "node:util"

import type { Browser, Page } from "playwright"

import type { SiteDataFile } from "spell/ui/docs-components/docs-components.types"
import { BrowserPage, type BrowserPageProps } from "spell/element-tools/BrowserPage"
import { writeOrCheck } from "spell/element-tools/generatedFiles"
import { Terminal } from "spell/element-tools/Terminal"
import { SPELL_UI_SITE, SPELL_UI_SITE_FILE, ensureEditor, ensurePageServer } from "./pageServer.ts"
import { SiteSearchBuilder, type DrawnSpellPage } from "./SiteSearchBuilder.ts"
import { SITE_DATA, SPELL_UI_ROOT, SiteCheckError } from "./tools.types.ts"
import { environment } from "./environment.ts"

/****************
 * ### `SiteCheck`
 * Checks the pages of the Spell UI site in headless chromium:
 * the Spell pages of `@spell/guides/SpellUI`, as this checkout's editor runs them
 * (`<editor>/run/@spell/guides/SpellUI/<address>`, the editor's `RunSite`).
 * - Run:  `yarn site:check <page...>` (in `ui/`), or `yarn site:check --all`.
 *   - `--out <dir>` for the screenshots (default `results/site-check/`, git-ignored).
 *   - `scripts/site-check.ts` is the command, which hands its arguments to `SiteCheck.main()`:
 *     a class file runs nothing when imported.
 * - A page is its ADDRESS in the site (`resolveAddress()`), as the site's file lists it (`SpellUI.spell`):
 *   - `/button/examples`, or `button/examples`
 *   - a tag, `ui-button` => `/button`
 *   - `home` => `/`
 * - Problems (`PageReport.problems`;  exit 1):
 *   - console errors, page errors, failed requests and responses >= 400
 *   - `ui-*` / `spell-*` elements still undefined once settled;  defined `ui-*` with no shadow root
 *   - the contents (`ui-toc`):  empty or hidden on desktop on a page with sections;  visible on phone
 *   - a deep link to the first nested section that doesn't land:  its title not near the top once loaded
 *   - horizontal scroll at phone width, listing the elements past the edge, outermost and deepest:
 *     what a fixer needs
 *   - a nav button (`ui-site-nav-button`) whose drawer doesn't open at phone width
 * - Every page is checked, whatever failed before it.
 * - The site's search file, `docs/__data/search.json5` (`SiteSearchBuilder.spellSite()`):
 *   `--all` writes it as it goes, from each page as it's drawn on desktop (its markup, with the ids its contents gave);
 *   `--search` only does that, with no checks:  every page in one browser page, clicking from one to the next.
 *   - Written only when every page was read:  a page that couldn't be is a problem, and the file stays as it was.
 * - Problems go to stderr, with each page's URL, counts and screenshots;  a JSON summary is the last thing on stdout.
 * - Look at the screenshots too:  the checks can't see overlap, clipping or ugly wrapping.
 * - Throws `SiteCheckError` when it can't start:  no such page, or no editor running the site (exit 2).
 * - Until epic `editor` P42 it checked Spell UI's components pages (`docs/*.html`) instead,
 *   with two checks only they needed (four site tabs a page;  `site:sections`' ids):  gone with them.
 * - The page's elements are all in shadow roots (the editor's, the site's):  every probe walks them.
 * - Node only.
 ****************/
export class SiteCheck {
  /** The site's addresses to check, `/button/examples` ... */
  readonly addresses: string[]

  /** Screenshot folder, absolute. */
  readonly out: string

  /** The running editor's origin, with its `/`, e.g. `http://localhost:64794/`;  set by `run()`. */
  base = ""

  /** What it does with the site's search file:  see `SiteCheckProps.search`. */
  readonly search: SiteCheckProps["search"]

  /** The one browser every page shares;  set by `run()`. */
  private browser?: Browser

  /** Each page as drawn, by address, for the search file;  filled as the pages are loaded. */
  private readonly drawn = new Map<string, Omit<DrawnSpellPage, "title">>()

  /** The site's navigation's `pages`, as the first page read drew it:  the pages' titles (`spellTitles()`). */
  private navPages: unknown

  constructor({ addresses, out = DEFAULT_OUT, search }: SiteCheckProps) {
    this.addresses = addresses
    this.out = out
    this.search = search
  }

  /**
   * `yarn site:check`:  parse the command line, check every page, print, and exit.
   * - SIDE EFFECT:  `process.exit()`:  0 all clean, 1 any problem, 2 bad arguments, no such page or no editor
   */
  static async main(argv: string[] = process.argv.slice(2)): Promise<never> {
    let parsed: ReturnType<typeof parseCommandLine>
    try {
      parsed = parseCommandLine(argv)
    } catch (error) {
      return exit(`${(error as Error).message}\n${USAGE}`, 2)
    }
    const { values, positionals } = parsed
    if (values.help) return exit(USAGE, 0)
    try {
      const known = await SiteCheck.siteAddresses()
      const isWhole = values.all || values.search
      const addresses = isWhole ? known : positionals.map((name) => SiteCheck.resolveAddress(name, known))
      if (!addresses.length) return exit(USAGE, 2)
      const check = new SiteCheck({
        addresses: [...new Set(addresses)],
        out: values.out === undefined ? undefined : resolve(environment.invocationDir, values.out),
        search: values.search ? "only" : values.all ? "also" : undefined
      })
      const reports = await check.run()
      const ok = reports.every((report) => report.ok)
      Terminal.out(JSON.stringify({ ok, base: check.base, out: check.out, pages: reports }, null, 2))
      return exit("", ok ? 0 : 1)
    } catch (error) {
      if (!(error instanceof SiteCheckError)) throw error
      return exit(error.message, 2)
    }

    /** Print `message` (stdout for `--help`, else stderr) and exit with `code`. */
    function exit(message: string, code: number): never {
      if (message) (code ? Terminal.err : Terminal.out)(message)
      process.exit(code)
    }
  }

  /**
   * The site's address for what was typed, one of `known`:
   * - `/button/examples` or `button/examples`
   * - a tag, `ui-button` => `/button`
   * - `home` or `index` => `/`
   * - throws `SiteCheckError` when it names no page of the site
   */
  static resolveAddress(name: string, known: readonly string[]): string {
    const bare = name.replace(/^\/+|\/+$/g, "").replace(/^ui-/, "")
    const address = HOME_NAMES.includes(bare) ? "/" : `/${bare}`
    if (!known.includes(address)) {
      throw new SiteCheckError(
        `SiteCheck.resolveAddress():  the Spell UI site has no page "${name}" (${address});  ` +
          "its pages are the addresses its file lists (`SpellUI.spell`)"
      )
    }
    return address
  }

  /**
   * Every page's address, in the order the site's file lists them (`it has ... page at "/button" ...`):
   * read from the page server (`SPELL_UI_SITE_FILE`).
   * - SIDE EFFECT:  `spell server start` starts the page server if it isn't running
   * - throws `SiteCheckError` when the page server can't start, or doesn't serve the file
   */
  static async siteAddresses(): Promise<string[]> {
    let base: string
    try {
      base = ensurePageServer()
    } catch (error) {
      throw new SiteCheckError(`SiteCheck.siteAddresses():  can't start or find the page server:  ${error}`)
    }
    const url = `${base}/${SPELL_UI_SITE_FILE}`
    const response = await fetch(url, { signal: AbortSignal.timeout(PROBE_MS) }).catch((error: unknown) => {
      throw new SiteCheckError(`SiteCheck.siteAddresses():  ${url} didn't answer:  ${error}`)
    })
    if (!response.ok) throw new SiteCheckError(`SiteCheck.siteAddresses():  ${url} => ${response.status}`)
    return SiteCheck.addressesIn(await response.text())
  }

  /** The page addresses a site file's text lists, in its order:  `at "/button"` => `/button`. */
  static addressesIn(siteText: string): string[] {
    return [...siteText.matchAll(PAGE_LINE)].map((match) => match[1]!)
  }

  /** A page's screenshot prefix:  its address, `/` => `home`, `/button/examples` => `button-examples`. */
  static shotNameFor(address: string): string {
    return address === "/" ? "home" : address.replace(/^\//, "").replaceAll("/", "-")
  }

  /**
   * Find the editor, then check every page in one browser.
   * - SIDE EFFECT:  `spell server start all` starts the page server and the editor if they aren't running;
   *   writes screenshots to `out`;  prints each page's result to stderr
   * - throws `SiteCheckError` when there's no editor running the site
   */
  async run(): Promise<PageReport[]> {
    this.base = await this.ensureEditor()
    mkdirSync(this.out, { recursive: true })
    this.browser = await BrowserPage.launch()
    const reports: PageReport[] = []
    try {
      if (this.search === "only") {
        for (const report of await this.readEveryPage()) {
          if (!report.ok) this.print(report)
          reports.push(report)
        }
      } else {
        for (const address of this.addresses) {
          const report = await this.checkPage(address)
          this.print(report)
          reports.push(report)
        }
      }
    } finally {
      await this.browser.close()
    }
    if (this.search) this.writeSearch()
    return reports
  }

  /**
   * Write the site's search file from every page as drawn (`SiteSearchBuilder.spellSite()`), unless one wasn't read.
   * - SIDE EFFECT:  writes `docs/__data/search.json5` when it changed;  says what it did on stderr
   */
  private writeSearch(): void {
    const missing = this.addresses.filter((address) => !this.drawn.has(address))
    if (missing.length) {
      Terminal.err(
        `\nsearch.json5 NOT written:  ${missing.length} page(s) not read (${missing.slice(0, 5).join(", ")})`
      )
      return
    }
    const titles = SiteSearchBuilder.spellTitles(this.navPages)
    const pages = this.addresses.map((address) => ({
      ...this.drawn.get(address)!,
      title: titles.get(address) ?? address
    }))
    const data = JSON.parse(readFileSync(DATA_FILE, "utf8")) as SiteDataFile
    const text = SiteSearchBuilder.textOf(SiteSearchBuilder.spellSite(pages, data))
    const written = writeOrCheck([[SEARCH_FILE, text]], { command: "site:check --all", isCheck: false })
    Terminal.err(`\nsearch.json5:  ${pages.length} pages, ${written.length ? "written" : "unchanged"}`)
  }

  /**
   * The running editor's origin, once it runs the site (`ensureEditor()`).
   * - throws `SiteCheckError` when there's no editor, or it doesn't answer the site's home page
   */
  async ensureEditor(): Promise<string> {
    let base: string
    try {
      base = ensureEditor()
    } catch (error) {
      throw new SiteCheckError(
        `SiteCheck.ensureEditor():  can't start or find this checkout's editor (\`spell server start all\`):  ` +
          `${error};  start it by hand and read its output`
      )
    }
    const probe = `${base}${SPELL_UI_SITE}/`
    const status = await fetch(probe, { signal: AbortSignal.timeout(PROBE_MS) }).then(
      (response) => response.status,
      (error: unknown) => String(error)
    )
    if (status !== 200)
      throw new SiteCheckError(`SiteCheck.ensureEditor():  the editor doesn't answer ${probe} (${status})`)
    return base
  }

  /** Check one page at desktop, phone and dark;  NEVER throws:  a crash is one more problem. */
  async checkPage(address: string): Promise<PageReport> {
    const { context, finish } = this.started(address)
    for (const step of [this.checkDesktop, this.checkDeepLink, this.checkPhone, this.checkDark]) {
      try {
        await step.call(this, context)
      } catch (error) {
        context.problem(`${step.name} crashed:  ${error}`)
      }
    }
    return finish()
  }

  /**
   * `--search`:  read every page for the search file, in ONE browser page, moving from page to page by the site's own
   * links, as a person clicking through it would (`goWithin()`):  the site compiles once, not once a page.
   * - The first page is loaded;  each problem goes to the page being read when it happens.
   * - A fresh browser page every `PAGES_PER_LOAD` pages:  one page that has shown hundreds grows until it crashes.
   * - A page whose reading crashed is loaded once more in a fresh browser page;  the next pages go on from there.
   * - NEVER throws:  a crash is a problem of the page it happened on.
   */
  private async readEveryPage(): Promise<PageReport[]> {
    const pages = this.addresses.map((address) => this.started(address))
    let reading = pages[0]!.context
    const relay: CheckContext = {
      get address() {
        return reading.address
      },
      get name() {
        return reading.name
      },
      get report() {
        return reading.report
      },
      problem: (text) => reading.problem(text)
    }
    let page: Page | undefined
    let shown = 0
    const fresh = async (context: CheckContext) => {
      await page
        ?.context()
        .close()
        .catch(() => {})
      page = await this.open(relay, DESKTOP, "desktop")
      shown = 0
      await this.load(page, context.report.url, context)
    }
    try {
      for (const { context } of pages) {
        reading = context
        try {
          if (!page || shown >= PAGES_PER_LOAD) await fresh(context)
          else await this.goWithin(page, context)
          await this.readDrawn(page!, context)
        } catch (error) {
          context.report.notes.push(`reading crashed, loaded again:  ${String(error).split("\n")[0]}`)
          try {
            await fresh(context)
            await this.readDrawn(page!, context)
          } catch (again) {
            context.problem(`reading crashed:  ${again}`)
            page = undefined
          }
        }
        shown++
      }
    } finally {
      await page
        ?.context()
        .close()
        .catch(() => {})
    }
    return pages.map(({ finish }) => finish())
  }

  /**
   * Show `check`'s page in the site already loaded in `page`:  a click on a link to its address, which the site takes
   * (`followSiteLink()`);  then wait for it to be drawn and settle (its contents give its sections ids).
   * - A problem when the site has no frame to click in, or doesn't show the page in time.
   */
  private async goWithin(page: Page, check: CheckContext): Promise<void> {
    const before = await page.evaluate(drawnTag)
    if (!(await page.evaluate(followSiteLink, check.address)))
      return check.problem("search:  no site frame to click in")
    const isShown = await page
      .waitForFunction(
        ({ address, before }) => (globalThis as any).__spellDrawnAt(address, before),
        { address: check.address, before },
        { timeout: SETTLE_MS }
      )
      .then(
        () => true,
        () => false
      )
    if (!isShown) check.report.notes.push(`${check.address}:  not shown ${SETTLE_MS / 1000}s after its link's click`)
    await page.waitForTimeout(RUNTIME_SETTLE_MS)
  }

  /**
   * A page's report, started:  `context` for the steps, `finish()` to close it.
   * - `problem()` records a problem once per distinct first line (800 characters at most):
   *   a broken element logs the same error once per instance, counted, not repeated
   */
  private started(address: string): { context: CheckContext; finish: () => PageReport } {
    const report: PageReport = {
      page: address,
      url: `${this.base}${SPELL_UI_SITE}${address === "/" ? "/" : address}`,
      ok: false,
      problems: [],
      notes: [],
      counts: {},
      screenshots: []
    }
    const seen = new Map<string, number>()
    const problem = (text: string) => {
      const line = String(text).split("\n")[0]!.slice(0, 800)
      seen.set(line, (seen.get(line) ?? 0) + 1)
    }
    const finish = () => {
      report.problems = [...seen].map(([text, count]) => (count > 1 ? `${text}  (x${count})` : text))
      report.notes = [...new Set(report.notes)]
      report.ok = report.problems.length === 0
      return report
    }
    return { context: { address, name: SiteCheck.shotNameFor(address), report, problem }, finish }
  }

  ////////////////
  // ## Viewports
  ////////////////

  /** Desktop:  errors, element definitions, the contents, screenshots of the top and the whole page. */
  private async checkDesktop(check: CheckContext): Promise<void> {
    const { report, problem, name } = check
    const page = await this.open(check, DESKTOP, "desktop")
    try {
      await this.load(page, report.url, check)
      const elements = await page.evaluate(inspectElements)
      report.counts.elements = elements.total
      report.counts.tags = Object.keys(elements.tags).length
      for (const [tag, count] of Object.entries(elements.undefined)) problem(`${count} <${tag}> never defined`)
      for (const [tag, count] of Object.entries(elements.unrendered)) problem(`${count} <${tag}> without a shadow root`)
      const sections = await page.evaluate(sectionsState)
      report.counts.sections = sections.length
      const toc = await page.evaluate(tocState)
      report.counts.toc = toc?.entries
      // the contents list a page's sections:  a page without any (the home page) may leave it empty
      if (sections.length && toc && !toc.entries) problem("ui-toc has no entries, on a page with sections")
      if (sections.length && toc?.entries && !toc.isVisible) problem("ui-toc hidden on desktop")
      if (this.search) await this.readDrawn(page, check)
      await this.shoot(page, check, `${name}-desk-top.png`)
      await this.shootWhole(page, check, `${name}-desk-full.png`)
    } finally {
      await page.context().close()
    }
  }

  /**
   * Keep the page as drawn for the search file (`drawnState()`):  its markup, once its contents gave its sections ids.
   * - A problem when it isn't drawn, or the site shows another page than asked for.
   */
  private async readDrawn(page: Page, check: CheckContext): Promise<void> {
    const drawn = await page.evaluate(drawnState, this.navPages === undefined)
    if (!drawn) return check.problem("search:  no page drawn in the site's page layout to read")
    if (drawn.current !== check.address)
      return check.problem(`search:  the site shows ${drawn.current}, not ${check.address}`)
    if (drawn.pages) this.navPages ??= SiteCheck.parsed(drawn.pages)
    this.drawn.set(check.address, { address: check.address, html: drawn.html })
  }

  /** `text` as JSON;  `undefined` when it isn't. */
  private static parsed(text: string): unknown {
    try {
      return JSON.parse(text)
    } catch {
      return undefined
    }
  }

  /**
   * A deep link to the first NESTED section (else the first) lands:  loaded with its `#id`,
   * its title is near the top of the page's scrolling box (`LANDED_PX`),
   * unless the page is too short to scroll it that far.
   * - screenshot `<page>-desk-deep.png`
   */
  private async checkDeepLink(check: CheckContext): Promise<void> {
    const { report, problem, name } = check
    const page = await this.open(check, DESKTOP, "deep link")
    try {
      await this.load(page, report.url, check)
      const sections = await page.evaluate(sectionsState)
      const target = sections.find((section) => section.isNested) ?? sections[0]
      if (!target?.id) return
      await page.goto("about:blank")
      await this.load(page, `${report.url}#${target.id}`, check)
      await page.waitForTimeout(LAND_MS)
      const landed = await page.evaluate(landedState, target.id)
      report.counts.deepLink = { id: target.id, ...landed }
      if (!landed) problem(`deep link #${target.id}:  no such section once loaded`)
      else if (landed.top > LANDED_PX && !landed.isAtBottom)
        problem(`deep link #${target.id}:  its title is ${landed.top}px down the page, not at the top`)
      await this.shoot(page, check, `${name}-desk-deep.png`)
    } finally {
      await page.context().close()
    }
  }

  /**
   * Phone:  horizontal scroll (with its widest leaf offenders), the contents hidden, the nav drawer opening.
   * Screenshots top, whole page and nav.
   */
  private async checkPhone(check: CheckContext): Promise<void> {
    const { report, problem, name } = check
    const page = await this.open(check, PHONE, "phone")
    try {
      await this.load(page, report.url, check)
      const width = await page.evaluate(overflowState)
      report.counts.phoneOverflow = width.overflow
      if (width.overflow > 0) {
        report.counts.phoneOffenders = width.offenders
        report.counts.phoneOutermost = width.outermost
        problem(
          `${width.overflow}px horizontal scroll at phone width;  outermost:  ${width.outermost.join(", ")};  ` +
            `deepest:  ${width.offenders.join(", ")}`
        )
      }
      const toc = await page.evaluate(tocState)
      if (toc?.isVisible) problem("ui-toc visible at phone width (should be hidden)")
      await this.shoot(page, check, `${name}-phone-top.png`)
      await this.shootWhole(page, check, `${name}-phone-full.png`)

      // Playwright's CSS locators look inside open shadow roots
      const menu = page.locator("ui-site-nav-button:visible").first()
      if (!(await menu.count())) {
        report.notes.push("no visible ui-site-nav-button:  nav drawer not checked")
        return
      }
      const before = await page.evaluate(navState)
      let error = ""
      try {
        await menu.click({ timeout: CLICK_MS })
      } catch (thrown) {
        error = `:  ${String(thrown).split("\n")[0]}`
      }
      const isOpen = await page
        .waitForFunction((was) => (globalThis as any).__spellNavState() !== was, before, { timeout: NAV_OPEN_MS })
        .then(
          () => true,
          () => false
        )
      if (isOpen) await page.waitForTimeout(NAV_SLIDE_MS)
      report.counts.navOpen = isOpen
      if (!isOpen) problem(`nav drawer didn't open from ui-site-nav-button${error}`)
      await this.shoot(page, check, `${name}-phone-nav.png`)
    } finally {
      await page.context().close()
    }
  }

  /** Dark scheme:  one desktop screenshot (errors still count). */
  private async checkDark(check: CheckContext): Promise<void> {
    const page = await this.open(check, { ...DESKTOP, colorScheme: "dark" }, "dark")
    try {
      await this.load(page, check.report.url, check)
      await this.shoot(page, check, `${check.name}-desk-dark.png`)
    } finally {
      await page.context().close()
    }
  }

  ////////////////
  // ## Helpers
  ////////////////

  /**
   * A page in a fresh context, its errors and failed requests reported as `check`'s problems, labelled `label`.
   * - ignores console "Failed to load resource" lines
   *   (the response / request listeners report those, with their URL)
   * - `net::ERR_ABORTED` is a note:  a navigation (the next load) cancels what's still in flight
   * - the response / request listeners stay here:  `BrowserPage` reports only the page's own errors
   * - `__spellNavState()`:  the nav state probe (`navState()`), for `waitForFunction()` to compare against
   */
  private async open(check: CheckContext, props: BrowserPageProps, label: string): Promise<Page> {
    const { problem, report } = check
    const page = await BrowserPage.newPage(this.browser!, {
      ...props,
      ignore: /^Failed to load resource/,
      onProblem: (text, kind) => problem(`${kind === "page error" ? kind : "console"} (${label}):  ${text}`)
    })
    page.setDefaultTimeout(STEP_MS)
    await page.addInitScript(`globalThis.__spellNavState = ${navState.toString()}`)
    await page.addInitScript(`globalThis.__spellDrawnAt = ${drawnAt.toString()}`)
    page.on("response", (response) => {
      if (response.status() >= 400) problem(`HTTP ${response.status()} (${label}):  ${response.url()}`)
    })
    page.on("requestfailed", (request) => {
      const text = `request failed (${label}):  ${request.url()}  ${request.failure()?.errorText ?? ""}`
      if (request.failure()?.errorText.includes("ERR_ABORTED")) report.notes.push(text)
      else problem(text)
    })
    return page
  }

  /**
   * Go to `url` and let it settle:  the site drawn (its `ui-page-layout`, at most `SETTLE_MS`), every `ui-*` /
   * `spell-*` element defined, the network idle, then `RUNTIME_SETTLE_MS` for the runtime.
   * - a page that doesn't settle is NOT a problem here:  a note, and `inspectElements` reports what stayed undefined
   */
  private async load(page: Page, url: string, check: CheckContext): Promise<void> {
    await page.goto(url, { timeout: LOAD_MS })
    const isDrawn = await page.waitForFunction(siteDrawn, undefined, { timeout: SETTLE_MS }).then(
      () => true,
      () => false
    )
    if (!isDrawn) check.report.notes.push(`${url}:  the site's page layout not drawn after ${SETTLE_MS / 1000}s`)
    await page.waitForLoadState("networkidle", { timeout: NETWORK_IDLE_MS }).catch(() => {})
    await page.waitForTimeout(RUNTIME_SETTLE_MS)
  }

  /** Screenshot `page` to `out/<file>`:  the viewport.  Listed in the report. */
  private async shoot(page: Page, check: CheckContext, file: string): Promise<void> {
    const path = join(this.out, file)
    await page.screenshot({ path, timeout: SCREENSHOT_MS })
    check.report.screenshots.push(path)
  }

  /**
   * Screenshot the WHOLE page:  the page scrolls inside the editor's box, not the window,
   * so the window is made as tall as what's in that box (at most `WHOLE_MAX_PX`), then put back.
   */
  private async shootWhole(page: Page, check: CheckContext, file: string): Promise<void> {
    const viewport = page.viewportSize()!
    const height = await page.evaluate(scrollingHeight)
    const tall = Math.ceil(Math.min(Math.max(height, viewport.height), WHOLE_MAX_PX))
    await page.setViewportSize({ width: viewport.width, height: tall })
    await page.waitForTimeout(SCROLL_SETTLE_MS)
    try {
      await this.shoot(page, check, file)
    } finally {
      await page.setViewportSize(viewport)
    }
  }

  /** Print one page's result to stderr:  URL, problems, notes, counts, screenshots. */
  private print(report: PageReport): void {
    const lines = [`\n${report.ok ? "OK" : "FAILED"}  ${report.url}`]
    for (const text of report.problems) lines.push(`  PROBLEM:  ${text}`)
    for (const text of report.notes) lines.push(`  NOTE:  ${text}`)
    lines.push(`  counts:  ${JSON.stringify(report.counts)}`)
    lines.push(`  screenshots:  ${this.out}`)
    for (const path of report.screenshots) lines.push(`    ${path.slice(this.out.length + 1)}`)
    Terminal.err(lines.join("\n"))
  }
}

/** Constructor props of `SiteCheck`. */
export type SiteCheckProps = {
  /** the site's addresses to check (`SiteCheck.resolveAddress()`, `siteAddresses()`) */
  addresses: string[]
  /** screenshot folder, absolute;  default `results/site-check/` */
  out?: string
  /**
   * the site's search file (`docs/__data/search.json5`), from every page as drawn:
   * - `"also"`:  read as the pages are checked, then written (`--all`)
   * - `"only"`:  read in one browser page, going from page to page by the site's links, and written;
   *   no checks (`--search`)
   * - none:  left as it is
   * - written only when every page in `addresses` was read
   */
  search?: "also" | "only"
}

/**
 * One page's result, as printed and in the JSON summary.
 * - `ok` is the page's VERDICT, reported data, not an error union (WWOD §5):
 *   a check that can't START throws `SiteCheckError` instead.
 */
export type PageReport = {
  /** its address in the site, e.g. `/button/examples` */
  page: string
  /** where the editor runs it */
  url: string
  /** no problems */
  ok: boolean
  /** each distinct problem once, `(xN)` when repeated */
  problems: string[]
  /** worth knowing, never fails */
  notes: string[]
  /** what the steps measured */
  counts: PageCounts
  /** absolute PNG paths */
  screenshots: string[]
}

/** What `SiteCheck`'s steps measured on one page (`PageReport.counts`);  each only once its step got that far. */
export type PageCounts = {
  /** `ui-*` / `spell-*` elements, light DOM and shadow roots */
  elements?: number
  /** distinct tags among them */
  tags?: number
  /** the page's sections */
  sections?: number
  /** the contents' entries */
  toc?: number
  /** where the deep link landed (`landedState()`) */
  deepLink?: { id: string } & Partial<LandedState>
  /** horizontal scroll at phone width, px */
  phoneOverflow?: number
  /** the deepest elements past the edge */
  phoneOffenders?: string[]
  /** the outermost elements past the edge */
  phoneOutermost?: string[]
  /** the nav drawer opened */
  navOpen?: boolean
}

/** One of the page's sections, as `sectionsState()` reads it. */
type SectionState = {
  /** its id, `""` for none */
  id: string
  /** it's inside another section */
  isNested: boolean
}

/** Where a deep link landed, as `landedState()` reads it. */
type LandedState = {
  /** its top, px from the top of the page's scrolling box */
  top: number
  /** the scrolling box is scrolled to its bottom */
  isAtBottom: boolean
}

/** What the viewport steps share for one page. */
type CheckContext = {
  /** its address in the site */
  address: string
  /** the screenshots' prefix */
  name: string
  /** filled in as the steps go */
  report: PageReport
  /** record a problem;  deduped by its first line */
  problem: (text: string) => void
}

////////////////
// ## Command line
////////////////

/** `yarn site:check`'s flags (`SiteCheck.main()`);  throws a `TypeError` on an unknown one. */
function parseCommandLine(argv: string[]) {
  return parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      all: { type: "boolean" },
      search: { type: "boolean" },
      out: { type: "string" },
      help: { type: "boolean", short: "h" }
    }
  })
}

////////////////
// ## Constants
////////////////

/** A page's line in the site's file:  its address, the quoted path after `at`. */
const PAGE_LINE = /^\s*it has an? [^\n]*? page at "([^"]+)"/gm

/** What may name the home page, `/`. */
const HOME_NAMES = ["", "home", "index"]

/** Default screenshot folder;  `results` is git-ignored. */
const DEFAULT_OUT = join(SPELL_UI_ROOT, "results", "site-check")

/** The site's data, which names the tag each family's Usage page documents. */
const DATA_FILE = join(SPELL_UI_ROOT, SITE_DATA, "components.json5")

/** The site's search file, written from the pages as drawn (`writeSearch()`). */
const SEARCH_FILE = join(SPELL_UI_ROOT, SITE_DATA, "search.json5")

/** Pages `--search` shows in one browser page before it starts a fresh one (`readEveryPage()`). */
const PAGES_PER_LOAD = 40

/** Printed on bad arguments and `--help`. */
const USAGE = `usage:  yarn site:check <page...> | --all | --search  [--out <dir>]
  page:  an address of the Spell UI site (/button/examples, button), a tag (ui-button), or home
  --all:  every page its file (SpellUI.spell) lists;  and writes the site's search file (docs/__data/search.json5)
  --search:  only writes the search file:  reads every page, with no checks
  --out:  screenshot folder (default ${DEFAULT_OUT})`

/** Desktop viewport. */
const DESKTOP: BrowserPageProps = { viewport: { width: 1440, height: 900 } }

/** Phone viewport:  an iPhone 14-ish, touch, retina. */
const PHONE: BrowserPageProps = {
  viewport: { width: 390, height: 844 },
  context: { isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
}

/** How long the editor may take to draw the site's page:  its first page compiles the whole site. */
const SETTLE_MS = 30000

/** A deep-linked section's title lands within this of the scrolling box's top, px:  under the page's title and stuck titles. */
const LANDED_PX = 320

/** How long a deep link may take to land after the page settles;  a SLEEP:  nothing says it's done. */
const LAND_MS = 1500

/**
 * After a load settles, for the runtime:
 * late work after the elements are defined (a reveal, a lazy family, the section folds restored).
 * - A SLEEP:  no one event says the page is done.
 */
const RUNTIME_SETTLE_MS = 1000

/** After the window is resized for a whole-page picture, for the page to lay out again;  a SLEEP. */
const SCROLL_SETTLE_MS = 400

/** The tallest whole-page picture, px:  Chromium's screenshots fail past about 16k. */
const WHOLE_MAX_PX = 12000

/** How long the nav drawer may take to change after its button's click (`navState()`). */
const NAV_OPEN_MS = 3000

/** The nav drawer's slide-in, once it's open, so its screenshot shows it whole;  a SLEEP (no event ends it). */
const NAV_SLIDE_MS = 600

/** A page load (`goto()`). */
const LOAD_MS = 60000

/** The network going idle after a load:  past it, the checks go on (a long poll would never let it). */
const NETWORK_IDLE_MS = 10000

/** Every other Playwright step (a locator, an `evaluate()`). */
const STEP_MS = 20000

/** Clicking the nav button. */
const CLICK_MS = 3000

/** One screenshot (a whole page can be tall). */
const SCREENSHOT_MS = 30000

/** Fetching from a server, to see it answers. */
const PROBE_MS = 10000

////////////////
// ## In-page probes
// Serialized into the page by `page.evaluate()` / `waitForFunction()`:  self-contained, no closures over this module.
// Each walks the light DOM and every open shadow root:  the editor draws the site in its own.
////////////////

/** Whether the site has drawn its page:  its `ui-page-layout`, anywhere. */
function siteDrawn(): boolean {
  let found = false
  walk(document)
  return found

  /** Look for it under `root`, and in the shadow roots there. */
  function walk(root: Document | ShadowRoot) {
    if (found || root.querySelector("ui-page-layout")) {
      found = true
      return
    }
    for (const el of root.querySelectorAll("*")) if (el.shadowRoot) walk(el.shadowRoot)
  }
}

/**
 * Elements of ours across the light DOM and every open shadow root:
 * totals per tag, the undefined (`ui-*` / `spell-*`), the defined `ui-*` with no shadow root.
 */
function inspectElements() {
  const tags: Record<string, number> = {}
  const undefinedTags: Record<string, number> = {}
  const unrendered: Record<string, number> = {}
  let total = 0
  walk(document)
  return { total, tags, undefined: undefinedTags, unrendered }

  /** Count every `ui-*` / `spell-*` element under `root`, then recurse into their shadow roots. */
  function walk(root: Document | ShadowRoot) {
    for (const el of root.querySelectorAll("*")) {
      const tag = el.localName
      if (el.shadowRoot) walk(el.shadowRoot)
      if (!tag.startsWith("ui-") && !tag.startsWith("spell-")) continue
      // a plain marker on purpose, never defined:  `drawnInWindow()`'s "more below" at a list's end
      if (tag === "spell-more-below") continue
      total++
      tags[tag] = (tags[tag] ?? 0) + 1
      if (!customElements.get(tag)) undefinedTags[tag] = (undefinedTags[tag] ?? 0) + 1
      else if (tag.startsWith("ui-") && !el.shadowRoot) unrendered[tag] = (unrendered[tag] ?? 0) + 1
    }
  }
}

/**
 * The page's own sections:  the `ui-section`s the site's page draws (inside its `ui-page-layout`),
 * not the demos inside examples (`spell-example`, `ui-example`).
 */
function sectionsState(): SectionState[] {
  const sections: SectionState[] = []
  walk(document, false)
  return sections

  /** Collect them under `root`;  `isInLayout`:  inside the site's page layout already. */
  function walk(root: Document | ShadowRoot, isInLayout: boolean) {
    for (const el of root.querySelectorAll("*")) {
      const inLayout = isInLayout || !!el.closest("ui-page-layout")
      if (inLayout && el.localName === "ui-section" && !el.closest("spell-example, ui-example"))
        sections.push({ id: el.id, isNested: !!el.parentElement?.closest("ui-section") })
      if (el.shadowRoot && !/^(spell-example|ui-example)$/.test(el.localName)) walk(el.shadowRoot, inLayout)
    }
  }
}

/**
 * The page the site drew, for the search file:  the first child of its `ui-page-layout` in no slot (as
 * `TocIndex.layoutPage()`), its markup;  the site navigation's `current`, and its `pages` (as text) when `withPages`.
 * `undefined` with no page layout.
 */
function drawnState(withPages: boolean) {
  const layout = find(document, "ui-page-layout")
  const page = layout && [...layout.children].find((child) => !child.hasAttribute("slot"))
  if (!page) return undefined
  const nav = find(document, "ui-site-nav")
  return {
    html: page.outerHTML,
    current: nav?.getAttribute("current") ?? undefined,
    pages: withPages ? (nav?.getAttribute("pages") ?? undefined) : undefined
  }

  /** The first `selector` under `root`, or in a shadow root there. */
  function find(root: Document | ShadowRoot, selector: string): Element | undefined {
    const here = root.querySelector(selector)
    if (here) return here
    for (const el of root.querySelectorAll("*")) {
      const inner = el.shadowRoot && find(el.shadowRoot, selector)
      if (inner) return inner
    }
    return undefined
  }
}

/** The tag of the page the site drew (`spell-u-i-button-api`), or `""`:  to see a new one drawn. */
function drawnTag(): string {
  return find(document)?.localName ?? ""

  /** The site's page under `root`, or in a shadow root there. */
  function find(root: Document | ShadowRoot): Element | undefined {
    const layout = root.querySelector("ui-page-layout")
    if (layout) return [...layout.children].find((child) => !child.hasAttribute("slot"))
    for (const el of root.querySelectorAll("*")) {
      const inner = el.shadowRoot && find(el.shadowRoot)
      if (inner) return inner
    }
    return undefined
  }
}

/**
 * Whether the site shows `address` now:  its navigation's `current` is it, and a page other than `before` is drawn.
 * - Installed as `__spellDrawnAt()` (`open()`), for `waitForFunction()`.
 */
function drawnAt(address: string, before: string): boolean {
  const nav = find(document, "ui-site-nav")
  if (nav?.getAttribute("current") !== address) return false
  const layout = find(document, "ui-page-layout")
  const page = layout && [...layout.children].find((child) => !child.hasAttribute("slot"))
  return !!page && page.localName !== before

  /** The first `selector` under `root`, or in a shadow root there. */
  function find(root: Document | ShadowRoot, selector: string): Element | undefined {
    const here = root.querySelector(selector)
    if (here) return here
    for (const el of root.querySelectorAll("*")) {
      const inner = el.shadowRoot && find(el.shadowRoot, selector)
      if (inner) return inner
    }
    return undefined
  }
}

/**
 * Click a link to `address` inside the site's frame (`.spell-site-frame`), which the site takes as its own
 * (`SiteBase.followLink()`);  `false` with no frame.
 */
function followSiteLink(address: string): boolean {
  const frame = find(document)
  if (!frame) return false
  const link = document.createElement("a")
  link.setAttribute("href", address)
  link.hidden = true
  frame.append(link)
  link.click()
  link.remove()
  return true

  /** The site's frame under `root`, or in a shadow root there. */
  function find(root: Document | ShadowRoot): Element | undefined {
    const here = root.querySelector(".spell-site-frame")
    if (here) return here
    for (const el of root.querySelectorAll("*")) {
      const inner = el.shadowRoot && find(el.shadowRoot)
      if (inner) return inner
    }
    return undefined
  }
}

/** Where the section `id` landed, from the top of the box the page scrolls in;  `undefined`:  no such section. */
function landedState(id: string): LandedState | undefined {
  const target = find(document)
  if (!target) return undefined
  const box = scroller(target)
  const top = box ? box.getBoundingClientRect().top : 0
  const isAtBottom = box
    ? box.scrollTop >= box.scrollHeight - box.clientHeight - 2
    : scrollY >= document.documentElement.scrollHeight - innerHeight - 2
  return { top: Math.round(target.getBoundingClientRect().top - top), isAtBottom }

  /** The section with that id under `root`, or in a shadow root there. */
  function find(root: Document | ShadowRoot): Element | undefined {
    const here = root.querySelector(`ui-section[id="${CSS.escape(id)}"]`)
    if (here) return here
    for (const el of root.querySelectorAll("*")) {
      const inner = el.shadowRoot && find(el.shadowRoot)
      if (inner) return inner
    }
    return undefined
  }

  /** The nearest box around `el` that scrolls, across shadow roots. */
  function scroller(el: Element): Element | undefined {
    let node: Node | null = el.parentNode
    while (node) {
      if (node instanceof ShadowRoot) node = node.host
      if (node instanceof Element && node.scrollHeight > node.clientHeight + 1) {
        const overflow = getComputedStyle(node).overflowY
        if (overflow === "auto" || overflow === "scroll") return node
      }
      node = node.parentNode
    }
    return undefined
  }
}

/** How tall the page's content is:  the tallest box that scrolls (the editor's), else the document. */
function scrollingHeight(): number {
  let tallest = document.documentElement.scrollHeight
  walk(document)
  return tallest

  /** Measure every scrolling box under `root`, and in the shadow roots there. */
  function walk(root: Document | ShadowRoot) {
    for (const el of root.querySelectorAll("*")) {
      if (el.scrollHeight > el.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(el).overflowY))
        tallest = Math.max(tallest, el.scrollHeight + el.getBoundingClientRect().top)
      if (el.shadowRoot) walk(el.shadowRoot)
    }
  }
}

/**
 * The site's contents, its layout's `ui-toc` (a page's examples may show contents of their own), or `undefined`:
 * whether it has a box, and its entries (`ui-item` / `a` in its shadow root).
 */
function tocState() {
  const toc = find(document)
  if (!toc) return undefined
  const rect = toc.getBoundingClientRect()
  const style = getComputedStyle(toc)
  return {
    isVisible: rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden",
    entries: toc.shadowRoot?.querySelectorAll("ui-item, a").length ?? 0
  }

  /** The first `ui-toc` straight in a page layout's slot, under `root` or a shadow root there. */
  function find(root: Document | ShadowRoot): Element | undefined {
    const here = [...root.querySelectorAll("ui-toc")].find((el) => !el.closest("spell-example, ui-example"))
    if (here) return here
    for (const el of root.querySelectorAll("*")) {
      const inner = el.shadowRoot && find(el.shadowRoot)
      if (inner) return inner
    }
    return undefined
  }
}

/**
 * Horizontal scroll, and the elements past the right edge, widest first, as `tag.class#id (right px)`:
 * - the deepest (holding no other offender):  what to fix
 * - the outermost:  which region of the page
 *
 * - looks inside open shadow roots too (`host >> inner`);  an `<svg>`'s own shapes count as the `<svg>`
 * - NOTE:  measured against `documentElement.clientWidth`, NEVER `innerWidth`:
 *   with `isMobile`, chromium widens the layout viewport to fit wide content,
 *   so `innerWidth` grows to `scrollWidth` and the overflow reads 0
 * - a box that scrolls sideways itself (a wide table's, a code block's) is fine:  what's inside it isn't counted
 */
function overflowState() {
  const width = document.documentElement.clientWidth
  const offenders: { el: Element; right: number; label: string }[] = []
  const parents = new Set<Element>()
  walk(document, "")
  const overflow = Math.max(document.documentElement.scrollWidth - width, ...offenders.map((o) => o.right - width), 0)
  const found = new Set(offenders.map((offender) => offender.el))
  const deepest = offenders.filter((offender) => !parents.has(offender.el)).sort(widest)
  const outermost = offenders.filter((offender) => !hasOffendingAncestor(offender.el)).sort(widest)
  return {
    overflow,
    offenders: deepest.slice(0, 8).map((offender) => `${offender.label} (${offender.right}px)`),
    outermost: outermost.slice(0, 5).map((offender) => `${offender.label} (${offender.right}px)`)
  }

  /** Sort order:  furthest right first. */
  function widest(a: { right: number }, b: { right: number }) {
    return b.right - a.right
  }

  /** Collect the offenders under `root`;  `prefix` names the shadow host it's in. */
  function walk(root: Document | ShadowRoot, prefix: string) {
    for (const el of root.querySelectorAll("*")) {
      if (el instanceof SVGElement && el.localName !== "svg") continue
      if (isInsideSideScroller(el)) continue
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.right > width + 1) {
        offenders.push({ el, right: Math.round(rect.right), label: prefix + describe(el) })
        markParents(el)
      }
      if (el.shadowRoot) walk(el.shadowRoot, `${prefix}${describe(el)} >> `)
    }
  }

  /** Whether a box around `el` (in its own tree) scrolls or clips sideways, so `el` can't widen the page. */
  function isInsideSideScroller(el: Element) {
    for (let node = el.parentElement; node; node = node.parentElement) {
      const overflow = getComputedStyle(node).overflowX
      if (overflow !== "visible") return true
    }
    return false
  }

  /** Whether an ancestor of `el`, across shadow boundaries, is an offender too. */
  function hasOffendingAncestor(el: Element) {
    let node: Node | null = el.parentNode
    while (node) {
      if (node instanceof ShadowRoot) node = node.host
      if (node instanceof Element && found.has(node)) return true
      node = node.parentNode
    }
    return false
  }

  /** Mark every ancestor of `el`, across shadow boundaries, as holding an offender. */
  function markParents(el: Element) {
    let node: Node | null = el.parentNode
    while (node) {
      if (node instanceof ShadowRoot) node = node.host
      if (node instanceof Element) parents.add(node)
      node = node.parentNode
    }
  }

  /** `tag.class.class#id`, at most two classes. */
  function describe(el: Element) {
    const classes = [...el.classList].slice(0, 2).map((name) => `.${name}`)
    return `${el.localName}${classes.join("")}${el.id ? `#${el.id}` : ""}`
  }
}

/**
 * The nav's state, as one string to compare before and after its button's click:
 * every `ui-page-layout`'s `drawer` and `open` attributes, and which `ui-flyout` / `ui-sidebar` show.
 */
function navState(): string {
  const parts: string[] = []
  walk(document)
  return parts.join(" ")

  /** Read them under `root`, and in the shadow roots there. */
  function walk(root: Document | ShadowRoot) {
    for (const el of root.querySelectorAll("*")) {
      if (el.localName === "ui-page-layout")
        parts.push(`layout:${el.getAttribute("drawer")}:${el.getAttribute("open")}:${el.className}`)
      if (/^ui-(flyout|sidebar)$/.test(el.localName)) parts.push(`${el.localName}:${(el as HTMLElement).hidden}`)
      if (el.shadowRoot) walk(el.shadowRoot)
    }
  }
}
