import { brotliCompressSync } from "node:zlib"
import type { Browser, BrowserContextOptions, CDPSession, Page } from "playwright"

import { BrowserPage } from "spell/element-tools/BrowserPage"
import {
  PERF_PAGES,
  PERF_PROFILES,
  type PerfPage,
  type PerfPageName,
  type PerfProfile,
  type PerfProfileName,
  type PerfServers
} from "./perf.types"

/****************
 * ### `PerfBrowser`
 * One measured page, opened COLD in headless Chromium under a profile:  a new browser and context every time,
 * its CPU and network slowed as the profile says (Chrome's own emulation), and what the page did recorded from
 * before its own scripts run.
 * - `open()`, then `goto()`, then `waitReadyAndQuiet()`;  `close()` after.
 * - What it records in the page, `window.__perf` (`PERF_INIT`):  first paint, largest paint, long tasks, every event's
 *   timing, and when the page's `ready` test first held.
 * - Every response's size, and its body brotli'd, as a host that compresses would send it (`responses`).
 * - Writes from a page that `blockWrites` (the editor) are answered `{}`:  nothing on disk changes.
 * - Its position:  the app's command line, node only;  Playwright through the kit's `BrowserPage`.
 ****************/
export class PerfBrowser {
  /** the browser, this page's alone */
  readonly browser: Browser

  /** the page */
  readonly page: Page

  /** Chrome's devtools session on it:  its metrics, heap, profiler */
  readonly cdp: CDPSession

  /** what's measured */
  readonly spec: PerfPage

  /** how it's measured */
  readonly profile: PerfProfile

  /** where the addresses start */
  readonly servers: PerfServers

  /** each write the page tried, refused (`blockWrites`) */
  readonly writesBlocked: string[] = []

  /** uncaught errors and console errors, the first 300 characters of each */
  readonly errors: string[] = []

  /** every response the page got, by URL:  its type and sizes */
  readonly responses = new Map<string, PerfResponse>()

  /** the response bodies being read and sized (`sized()`) */
  private readonly reading = new Set<Promise<void>>()

  /** live-reload messages the page got over the page server's socket */
  liveMessages = 0

  private constructor({ browser, page, cdp, spec, profile, servers }: PerfBrowserProps) {
    this.browser = browser
    this.page = page
    this.cdp = cdp
    this.spec = spec
    this.profile = profile
    this.servers = servers
  }

  /**
   * A cold page of `pageName` under `profileName`, not loaded yet.
   * - `context`:  more of the context's settings (`reducedMotion` ...)
   */
  static async open(
    pageName: PerfPageName,
    profileName: PerfProfileName,
    servers: PerfServers,
    { context = {} }: { context?: BrowserContextOptions } = {}
  ): Promise<PerfBrowser> {
    const spec = PERF_PAGES[pageName]
    const profile = PERF_PROFILES[profileName]
    const browser = await BrowserPage.launch({ args: ["--js-flags=--expose-gc", "--enable-precise-memory-info"] })
    const page = await browser.newPage({ ...(await contextFor(profile)), ...context })
    await page.addInitScript(BrowserPage.NAME_HELPER)
    const cdp = await page.context().newCDPSession(page)
    await cdp.send("Performance.enable", { timeDomain: "timeTicks" })
    await cdp.send("Network.enable")
    if (profile.cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: profile.cpu })
    if (profile.network) await cdp.send("Network.emulateNetworkConditions", profile.network)
    const opened = new PerfBrowser({ browser, page, cdp, spec, profile, servers })
    await opened.watch()
    return opened
  }

  /** Go to the page, and wait for it to be ready and quiet (`waitReadyAndQuiet()`). */
  async load(quiet?: QuietProps): Promise<LoadTimes> {
    await this.page.goto(this.spec.url(this.servers), { timeout: 180_000, waitUntil: "commit" })
    return this.waitReadyAndQuiet(quiet)
  }

  /**
   * Wait for the page to be ready, then for a quiet spell:  `quietMs` with no new long task (capped at `capMs`).
   * - `tti`:  the end of the last long task, or ready;  `tbt`:  each long task's time over 50ms, summed
   */
  async waitReadyAndQuiet({ timeout = 180_000, quietMs = 3000, capMs = 60_000 }: QuietProps = {}): Promise<LoadTimes> {
    const { page } = this
    await page.waitForFunction(() => (window as unknown as PerfWindow).__perf.readyAt !== undefined, undefined, {
      timeout,
      polling: 250
    })
    const started = Date.now()
    let lastCount = -1
    let quietSince = Date.now()
    while (Date.now() - started < capMs) {
      const count = await page.evaluate(() => (window as unknown as PerfWindow).__perf.longTasks.length)
      if (count !== lastCount) {
        lastCount = count
        quietSince = Date.now()
      } else if (Date.now() - quietSince >= quietMs) break
      await page.waitForTimeout(250)
    }
    const perf = await page.evaluate(() => ({ ...(window as unknown as PerfWindow).__perf, events: [] }))
    const tasks = perf.longTasks
    const lastEnd = Math.max(0, ...tasks.map((task) => task.start + task.duration))
    return {
      fcp: perf.fcp,
      lcp: perf.lcp,
      readyAt: perf.readyAt,
      tti: Math.max(perf.readyAt ?? 0, lastEnd),
      tbt: tasks.reduce((total, task) => total + Math.max(0, task.duration - 50), 0),
      longTaskTotal: tasks.reduce((total, task) => total + task.duration, 0),
      longTaskCount: tasks.length,
      longestTask: Math.max(0, ...tasks.map((task) => task.duration))
    }
  }

  /** Chrome's `Performance.getMetrics`, the ones reported. */
  async metrics(): Promise<PerfMetrics> {
    const { metrics: list } = await this.cdp.send("Performance.getMetrics")
    const all = Object.fromEntries(list.map(({ name, value }) => [name, value]))
    return Object.fromEntries(METRICS.map((name) => [name, all[name] ?? 0])) as PerfMetrics
  }

  /** A full garbage collection (twice:  what the first frees can free more), then the metrics. */
  async metricsAfterGC(): Promise<PerfMetrics> {
    await this.cdp.send("HeapProfiler.collectGarbage")
    await this.cdp.send("HeapProfiler.collectGarbage")
    return this.metrics()
  }

  /** The page's elements through every open shadow root, and their style sheets (`domCensus()`). */
  census(): Promise<DomCensus> {
    return this.page.evaluate(domCensus)
  }

  /** Every response's body read and sized so far (`responses`).  NEVER throws. */
  async sized(): Promise<void> {
    await Promise.all([...this.reading])
  }

  /** Close the browser.  NEVER throws. */
  async close(): Promise<void> {
    await this.browser.close().catch(() => {})
  }

  /**
   * Set the page up before it loads:  refused writes, its storage, the recorder (`PERF_INIT`), the response sizes.
   * - a body is brotli'd once it's read, by URL;  a body that can't be read (a redirect) is counted by its size alone
   */
  private async watch(): Promise<void> {
    const { page, spec, cdp } = this
    if (spec.blockWrites) {
      await page.route("**/*", (route) => {
        const request = route.request()
        if (WRITES.test(request.method()) && !COMPILES.test(request.url())) {
          this.writesBlocked.push(`${request.method()} ${request.url()}`)
          return route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
        }
        return route.fallback()
      })
    }
    if (spec.storage) {
      await page.addInitScript((storage) => {
        try {
          for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, value)
        } catch {
          // no storage:  the defaults
        }
      }, spec.storage)
    }
    await page.addInitScript(PERF_INIT, spec.ready)
    page.on("pageerror", (error) => this.errors.push(String(error).slice(0, 300)))
    page.on("console", (message) => {
      if (message.type() === "error") this.errors.push(message.text().slice(0, 300))
    })
    page.on("response", (response) => {
      const url = response.url()
      const entry: PerfResponse = { url, type: response.request().resourceType(), status: response.status() }
      this.responses.set(url, entry)
      const read = response.body().then(
        (body) => {
          entry.raw = body.length
          entry.brotli = brotliCompressSync(body).length
        },
        // a redirect, or the page went:  no body
        () => {}
      )
      this.reading.add(read)
      void read.finally(() => this.reading.delete(read))
    })
    cdp.on("Network.responseReceived", ({ response }) => {
      const entry = this.responses.get(response.url)
      if (entry) entry.fromCache = response.fromDiskCache || response.fromServiceWorker
    })
    cdp.on("Network.webSocketFrameReceived", () => this.liveMessages++)
  }
}

/** The metrics `metrics()` reports, from Chrome's. */
const METRICS = [
  "JSHeapUsedSize",
  "JSHeapTotalSize",
  "Nodes",
  "Documents",
  "JSEventListeners",
  "LayoutCount",
  "RecalcStyleCount",
  "LayoutDuration",
  "RecalcStyleDuration",
  "ScriptDuration",
  "TaskDuration"
] as const

/** A request that writes. */
const WRITES = /^(PUT|POST|DELETE|PATCH)$/

/** The writes a page may still make:  asking the server to compile, parse or check, which writes nothing. */
const COMPILES = /\/api\/(compile|parse|check)/

/** The Playwright context options of `profile`:  its device, then its own window. */
async function contextFor(profile: PerfProfile): Promise<BrowserContextOptions> {
  let context: BrowserContextOptions = {}
  if (profile.device) {
    const { devices } = await import("playwright")
    const { defaultBrowserType: _ignored, ...device } = devices[profile.device]!
    context = device
  }
  if (profile.viewport) context = { ...context, viewport: profile.viewport, screen: profile.viewport }
  if (profile.isMobile === false) context = { ...context, isMobile: false, deviceScaleFactor: 2 }
  return context
}

/** The median of `values`, `undefined`s dropped;  `undefined` for none. */
export function median(values: Array<number | undefined>): number | undefined {
  const sorted = values.filter((value): value is number => typeof value === "number" && !Number.isNaN(value))
  sorted.sort((one, other) => one - other)
  if (!sorted.length) return undefined
  const middle = sorted.length >> 1
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1]! + sorted[middle]!) / 2
}

/** The value `share` of the way up `values` (0.9:  the 90th percentile). */
export function percentile(values: number[], share: number): number | undefined {
  const sorted = [...values].sort((one, other) => one - other)
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * share))]
}

////////////////
// ## In the page
////////////////

/**
 * What the page records of itself (`window.__perf`).
 * - `events`:  every event's timing (Event Timing, as INP measures it)
 */
export type PagePerf = {
  fcp?: number
  lcp?: number
  readyAt?: number
  longTasks: Array<{ start: number; duration: number }>
  events: Array<{
    name: string
    start: number
    duration: number
    processing: number
    delay: number
    interactionId?: number
  }>
}

/**
 * The page's window, with what `PERF_INIT` adds:  `(window as unknown as PerfWindow).__perf` in a page function
 * (a helper function wouldn't be there:  Playwright sends only the function's own source)
 */
export type PerfWindow = Window & { __perf: PagePerf }

/**
 * Runs in the page before its own scripts:  records paints, the largest paint, long tasks, events, and when `ready`
 * first holds (`readySource`, a function's source).
 * - MUST stay self-contained:  Playwright sends its source
 */
function PERF_INIT(readySource: string): void {
  const perf: PagePerf = { longTasks: [], events: [] }
  Object.assign(window, { __perf: perf })
  const observe = (type: string, callback: (entry: PerformanceEntry) => void, options = {}) => {
    try {
      new PerformanceObserver((list) => list.getEntries().forEach(callback)).observe({
        type,
        buffered: true,
        ...options
      })
    } catch {
      // a type this browser doesn't have
    }
  }
  observe("paint", (entry) => {
    if (entry.name === "first-contentful-paint") perf.fcp = entry.startTime
  })
  observe("largest-contentful-paint", (entry) => (perf.lcp = entry.startTime))
  observe("longtask", (entry) => perf.longTasks.push({ start: entry.startTime, duration: entry.duration }))
  observe(
    "event",
    (entry) => {
      const timing = entry as PerformanceEventTiming & { interactionId?: number }
      perf.events.push({
        name: timing.name,
        start: timing.startTime,
        duration: timing.duration,
        processing: timing.processingEnd - timing.processingStart,
        delay: timing.processingStart - timing.startTime,
        interactionId: timing.interactionId
      })
    },
    { durationThreshold: 0 }
  )
  // oxlint-disable-next-line typescript/no-implied-eval -- the page's ready test comes as source, from the pages' table
  const ready = new Function(`return (${readySource})()`) as () => boolean
  const timer = setInterval(() => {
    try {
      if (perf.readyAt === undefined && perf.fcp !== undefined && ready()) {
        perf.readyAt = performance.now()
        clearInterval(timer)
      }
    } catch {
      // not yet
    }
  }, 25)
}

/**
 * Walk the page through every open shadow root:  elements, custom elements, shadow roots, and their style sheets.
 * - `adoptedRefs`:  sheets adopted, counted per root;  `uniqueAdopted`:  distinct sheet objects
 *   (a low unique / refs share means instances SHARE their sheets)
 * - closed shadow roots can't be seen
 * - MUST stay self-contained:  Playwright sends its source
 */
function domCensus(): DomCensus {
  let elements = 0
  let customElements = 0
  let shadowRoots = 0
  let adoptedRefs = 0
  let styleElementsInShadow = 0
  const uniqueAdopted = new Set<CSSStyleSheet>()
  const walk = (root: Document | ShadowRoot) => {
    for (const element of root.querySelectorAll("*")) {
      elements++
      if (element.localName.includes("-")) customElements++
      const shadow = element.shadowRoot
      if (!shadow) continue
      shadowRoots++
      adoptedRefs += shadow.adoptedStyleSheets.length
      styleElementsInShadow += shadow.querySelectorAll("style").length
      for (const sheet of shadow.adoptedStyleSheets) uniqueAdopted.add(sheet)
      walk(shadow)
    }
  }
  walk(document)
  for (const sheet of document.adoptedStyleSheets) uniqueAdopted.add(sheet)
  let uniqueCssChars = 0
  for (const sheet of uniqueAdopted) {
    try {
      for (const rule of sheet.cssRules) uniqueCssChars += rule.cssText.length
    } catch {
      // unreadable
    }
  }
  return {
    elements,
    customElements,
    shadowRoots,
    adoptedRefs,
    uniqueAdopted: uniqueAdopted.size,
    uniqueCssChars,
    styleElementsInShadow,
    documentStyleSheets: document.styleSheets.length
  }
}

////////////////
// ## Types
////////////////

/** What `PerfBrowser`'s constructor takes. */
type PerfBrowserProps = Pick<PerfBrowser, "browser" | "page" | "cdp" | "spec" | "profile" | "servers">

/** How long `waitReadyAndQuiet()` waits:  for ready, for quiet, and at most, ms. */
export type QuietProps = { timeout?: number; quietMs?: number; capMs?: number }

/** A load's times, ms from navigation (`waitReadyAndQuiet()`). */
export type LoadTimes = {
  fcp?: number
  lcp?: number
  readyAt?: number
  tti: number
  tbt: number
  longTaskTotal: number
  longTaskCount: number
  longestTask: number
}

/** Chrome's metrics, the ones reported (`METRICS`). */
export type PerfMetrics = Record<(typeof METRICS)[number], number>

/**
 * One response:  its URL, type (`script`, `stylesheet` ...), status;  its body's size raw and brotli'd, when read;
 * `fromCache`:  it came from the browser's cache, not the network
 */
export type PerfResponse = {
  url: string
  type: string
  status: number
  raw?: number
  brotli?: number
  fromCache?: boolean
}

/** What `domCensus()` counts. */
export type DomCensus = {
  elements: number
  customElements: number
  shadowRoots: number
  adoptedRefs: number
  uniqueAdopted: number
  uniqueCssChars: number
  styleElementsInShadow: number
  documentStyleSheets: number
}
