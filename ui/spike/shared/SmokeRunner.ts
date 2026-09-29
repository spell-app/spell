/// <reference types="node" />

import { writeFileSync } from "node:fs"
import { isAbsolute, join, relative } from "node:path"
import { chromium, type Browser } from "playwright"

import type { ImportMap, PageResult, SmokePage, SmokePageKind, SmokeResults } from "./shared.types.ts"
import { SharedBuild } from "./SharedBuild.ts"
import { StaticServer } from "./StaticServer.ts"

/**
 * Runs the import-map smoke pages for one spike in headless chromium, against its BUILT `dist/` and vendored
 * peers, and writes `smoke-results.json`.
 * - ONE static server (`StaticServer`), no Vite dev server:
 *   - `/shared/` => `spike/shared/` (host pages `frameworks/*.html`, `PerfRun.ts`, the compiled Solid app, the
 *     shared vendored Solid at `/shared/vendor/`)
 *   - `/dist/`, `/vendor/` => the spike's `dist/` and vendored peers
 *   - `/spike/` => the spike root, for its extra pages
 * - Every page gets ONE import map:  the shared one (`solid-js`, `@solidjs/web` => `/shared/vendor/`), overridden
 *   by the spike's `importMap` (its peers, `@spell/ui/...` => `/dist/...`, and on a Solid spike its OWN
 *   `solid-js` / `@solidjs/web`, so the host app and the components share one copy).
 * - Pages:  the four shared hosts (`vanilla`, `react`, `vue`, `solid`), the shared perf page when the spike
 *   passes a `perfAdapter`, then the spike's `pages`.  Each page publishes `window.smokeResult` (`PageResult`).
 * - Offline except the framework CDNs:  requests to any other host are aborted and reported as errors.
 */
export class SmokeRunner {
  /** Shared host pages, in run order. */
  static readonly HOSTS = ["vanilla", "react", "vue", "solid"] as const
  /** Hosts a page may reach besides the local server:  React from esm.sh, Vue from unpkg. */
  static readonly CDN_HOSTS = ["esm.sh", "unpkg.com"]

  readonly options: SmokeRunnerOptions

  constructor(options: SmokeRunnerOptions) {
    this.options = options
  }

  ////////////////
  // ## Run
  ////////////////

  /** Run every page, write `smoke-results.json`, print one line per page;  resolves with the results. */
  async run(): Promise<SmokeResults> {
    const server = await this.server()
    const origin = await server.listen(this.options.port ?? 0)
    const browser = await chromium.launch()
    const version = browser.version()
    const pages: SmokePage[] = []
    try {
      for (const [path, kind] of this.pagePaths()) {
        const page = await this.visit(browser, origin, path, kind)
        pages.push(page)
        const failed = Object.entries(page.checks).filter(([, value]) => value === false)
        console.log(
          `${page.ok ? "PASS" : "FAIL"} ${path} (${page.label})`,
          failed.length ? failed.map(([key]) => key) : "",
          page.errors.length ? page.errors : ""
        )
      }
    } finally {
      await browser.close()
      await server.close()
    }
    const results: SmokeResults = {
      spike: this.options.spike,
      date: new Date().toISOString().slice(0, 10),
      browser: `chromium ${version}`,
      pages
    }
    writeFileSync(join(this.options.root, "smoke-results.json"), `${JSON.stringify(results, null, 2)}\n`)
    return results
  }

  /** Serve the pages for a person:  prints each URL, runs until killed. */
  async serve(port = 5199): Promise<void> {
    const origin = await (await this.server()).listen(port)
    for (const [path] of this.pagePaths()) console.log(`${origin}${path}`)
  }

  ////////////////
  // ## Pages
  ////////////////

  /** Served path and kind of every page, in run order. */
  private pagePaths(): [string, SmokePageKind][] {
    const paths: [string, SmokePageKind][] = SmokeRunner.HOSTS.map((host) => [
      `/shared/frameworks/${host}.html`,
      "host"
    ])
    if (this.options.perfAdapter) paths.push(["/shared/frameworks/perf.html", "perf"])
    for (const page of this.options.pages ?? []) paths.push([`/spike/${this.relative(page.path)}`, page.kind])
    return paths
  }

  /** Load one page and collect its `window.smokeResult`, console errors and warnings. */
  private async visit(browser: Browser, origin: string, path: string, kind: SmokePageKind): Promise<SmokePage> {
    const page = await browser.newPage()
    const errors: string[] = []
    const warnings: string[] = []
    page.on("pageerror", (error) => errors.push(`uncaught: ${error.message}`))
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text())
      if (message.type() === "warning") warnings.push(message.text())
    })
    await page.route("**/*", (route) => {
      const host = new URL(route.request().url()).hostname
      if (host === "127.0.0.1" || SmokeRunner.CDN_HOSTS.some((cdn) => host === cdn || host.endsWith(`.${cdn}`))) {
        return route.continue()
      }
      errors.push(`blocked (offline):  ${route.request().url()}`)
      return route.abort()
    })
    let result: PageResult
    try {
      await page.goto(`${origin}${path}`)
      await page.waitForFunction(() => "smokeResult" in window, null, { timeout: kind === "perf" ? 120_000 : 45_000 })
      result = await page.evaluate(() => (window as unknown as { smokeResult: PageResult }).smokeResult)
    } catch (error) {
      const text = await page.textContent("#result").catch(() => null)
      result = {
        ok: false,
        label: path,
        checks: { timeout: `${(error as Error).message.split("\n")[0]}`, result: text }
      }
    }
    const title = await page.title()
    await page.close()
    const ok = result.ok && !errors.some((error) => error.startsWith("uncaught") || error.startsWith("blocked"))
    return { ...result, ok, path, title, kind, errors, warnings }
  }

  ////////////////
  // ## Server
  ////////////////

  /** The static server with every mount and the merged import map. */
  private async server(): Promise<StaticServer> {
    const shared = await SharedBuild.ensure()
    const { root, importMap, perfAdapter } = this.options
    const imports: ImportMap["imports"] = { ...shared.imports, ...importMap.imports }
    if (perfAdapter) imports["@spell/ui-spike/perf-adapter"] = `/spike/${this.relative(perfAdapter)}`
    return new StaticServer(
      {
        "/shared/": SharedBuild.ROOT,
        "/dist/": join(root, this.options.dist ?? "dist"),
        "/vendor/": join(root, this.options.vendor ?? "vendor"),
        "/spike/": root
      },
      { imports }
    )
  }

  /** `path` relative to the spike root, forward slashes. */
  private relative(path: string): string {
    return (isAbsolute(path) ? relative(this.options.root, path) : path).split("\\").join("/")
  }
}

/** Constructor options of `SmokeRunner`. */
export type SmokeRunnerOptions = {
  /** display name, e.g. `Lit` */
  spike: string
  /** spike root, absolute;  `smoke-results.json` is written here */
  root: string
  /** built library, relative to `root`;  default `dist` (served at `/dist/`) */
  dist?: string
  /** vendored peers, relative to `root`;  default `vendor` (served at `/vendor/`) */
  vendor?: string
  /**
   * The spike's import map entries:  its peers (usually `vendor/importmap.json`) and `@spell/ui`,
   * `@spell/ui/<family>` => `/dist/...`.  Overrides the shared entries.
   */
  importMap: ImportMap
  /**
   * Module exporting `adapter: PerfAdapter` (e.g. `demo/smoke/perf-adapter.js`), relative to `root`;  mapped as
   * `@spell/ui-spike/perf-adapter` for the shared perf page.  Omit to skip the perf page.
   */
  perfAdapter?: string
  /** the spike's own pages, relative to `root` (served under `/spike/`), each publishing `window.smokeResult` */
  pages?: { path: string; kind: SmokePageKind }[]
  /** server port;  default any free one */
  port?: number
}
