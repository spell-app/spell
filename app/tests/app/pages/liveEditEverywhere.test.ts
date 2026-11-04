import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { chromium, type Browser, type BrowserContext, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

/**
 * A program that imports another project takes an edit as it runs, its things kept (epic `editor`, Live Edit Everywhere).
 * - The frozen `counter-app`, which draws the frozen `counter` library's counter:  counted to 3, then edited.
 * - The app's own code edited, and the library's compiled code changed under it:  the count stays 3, on the same element.
 * - NOTHING reaches the disk:  every save is answered here, so the frozen projects can't change.
 * - Needs this checkout's editor running:  `spell server start all`;  skips itself when it isn't, as in CI.
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

/** What a compile and redraw takes, at most. */
const SETTLE_MS = 3000

describe.skipIf(!SERVING)("live edit everywhere", { timeout: 240_000 }, () => {
  let browser: Browser
  let context: BrowserContext
  let page: Page
  /** The library's compiled code, changed:  what a read of it answers once set. */
  let libraryEdit: ((compiled: string) => string) | undefined

  /** The counter's element, and what it shows. */
  const counter = () => page.locator(".AppPaneBody counter-counter").first()

  /** Change the app's file as typing would, and compile it. */
  async function editApp(from: string, to: string): Promise<void> {
    await page.evaluate(
      async ({ text, replacement }) => {
        const { project, editor } = window as unknown as {
          project: { spellFiles: { path: string; contents: string }[] }
          editor: { compileApp(): Promise<void>; history: { change(change: object, step: { title: string }): void } }
        }
        const found = project.spellFiles.find((each) => each.path.endsWith("/CounterApp.spell"))!
        const before = found.contents
        editor.history.change(
          { file: found, at: 0, before, after: before.replace(text, replacement) },
          { title: "Typed" }
        )
        await editor.compileApp()
      },
      { text: from, replacement: to }
    )
    await page.waitForTimeout(SETTLE_MS)
  }

  /** What the counter shows:  its button, in its shadow root. */
  const shown = () => counter().locator("ui-button").first().innerText()

  /** Mark the counter's element, so a redraw shows as a new one. */
  const markCounter = () =>
    page.evaluate(() => {
      ;(document.querySelector(".AppPaneBody counter-counter") as HTMLElement & { marked?: boolean }).marked = true
    })
  const isSameCounter = () =>
    page.evaluate(
      () => !!(document.querySelector(".AppPaneBody counter-counter") as HTMLElement & { marked?: boolean }).marked
    )

  beforeAll(async () => {
    browser = await chromium.launch()
    context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    // saves never reach the disk;  the library's compiled code, once changed, is answered from here
    await context.route(/\/api\/projects\/file\/|\.(spellml|spell|spell\.js)(\?.*)?$/, (route) => {
      const request = route.request()
      if (request.isNavigationRequest()) return route.continue()
      if (request.method() !== "GET") return route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
      const url = new URL(request.url())
      if (libraryEdit && url.pathname.endsWith("/counter/counter.spell.js")) {
        return route
          .fetch()
          .then((response) => response.text())
          .then((text) => route.fulfill({ contentType: "text/javascript", body: libraryEdit!(text) }))
      }
      return route.continue()
    })
    page = await context.newPage()
    await page.goto(`${EDITOR}edit/@spell/test/counter-app`, { timeout: 60_000 })
    await counter().waitFor({ timeout: 60_000 })
    await page.waitForTimeout(2000)
    for (let click = 0; click < 3; click++) await counter().locator("ui-button").click()
    await page.waitForTimeout(300)
    await markCounter()
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
  })

  test("the app's own edit keeps the imported counter's count, on the same element", async () => {
    expect(await shown()).toContain("Count: 3")
    await editApp(`<div class="Tally">`, `<div class="Tally Edited">`)
    await expect.poll(() => page.locator(".AppPaneBody .Tally.Edited").count()).toBe(1)
    expect(await shown()).toContain("Count: 3")
    expect(await isSameCounter()).toBe(true)
  })

  test("the library's edit draws again, its count kept, on the same element", async () => {
    libraryEdit = (compiled) => compiled.replace("`Count: ", "`Clicks: ")
    await editApp(`Tally Edited`, `Tally Edited Again`)
    await expect.poll(shown).toContain("Clicks: 3")
    expect(await isSameCounter()).toBe(true)
  })
})
