import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"

/**
 * Leaving an app takes its drawing with it (epic `editor` I254):  never left over Home, nor shown while the next loads.
 * - Home has no place for an app:  a compile that ended after leaving drew Solitaire over the home page, in a
 *   `#spell-app-root` of its own on `<body>`.
 * - Switching projects took the old app down only once the new one had loaded:  it showed for a second.
 * - Navigates the way the editor does (`editor.showEditor()`, `showProjectChooser()`), so the page never reloads.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 */

/** The app that was drawn over Home. */
const SOLITAIRE = "@spell/examples/Solitaire"

/** A small app to switch to. */
const COUNTER = "@spell/examples/Counter"

/** Solitaire's drawing, anywhere on the page. */
const SOLITAIRE_DRAWN = "solitaire-app, solitaire-card"

/** How long to watch the page after a move:  past the compile that was still running. */
const WATCH_MS = 6000

describe.skipIf(!SERVING)("leaving an app", { timeout: 240_000 }, () => {
  let browser: Browser
  let page: Page

  beforeAll(async () => {
    browser = await chromium.launch()
    page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
    await page.goto(EDITOR!, { timeout: 60_000 })
    await page.waitForFunction(() => !!(window as { editor?: unknown }).editor, undefined, { timeout: 60_000 })
  })
  afterAll(async () => {
    await browser?.close()
  })

  /** Go to `address` in the editor, as its own links do. */
  const showEditor = (address: string) =>
    page.evaluate(
      (path) => (window as unknown as { editor: { showEditor(path: string): void } }).editor.showEditor(path),
      address
    )

  /** Go Home, as the editor's Home does. */
  const showHome = () =>
    page.evaluate(() => (window as unknown as { editor: { showProjectChooser(): void } }).editor.showProjectChooser())

  /** Every moment Solitaire was drawn in the next `ms`, looked at every frame:  how many, and where the last was. */
  const solitaireSeenIn = (ms: number) =>
    page.evaluate(
      ({ ms, selector }) =>
        new Promise<{ times: number; under?: string }>((resolve) => {
          const seen: { times: number; under?: string } = { times: 0 }
          const stop = performance.now() + ms
          const look = () => {
            const drawn = document.querySelector(selector)
            if (drawn) {
              seen.times += 1
              seen.under = drawn.closest("#SpellEditor")
                ? "the editor"
                : (drawn.parentElement?.parentElement?.tagName ?? "?")
            }
            if (performance.now() < stop) requestAnimationFrame(look)
            else resolve(seen)
          }
          look()
        }),
      { ms, selector: SOLITAIRE_DRAWN }
    )

  test("Solitaire left at once for Home is NEVER drawn over it, though its run ends after", async () => {
    await showEditor(SOLITAIRE)
    await page.waitForURL(/\/edit\/@spell\/examples\/Solitaire/)
    // its compile and run are still on their way:  leave before they end
    await page.waitForTimeout(300)
    await showHome()
    await page.waitForURL((url) => url.pathname === "/")
    expect(await solitaireSeenIn(WATCH_MS)).toEqual({ times: 0 })
  })

  test("Solitaire, drawn, then Home:  nothing of it stays", async () => {
    await showEditor(SOLITAIRE)
    await page.waitForSelector("solitaire-card", { timeout: 60_000 })
    await showHome()
    await page.waitForURL((url) => url.pathname === "/")
    expect(await solitaireSeenIn(WATCH_MS)).toEqual({ times: 0 })
    expect(await page.locator("#spell-app-root").count()).toBe(0)
  })

  test("Solitaire, then Counter:  Solitaire is NEVER shown after the move, and Counter is", async () => {
    await showEditor(SOLITAIRE)
    await page.waitForSelector("solitaire-card", { timeout: 60_000 })
    await showEditor(COUNTER)
    // a frame or two while the address changes:  the move starts with the next frame
    await page.waitForURL(/\/edit\/@spell\/examples\/Counter/)
    expect(await solitaireSeenIn(WATCH_MS)).toEqual({ times: 0 })
    await page.waitForSelector("counter-app", { timeout: 60_000 })
  })

  test("leaving Solitaire for Home before it ran, and coming back:  it runs in the editor", async () => {
    await showEditor(SOLITAIRE)
    await page.waitForTimeout(300)
    await showHome()
    await page.waitForTimeout(3000)
    await showEditor(SOLITAIRE)
    await page.waitForSelector("#SpellEditor solitaire-card", { timeout: 60_000 })
    expect(await page.locator("body > #spell-app-root").count()).toBe(0)
  })
})
