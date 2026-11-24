import type { PerfPageName, PerfProfileName, PerfServers } from "./perf.types"
import { PerfBrowser, median, type DomCensus, type LoadTimes, type PerfMetrics } from "./PerfBrowser"

/**
 * A page loaded cold, `runs` times, and measured:  the medians, and what the first load fetched.
 * - load:  first paint, largest paint, ready, TTI-like (the last long task before 3s with none), long tasks, TBT-like
 * - bytes:  every script and every file fetched, raw and brotli'd (what a host that compresses would send),
 *   and what really crossed the network (`wireLoaded`:  the servers compress, epic `solid-2-final` P2)
 * - memory:  the heap, DOM nodes and listeners, after load and after a forced garbage collection
 * - the DOM:  elements through shadow roots, custom elements, shadow roots, their adopted sheets
 * - a WARM visit too, once:  the same page again in the same browser, and what it fetched past the browser's cache
 *   (`warmBrotli`), the warm-visit budget's number:  what crossed the network (a "not modified" answer, its headers),
 *   its body brotli'd only where Chrome didn't say
 * - the live-reload messages the page got while it loaded (`liveMessages`):  each one used to make the live client
 *   walk every script (epic `solid-2-final` P1)
 * - the network (epic `solid-2-final` P14):  how many files came by each protocol (`h2`, `http/1.1`), and how long
 *   they waited to be sent (`waitMs`, summed;  `waitMaxMs`, the longest):  HTTP/1.1 shares 6 connections a host
 */
export class LoadMeasure {
  /** Load `page` under `profile` `runs` times;  never throws for a page that won't get ready:  its run says why. */
  static async measure(
    page: PerfPageName,
    profile: PerfProfileName,
    servers: PerfServers,
    runs: number,
    say: (line: string) => void
  ): Promise<LoadResult> {
    const results: LoadRun[] = []
    for (let run = 1; run <= runs; run++) {
      const browser = await PerfBrowser.open(page, profile, servers)
      try {
        results.push(await within(RUN_LIMIT_MS, LoadMeasure.once(browser, run, say)))
      } finally {
        await browser.close()
      }
    }
    return LoadMeasure.summary(page, profile, runs, results)
  }

  /** One cold load of `browser`'s page, measured;  never throws for a page that won't get ready:  it says why. */
  static async once(browser: PerfBrowser, run: number, say: (line: string) => void): Promise<LoadRun> {
    const { name: page } = browser.spec
    const { name: profile } = browser.profile
    let times: LoadTimes | undefined
    let error: string | undefined
    try {
      times = await browser.load()
    } catch (failed) {
      error = String(failed).slice(0, 200)
    }
    const afterLoad = await browser.metrics()
    const afterGC = await browser.metricsAfterGC()
    const census = await browser.census()
    await browser.sized()
    const fetched = [...browser.responses.values()]
    const scripts = fetched.filter((response) => response.type === "script")
    const sum = (list: typeof fetched, key: "raw" | "brotli" | "wire") =>
      list.reduce((total, response) => total + (response[key] ?? 0), 0)
    const fromNetwork = fetched.filter((response) => response.protocol)
    const protocols: Record<string, number> = {}
    for (const response of fromNetwork) protocols[response.protocol!] = (protocols[response.protocol!] ?? 0) + 1
    const waits = fromNetwork.map((response) => response.waitMs ?? 0)
    const warmBrotli = run === 1 ? await LoadMeasure.warmVisit(browser) : undefined
    const result: LoadRun = {
      run,
      times,
      error,
      requests: fetched.length,
      raw: sum(fetched, "raw"),
      brotliLoaded: sum(fetched, "brotli"),
      wireLoaded: sum(fetched, "wire"),
      jsRequests: scripts.length,
      jsRaw: sum(scripts, "raw"),
      jsBrotli: sum(scripts, "brotli"),
      warmBrotli,
      afterLoad,
      afterGC,
      census,
      errors: browser.errors.slice(0, 10),
      writesBlocked: browser.writesBlocked.length,
      liveMessages: browser.liveMessages,
      protocols,
      waitMs: waits.reduce((total, wait) => total + wait, 0),
      waitMaxMs: Math.max(0, ...waits)
    }
    say(
      `  ${page}/${profile} run ${run}:  ready ${times?.readyAt?.toFixed(0) ?? error}ms  ` +
        `tti ${times?.tti.toFixed(0)}  js ${scripts.length} files ${kbOf(result.jsBrotli)} brotli  ` +
        `heap ${kbOf(afterGC.JSHeapUsedSize)} after GC  nodes ${afterGC.Nodes}  ` +
        `${Object.entries(protocols)
          .map(([protocol, count]) => `${protocol} ${count}`)
          .join(", ")}  ` +
        `waits ${result.waitMs.toFixed(0)}ms (longest ${result.waitMaxMs.toFixed(0)})`
    )
    return result
  }

  /** A page's loads summed up:  the medians, the first load's bytes and census. */
  static summary(page: PerfPageName, profile: PerfProfileName, runs: number, results: LoadRun[]): LoadResult {
    const first = results[0]!
    const timeOf = (key: keyof LoadTimes) => median(results.map((result) => result.times?.[key]))
    const metricOf = (when: "afterLoad" | "afterGC", key: keyof PerfMetrics) =>
      median(results.map((result) => result[when][key]))
    return {
      page,
      profile,
      runs,
      median: {
        fcp: timeOf("fcp"),
        lcp: timeOf("lcp"),
        readyAt: timeOf("readyAt"),
        tti: timeOf("tti"),
        tbt: timeOf("tbt"),
        longTaskTotal: timeOf("longTaskTotal"),
        longTaskCount: timeOf("longTaskCount"),
        longestTask: timeOf("longestTask"),
        heapAfterLoad: metricOf("afterLoad", "JSHeapUsedSize"),
        heapAfterGC: metricOf("afterGC", "JSHeapUsedSize"),
        nodesAfterGC: metricOf("afterGC", "Nodes"),
        listenersAfterGC: metricOf("afterGC", "JSEventListeners"),
        scriptDuration: metricOf("afterLoad", "ScriptDuration"),
        layoutDuration: metricOf("afterLoad", "LayoutDuration"),
        styleDuration: metricOf("afterLoad", "RecalcStyleDuration"),
        waitMs: median(results.map((result) => result.waitMs)),
        waitMaxMs: median(results.map((result) => result.waitMaxMs))
      },
      bytes: {
        requests: first.requests,
        raw: first.raw,
        brotliLoaded: first.brotliLoaded,
        wireLoaded: first.wireLoaded,
        jsRequests: first.jsRequests,
        jsRaw: first.jsRaw,
        jsBrotli: first.jsBrotli,
        warmBrotli: first.warmBrotli
      },
      census: first.census,
      errors: first.errors.length,
      liveMessages: first.liveMessages,
      protocols: first.protocols,
      results
    }
  }

  /**
   * The same page again in the same browser, once ready:  the brotli bytes of what it fetched past the browser's
   * cache.  NEVER throws:  `undefined` when it won't load again.
   */
  static async warmVisit(browser: PerfBrowser): Promise<number | undefined> {
    browser.forgetResponses()
    try {
      await browser.load({ quietMs: 1000 })
    } catch {
      return undefined
    }
    await browser.sized()
    return [...browser.responses.values()]
      .filter((response) => !response.fromCache)
      .reduce((total, response) => total + (response.wire ?? response.brotli ?? 0), 0)
  }
}

/** The most one load may take, ms:  a page that hangs (a body never ending, a stuck page) fails its step instead. */
const RUN_LIMIT_MS = 6 * 60_000

/** `work`, or a rejection once `ms` have passed. */
function within<T>(ms: number, work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const late = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`didn't finish in ${Math.round(ms / 60_000)} minutes`)), ms)
  })
  work.catch(() => {})
  return Promise.race([work, late]).finally(() => clearTimeout(timer))
}

/** `bytes` as KB, for a progress line. */
function kbOf(bytes: number): string {
  return `${Math.round(bytes / 1024)} KB`
}

/** One cold load of a page. */
export type LoadRun = {
  run: number
  times?: LoadTimes
  /** why it never got ready */
  error?: string
  requests: number
  raw: number
  brotliLoaded: number
  /** what crossed the network, headers included:  as the server sent it */
  wireLoaded: number
  jsRequests: number
  jsRaw: number
  jsBrotli: number
  /**
   * a warm visit's bytes past the cache, as they crossed the network (a "not modified" answer, its headers), brotli'd
   * only where Chrome didn't say;  the first run only
   */
  warmBrotli?: number
  afterLoad: PerfMetrics
  afterGC: PerfMetrics
  census: DomCensus
  errors: string[]
  writesBlocked: number
  liveMessages: number
  /** how many files came by each protocol (`h2`, `http/1.1`), the cache's left out (epic `solid-2-final` P14) */
  protocols: Record<string, number>
  /** every file's wait to be sent, summed (`PerfResponse.waitMs`):  what sharing 6 connections costs */
  waitMs: number
  /** the longest one wait */
  waitMaxMs: number
}

/** A page's loads under one profile:  the medians, the first load's bytes and census, and every run. */
export type LoadResult = {
  page: PerfPageName
  profile: PerfProfileName
  runs: number
  median: Record<string, number | undefined>
  bytes: Record<string, number | undefined>
  census: DomCensus
  errors: number
  liveMessages: number
  /** the first load's files by protocol */
  protocols: Record<string, number>
  results: LoadRun[]
}
