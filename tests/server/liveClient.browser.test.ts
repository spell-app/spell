import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test"

import { PageServer } from "spell/server/page"

/**
 * The live client's reload, in headless Chromium, on a page the page server serves (epic `epic-engine` I164):
 * the new page held behind the old one by a cross-document view transition (`holdReveal()`) until it's ready.
 * - each page logs, from before its own scripts (`addInitScript()`), whether it came in through a view transition,
 *   and when its animations were let go
 */
const root = mkdtempSync(join(tmpdir(), "srv-live-"))
let server: PageServer
let browser: Browser

/** A page long enough to scroll, with a section to address. */
const PAGE = `<!doctype html><html><head><title>T</title></head><body><main>
  ${"<p>filler text</p>".repeat(150)}<section id="more"><p>More</p></section>${"<p>filler text</p>".repeat(150)}
</main></body></html>\n`

/** In the page, before anything else:  how it came in (`window.came`). */
function logArrival() {
  const came = { transition: false, heldAtStart: false, finished: false }
  Object.assign(window, { came })
  addEventListener("pagereveal", (event) => {
    const transition = (event as Event & { viewTransition?: ViewTransition | null }).viewTransition
    if (!transition) return
    came.transition = true
    // after `holdReveal()`'s own `ready` handler, which pauses them
    void transition.ready.then(() =>
      queueMicrotask(() => {
        came.heldAtStart = document
          .getAnimations()
          .some((animation) => animation.playState === "paused" && animation.currentTime === 0)
      })
    )
    void transition.finished.then(() => (came.finished = true))
  })
}

beforeAll(async () => {
  mkdirSync(join(root, "docs"), { recursive: true })
  writeFileSync(join(root, "package.json"), JSON.stringify({ pageServer: { writable: ["docs"] } }))
  writeFileSync(join(root, "docs", "page.html"), PAGE)
  writeFileSync(join(root, "docs", "other.html"), PAGE.replace("<title>T</title>", "<title>Other</title>"))
  server = await new PageServer({ root }).start({ port: 0, routes: false, pidFile: false })
  browser = await chromium.launch()
}, 120_000)

afterAll(async () => {
  await browser?.close()
  await server?.stop()
  rmSync(root, { recursive: true, force: true })
})

/** The page, opened at `hash`, scrolled to `y`. */
async function opened(hash = "", y = 0): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } })
  await page.addInitScript(logArrival)
  await page.goto(`http://127.0.0.1:${server.info.port}/docs/page.html${hash}`)
  await page.waitForFunction(() => !!(window as { SPELL_SERVER?: { reload?: unknown } }).SPELL_SERVER?.reload)
  await page.evaluate((top) => scrollTo(0, top), y)
  return page
}

/** How the page that's showing now came in. */
function came(page: Page) {
  return page.evaluate(() => (window as unknown as { came: Record<string, boolean> }).came)
}

describe("liveClient's reload:  the new page held behind the old one (holdReveal())", () => {
  it("cross-fades in through a view transition, held until it's ready, its scroll and `#id` kept", async () => {
    const page = await opened("#more", 1234)
    await Promise.all([
      page.waitForEvent("load"),
      page.evaluate(() => (window as unknown as { SPELL_SERVER: { reload(): void } }).SPELL_SERVER.reload())
    ])
    await page.waitForFunction(() => (window as unknown as { came: { finished: boolean } }).came.finished)
    expect(await came(page)).toEqual({ transition: true, heldAtStart: true, finished: true })
    expect(await page.evaluate(() => [Math.round(scrollY), location.hash])).toEqual([1234, "#more"])
    await page.close()
  })

  it("leaves every other navigation as it was:  no transition into a page a link opens", async () => {
    const page = await opened()
    await Promise.all([page.waitForEvent("load"), page.evaluate(() => location.assign("/docs/other.html"))])
    await page.waitForTimeout(300)
    expect((await came(page)).transition).toBe(false)
    await page.close()
  })
})
