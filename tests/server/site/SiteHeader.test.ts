import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { chromium, type Browser, type Page } from "playwright"
import { build } from "vite"
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test"

import { PageServer } from "spell/server/page"
import type { SiteTab } from "spell/server/site/site.types"

/**
 * `<spell-site-header>` in headless Chromium, on pages the page server serves (epic `epic-engine` I42, I43).
 * - the header, bundled from its source (`build()`, into the checkout as `/site.js`), as the docs bundle defines it
 * - a checkout of its own, its content folder beside it (`PageServer.serveContent()`), as spell-app's
 */
const SOURCE = resolve(import.meta.dirname, "../../../src/server/site/SiteHeader.ts")

const main = mkdtempSync(join(tmpdir(), "srv-header-"))
const content = `${main}.epics`
let server: PageServer
let browser: Browser

/** the site header's tabs, as the checkout's settings name them (`"siteTabs"`) */
const SERVED_TABS: SiteTab[] = [
  { name: "Guides", path: "guides/index.html", areas: ["guides"] },
  { name: "Kit", path: "/components/kit/", sets: ["kit"] },
  { name: "Tool", path: "/tool/", ownTab: true, paths: ["^/tool(/|$)"] }
]

/** the worktrees' folder:  `/worktrees/<w>/` serves its `<w>/` (`PageServer.serveWorktrees()`) */
const worktrees = `${main}.worktrees`

/**
 * A page loading the header, at `file`, with a root link to the checkout's code (epic `epic-engine` P46).
 * - `site`:  the header's script, as the page loads it
 */
function put(file: string, site = "/site.js"): void {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(
    file,
    `<!doctype html><html><head><title>T</title><script src="${site}"></script></head>` +
      `<body><spell-site-header></spell-site-header><p>page <a id="code" href="/docs/own.html">code</a> ` +
      `<a id="api" href="/api/server">api</a></p></body></html>\n`
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
  put(join(worktrees, "w1", "docs", "own.html"))
  // the Kit tab's component set, served:  a tab naming only sets the server doesn't serve is left out
  const componentSets = { kit: { name: "Kit", dir: "docs", assets: "docs" } }
  writeFileSync(join(main, "package.json"), JSON.stringify({ pageServer: { siteTabs: SERVED_TABS, componentSets } }))
  server = await new PageServer({ root: main }).start({ port: 0, routes: false, pidFile: false })
  server.serveContent(content)
  server.serveWorktrees(worktrees)
  browser = await chromium.launch()
}, 120_000)

afterAll(async () => {
  await browser?.close()
  await server?.stop()
  for (const dir of [main, content, worktrees]) rmSync(dir, { recursive: true, force: true })
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

  it("a worktree's page (`/worktrees/<w>/`):  its repo paths stay in the worktree, a server route doesn't", async () => {
    const page = await opened("/worktrees/w1/docs/own.html")
    expect(await tabsOf(page)).toEqual([
      { name: "Guides", href: "/worktrees/w1/guides/index.html", lit: false, target: null },
      { name: "Kit", href: "/components/kit/", lit: false, target: null },
      { name: "Tool", href: "/tool/", lit: false, target: "spell-tool" }
    ])
    await page.close()
  })
})

// epic `epic-engine` P46:  a page's root links mean the checkout serving it (Owen's Q6)
describe("a worktree page's root links (the live client's `worktreeHref()`)", () => {
  /** `id`'s href on the page at `path`, after it's pressed */
  async function pressed(path: string, id: string): Promise<string | null> {
    const page = await opened(path)
    await page.waitForFunction(() => (window as { __spellLive?: boolean }).__spellLive)
    // pressed, not followed:  the link is rewritten on the way down
    await page.dispatchEvent(`#${id}`, "pointerdown")
    const href = await page.getAttribute(`#${id}`, "href")
    await page.close()
    return href
  }

  it("lays a root link under the worktree as it's pressed", async () => {
    expect(await pressed("/worktrees/w1/docs/own.html", "code")).toBe("/worktrees/w1/docs/own.html")
  })

  it("leaves it alone on main's own pages, and a server route anywhere", async () => {
    expect(await pressed("/docs/own.html", "code")).toBe("/docs/own.html")
    expect(await pressed("/worktrees/w1/docs/own.html", "api")).toBe("/api/server")
  })
})
