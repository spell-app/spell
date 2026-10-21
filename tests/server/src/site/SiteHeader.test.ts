import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { chromium, type Browser, type Page } from "playwright"
import { build } from "vite"
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test"

import { PageServer } from "$/server/page"
import type { SiteTab } from "$/server/site/site.types"

/**
 * `<spell-site-header>` in headless Chromium, on pages the page server serves (epic `epic-engine` I42, I43).
 * - the header, bundled from its source (`build()`, into the checkout as `/site.js`), as the docs bundle defines it
 * - a checkout of its own, its content folder beside it (`PageServer.serveContent()`), as spell-app's
 */
const SOURCE = resolve(import.meta.dirname, "../../../../server/src/site/SiteHeader.ts")

const main = mkdtempSync(join(tmpdir(), "srv-header-"))
const content = `${main}.epics`
let server: PageServer
let browser: Browser

/** the site header's tabs, as the checkout's settings name them (`"siteTabs"`) */
const SERVED_TABS: SiteTab[] = [
  { name: "Guides", path: "guides/index.html", areas: ["guides"] },
  { name: "Kit", path: "/components/kit/", serverOnly: true, sets: ["kit"] },
  { name: "Tool", path: "/tool/", serverOnly: true, ownTab: true, paths: ["^/tool(/|$)"] }
]

/** the tabs a page's bundle gives (`defineSite({ tabs })`), for a page whose server names none:  `file://` */
const FALLBACK_TABS: SiteTab[] = [
  { name: "Notes", path: "notes/index.html", areas: ["notes"] },
  { name: "Kit", path: "/components/kit/", serverOnly: true, sets: ["kit"] }
]

/**
 * A page loading the header, at `file`.
 * - `site`:  the header's script, as the page loads it
 * - the bundle's tabs as `defineSite({ tabs })` sets them, before the header upgrades:  `FALLBACK_TABS`
 */
function put(file: string, site = "/site.js"): void {
  mkdirSync(dirname(file), { recursive: true })
  const fallback = `<script>SiteHeaderTest.SiteHeader.fallbackTabs = ${JSON.stringify(FALLBACK_TABS)}</script>`
  writeFileSync(
    file,
    `<!doctype html><html><head><title>T</title><script src="${site}"></script>${fallback}</head>` +
      `<body><spell-site-header root=".."></spell-site-header><p>page</p></body></html>\n`
  )
}

beforeAll(async () => {
  await build({
    configFile: false,
    logLevel: "silent",
    resolve: { tsconfigPaths: true },
    build: {
      outDir: main,
      emptyOutDir: false,
      minify: false,
      lib: {
        entry: SOURCE,
        formats: ["iife"],
        name: "SiteHeaderTest",
        fileName: () => "site.js"
      },
      rollupOptions: { output: { footer: "SiteHeaderTest.SiteHeader.define()" } }
    }
  })
  put(join(main, "docs", "own.html"))
  put(join(content, "guides", "guide.html"))
  put(join(main, "notes", "note.html"), "../site.js")
  writeFileSync(join(main, "package.json"), JSON.stringify({ pageServer: { siteTabs: SERVED_TABS } }))
  server = await new PageServer({ root: main }).start({ port: 0, routes: false, pidFile: false })
  server.serveContent(content)
  browser = await chromium.launch()
}, 120_000)

afterAll(async () => {
  await browser?.close()
  await server?.stop()
  for (const dir of [main, content]) rmSync(dir, { recursive: true, force: true })
})

/** `path`, opened in a new page wide enough for every button (VS Code's side bar is narrower:  it hides the badge) */
async function opened(path: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1200, height: 600 } })
  await page.goto(`http://127.0.0.1:${server.info.port}${path}`)
  await page.waitForFunction(() => !!document.querySelector("spell-site-header")?.shadowRoot?.querySelector("header"))
  return page
}

/** the "open in VS Code" link's address */
function vscodeLink(page: Page): Promise<string | null | undefined> {
  return page.evaluate(() =>
    document
      .querySelector("spell-site-header")
      ?.shadowRoot?.querySelector(`a.tool[href^="vscode:"]`)
      ?.getAttribute("href")
  )
}

describe("<spell-site-header>'s open in VS Code (I42)", () => {
  it("opens a content folder's page in the content folder, not the checkout", async () => {
    const page = await opened("/guides/guide.html")
    expect(await vscodeLink(page)).toBe(`vscode://file${encodeURI(join(content, "guides", "guide.html"))}`)
    await page.close()
  })

  it("opens a checkout's own page in the checkout", async () => {
    const page = await opened("/docs/own.html")
    expect(await vscodeLink(page)).toBe(`vscode://file${encodeURI(join(main, "docs", "own.html"))}`)
    await page.close()
  })
})

describe("<spell-site-header>'s icon buttons (I43)", () => {
  // VS Code's side bar (Electron) shows a `title` only on the element under the pointer ITSELF, not its parent:
  // headless Chromium can't show a native tooltip, so check what's under each button's centre
  it("put the pointer on the titled link or button itself, not its icon", async () => {
    const page = await opened("/guides/guide.html")
    const buttons = await page.evaluate(() => {
      const host = document.querySelector("spell-site-header")!
      const shadow = host.shadowRoot!
      return [...shadow.querySelectorAll<HTMLElement>(".brand, .tool")].map((button) => {
        const box = button.getBoundingClientRect()
        const [x, y] = [box.x + box.width / 2, box.y + box.height / 2]
        const under = shadow.elementFromPoint(x, y)
        return {
          title: button.title,
          under: under === button ? "itself" : under?.tagName.toLowerCase(),
          // the page sees the header, as for any shadow DOM
          page: document.elementFromPoint(x, y) === host
        }
      })
    })
    expect(buttons.map(({ title }) => title)).toEqual([
      "Spell docs",
      "Edit sections in place",
      "Open the source in VS Code",
      expect.stringMatching(/^(Light|Dark)/)
    ])
    for (const button of buttons) expect(button, button.title).toMatchObject({ under: "itself", page: true })
    await page.close()
  })
})

/** The header's tabs on `page`:  each one's label, address, whether it's lit, and its target. */
function tabsOf(page: Page) {
  return page.evaluate(() =>
    [...document.querySelector("spell-site-header")!.shadowRoot!.querySelectorAll<HTMLElement>(".tab")].map((tab) => ({
      name: tab.textContent,
      href: tab.getAttribute("href"),
      lit: tab.getAttribute("aria-current") === "page",
      target: tab.getAttribute("target")
    }))
  )
}

// epic `repo-split` I4:  the header names no site's parts;  its tabs are data
describe("<spell-site-header>'s tabs (I4)", () => {
  it("served:  the tabs the server's settings name (`SPELL_SERVER.siteTabs`), never the bundle's", async () => {
    const page = await opened("/guides/guide.html")
    expect(await tabsOf(page)).toEqual([
      { name: "Guides", href: "/guides/index.html", lit: true, target: null },
      { name: "Kit", href: "/components/kit/", lit: false, target: null },
      { name: "Tool", href: "/tool/", lit: false, target: "spell-tool" }
    ])
    await page.close()
  })

  it("from disk:  the bundle's (`defineSite({ tabs })`), a server-only one greyed out", async () => {
    const page = await browser.newPage({ viewport: { width: 1200, height: 600 } })
    await page.goto(`file://${join(main, "notes", "note.html")}`)
    await page.waitForFunction(() => !!document.querySelector("spell-site-header")?.shadowRoot?.querySelector("header"))
    expect(await tabsOf(page)).toEqual([
      { name: "Notes", href: "../notes/index.html", lit: true, target: null },
      { name: "Kit", href: null, lit: false, target: null }
    ])
    await page.close()
  })
})
