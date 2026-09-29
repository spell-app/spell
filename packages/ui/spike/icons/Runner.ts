import path from "node:path"

import { chromium, type Browser, type CDPSession, type Page } from "playwright"

import { TestServer, type Protocol } from "./TestServer.ts"

/** Emulated network. `local` = untouched loopback;  `net` = 40 ms round trip, 20 Mbit/s down, 10 Mbit/s up. */
export type Profile = "local" | "net"

/** What one page load measured. */
export type Load = {
  /** Requests the browser issued (data: URLs excluded), cache hits included. */
  requests: number
  /** Requests that reached the server (misses + revalidations). */
  served: number
  /** Sum of `encodedDataLength`:  headers + body as sent (gzip), 0 for cache hits. */
  wireBytes: number
  /** Sum of the gzip body sizes the server sent. */
  bodyBytes: number
  /** ms from navigation start to the first / last icon's first frame;  undefined for the baseline (n = 0). */
  firstPaint?: number
  allPainted?: number
  /** ms to the `load` event. */
  loadEvent: number
  /** Paths the server answered, in order. */
  servedPaths: string[]
  errors: string[]
}

/**
 * Drives headless chromium against a `TestServer`.
 * - Cold = fresh context, cache disabled (CDP) and `no-store` from the server.
 * - Warm = same context loads the page once (unmeasured), then again with the HTTP cache on and immutable headers.
 * - Network emulation (`Profile`) goes through CDP `Network.emulateNetworkConditions`.
 */
export class Runner {
  private browser!: Browser
  private readonly server: TestServer
  private readonly origin: string
  private readonly protocol: Protocol

  private constructor(server: TestServer, origin: string, protocol: Protocol) {
    this.server = server
    this.origin = origin
    this.protocol = protocol
  }

  /** Starts a server for `protocol` serving `root` and launches chromium. */
  static async start(root: string, protocol: Protocol): Promise<Runner> {
    const server = new TestServer(root, protocol)
    const origin = await server.listen()
    const runner = new Runner(server, origin, protocol)
    const spki = TestServer.spki(path.join(root, "..", ".tmp"))
    runner.browser = await chromium.launch({ args: [`--ignore-certificate-errors-spki-list=${spki}`] })
    return runner
  }

  async stop(): Promise<void> {
    await this.browser.close()
    await this.server.close()
  }

  /** `variant` page with `n` icons (`two` = the same icons drawn by two bundle copies), measured `cold` or `warm`. */
  async load(variant: string, n: number, mode: "cold" | "warm", profile: Profile, two = false): Promise<Load> {
    const context = await this.browser.newContext({ viewport: { width: 900, height: 500 } })
    try {
      const page = await context.newPage()
      const cdp = await context.newCDPSession(page)
      await cdp.send("Network.enable")
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: mode === "cold" })
      if (profile === "net") {
        await cdp.send("Network.emulateNetworkConditions", {
          offline: false,
          latency: 40,
          downloadThroughput: (20 * 1_000_000) / 8,
          uploadThroughput: (10 * 1_000_000) / 8
        })
      }
      this.server.cache = mode === "cold" ? "off" : "on"
      const url = `${this.origin}/page.html?variant=${variant}&n=${n}&two=${two ? 1 : 0}`
      if (mode === "warm") {
        await this.visit(page, cdp, url, two ? n * 2 : n)
        // NOTE: Chromium commits cache entries asynchronously;  without this pause the second visit sometimes misses.
        await page.waitForTimeout(400)
      }
      return await this.visit(page, cdp, url, two ? n * 2 : n)
    } finally {
      await context.close()
    }
  }

  /** One navigation with counters attached;  waits for `expected` icons to be painted. */
  private async visit(page: Page, cdp: CDPSession, url: string, expected: number): Promise<Load> {
    const requests = new Map<string, string>()
    let wireBytes = 0
    const errors: string[] = []
    const onRequest = (event: { requestId: string; request: { url: string } }) => {
      if (!event.request.url.startsWith("data:")) requests.set(event.requestId, event.request.url)
    }
    const onFinished = (event: { requestId: string; encodedDataLength: number }) => {
      if (requests.has(event.requestId)) wireBytes += event.encodedDataLength
    }
    cdp.on("Network.requestWillBeSent", onRequest)
    cdp.on("Network.loadingFinished", onFinished)
    const onConsole = (message: { type(): string; text(): string }) => {
      if (message.type() === "error") errors.push(message.text())
    }
    page.on("console", onConsole)
    this.server.resetHits()
    await page.goto(url, { waitUntil: "load" })
    if (expected > 0) {
      await page.waitForFunction(
        (count) => (window as never as { __iconPainted?: number[] }).__iconPainted?.length === count,
        expected,
        {
          timeout: 20000
        }
      )
    }
    await page.waitForLoadState("networkidle")
    const timing = await page.evaluate(() => {
      const painted = ((window as never as { __iconPainted?: number[] }).__iconPainted ?? [])
        .slice()
        .sort((a, b) => a - b)
      const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming
      return { first: painted[0], last: painted.at(-1), load: navigation.loadEventEnd }
    })
    cdp.off("Network.requestWillBeSent", onRequest)
    cdp.off("Network.loadingFinished", onFinished)
    page.off("console", onConsole)
    return {
      requests: requests.size,
      served: this.server.hits.length,
      wireBytes,
      bodyBytes: this.server.hits.reduce((sum, hit) => sum + hit.bytes, 0),
      firstPaint: timing.first,
      allPainted: timing.last,
      loadEvent: timing.load,
      servedPaths: this.server.hits.map((hit) => hit.path),
      errors
    }
  }

  /** Protocol this runner serves. */
  get name(): Protocol {
    return this.protocol
  }
}
