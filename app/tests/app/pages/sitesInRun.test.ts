import { chromium, type Browser, type BrowserContext, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"

/**
 * A SITE in the editor's Run (epic `mockup` P2):  the page its address names, a button going to another page, the
 * browser's back button, and making a page an address had none for, which the running site takes as it runs (P4).
 * - The Star Wars site's file is answered here with a small site of its own:  nothing reaches the disk.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

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

/**
 * The running site's thing, found from what it draws, up through the elements around it:  `mark` marks it,
 * `read` says whether it's still marked, i.e. still the same thing, so the run went on.
 */
function siteThing(action: string): boolean {
  let element: Node | null = document.querySelector(".spell-site")
  while (element && !(element as { thing?: object }).thing) {
    element = element.parentNode instanceof ShadowRoot ? element.parentNode.host : element.parentNode
  }
  const thing = (element as { thing?: Record<string, unknown> } | null)?.thing
  if (!thing) return false
  if (action === "mark") thing.keptAcrossTheEdit = true
  return thing.keptAcrossTheEdit === true
}

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
    // the run goes on:  the program's app is the same element after, not a fresh one (epic `mockup` P4, J15 A)
    await page.evaluate(siteThing, "mark")
    await page.locator(".spell-site-missing ui-button").click()
    await page.waitForTimeout(SETTLE_MS * 2)
    const after = await text()
    expect(after).toContain('<spell-page "tatooine page"/>')
    expect(after).toContain('<page "tatooine page" address="/tatooine"/>')
    expect(await shown()).not.toContain("No such page")
    expect(address()).toBe("/tatooine")
    expect(await page.evaluate(siteThing, "read")).toBe(true)
  })
})
