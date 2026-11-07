import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { chromium, type Browser, type BrowserContext, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

/**
 * A SITE in the editor's Run (epic `mockup` P2):  the page its address names, a button going to another page, the
 * browser's back button, and making a page an address had none for.
 * - The Star Wars site's file is answered here with a small site of its own:  nothing reaches the disk.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** The kit's root, where the page server leaves its note of the editor's address. */
const KIT = path.resolve(import.meta.dirname, "../../../..")

/** The running editor's address, from that note;  `undefined`:  none noted. */
function editorAddress(): string | undefined {
  const note = path.join(KIT, ".spell-server.editor.json")
  return existsSync(note) ? (JSON.parse(readFileSync(note, "utf8")) as { url: string }).url : undefined
}

/** Does it answer? */
async function isServing(address: string | undefined): Promise<boolean> {
  if (!address) return false
  try {
    return (await fetch(address)).ok
  } catch (ignored) {
    return false
  }
}

const EDITOR = editorAddress()
const SERVING = await isServing(EDITOR)

/** The project, and the file answered in its place. */
const PROJECT = "@spell/examples/StarWarsSite"
const FILE = "StarWarsSite.spellml"

/** A small site:  a home page with a button to the about page, and an about page with a link back. */
const SITE = `<spell-page "home page">
\t<draw>
\t\t<h1>Home</h1>
\t\t<ui-button class="go-about" onClick={go to the about page}>About</ui-button>
\t</draw>
</>

<spell-page "about page">
\t<draw>
\t\t<h1>About</h1>
\t\t<a class="go-home" href="/">Home</a>
\t</draw>
</>

<spell-site "galaxy guide">
\t<page "home page" address="/"/>
\t<page "about page" address="/about"/>
\t<page "not found page"/>
\t<page "error page"/>
</>
`

/** What a compile and redraw takes, at most. */
const SETTLE_MS = 3000

describe.skipIf(!SERVING)("a site in Run", { timeout: 180_000 }, () => {
  let browser: Browser
  let context: BrowserContext
  let page: Page

  /** The site's text, as the editor holds it. */
  const text = () =>
    page.evaluate((file) => {
      const { project } = window as unknown as { project: { spellFiles: { path: string; contents: string }[] } }
      return project.spellFiles.find((each) => each.path.endsWith(`/${file}`))!.contents
    }, FILE)

  /** What the site draws now. */
  const shown = () =>
    page.evaluate(() => {
      // through each page's own element, whose drawing is in its shadow root
      const textIn = (node: Node): string =>
        node.nodeType === Node.TEXT_NODE
          ? (node.textContent ?? "")
          : [...((node as Element).shadowRoot?.childNodes ?? []), ...node.childNodes].map(textIn).join(" ")
      const site = document.querySelector(".spell-site")
      return site ? textIn(site).replace(/\s+/g, " ").trim() : "(no site)"
    })

  /** Open the site at `address`, and wait for it to draw. */
  async function open(address: string): Promise<void> {
    await page.goto(`${EDITOR}run/${PROJECT}${address}`)
    await page.locator(".spell-site").waitFor({ timeout: 30_000 })
    await page.waitForTimeout(SETTLE_MS)
  }

  /** The site's address, as the URL names it. */
  const address = () => new URL(page.url()).pathname.replace(`/run/${PROJECT}`, "") || "/"

  beforeAll(async () => {
    browser = await chromium.launch()
    context = await browser.newContext({ viewport: { width: 1300, height: 800 } })
    await context.route(/\/api\/projects\/file\/|\.(spellml|spell)(\?.*)?$/, (route) => {
      const request = route.request()
      if (request.isNavigationRequest()) return route.continue()
      // a save goes nowhere, and every load is the small site afresh:  the editor holds what was changed
      if (request.method() !== "GET") return route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
      return request.url().includes(FILE) ? route.fulfill({ contentType: "text/plain", body: SITE }) : route.continue()
    })
    page = await context.newPage()
  })

  afterAll(async () => {
    await browser?.close()
  })

  test("shows the page its address names", async () => {
    await open("/about")
    expect(await shown()).toContain("About")
    expect(address()).toBe("/about")
  })

  test("a link to one of its addresses goes there, and back goes back", async () => {
    await page.locator(".spell-site a.go-home").click()
    await page.waitForTimeout(SETTLE_MS)
    expect(await shown()).toContain("Home")
    await page.locator(".spell-site .go-about").click()
    await page.waitForTimeout(SETTLE_MS)
    expect(await shown()).toContain("About")
    expect(address()).toBe("/about")
    await page.goBack()
    await page.waitForTimeout(SETTLE_MS)
    expect(await shown()).toContain("Home")
  })

  test("an address with no page offers to make one, which the site then shows", async () => {
    await open("/tatooine")
    expect(await shown()).toContain("No such page")
    await page.locator(".spell-site-missing ui-button").click()
    await page.waitForTimeout(SETTLE_MS * 2)
    const after = await text()
    expect(after).toContain('<spell-page "tatooine page"/>')
    expect(after).toContain('<page "tatooine page" address="/tatooine"/>')
    expect(await shown()).not.toContain("No such page")
    expect(address()).toBe("/tatooine")
  })
})
