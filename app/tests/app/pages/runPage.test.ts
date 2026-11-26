import { chromium, type Browser } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"

/**
 * The run page, `/run/<project>` opened straight (epic `solid-2-final` P12):  the project runs with no editor in the page,
 * and Edit opens the editor at `/edit/<project>`.
 * - The page is `run.html`, not the editor's `index.html`:  no `window.editor`, no code pane.
 * - A phone opening `/edit/<project>` goes to the run page before the editor downloads, and shows no Edit.
 * - The editor's own tab, reloaded in Run, stays the editor (epic `editor` I364).
 * - The run page shows in one step:  its loading screen until the app is drawn and styled (I364).
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 */

/** The project it runs. */
const SOLITAIRE = "@spell/examples/Solitaire"

/** Solitaire's drawing:  its cards. */
const CARDS = "solitaire-card"

describe.skipIf(!SERVING)("the run page", { timeout: 240_000 }, () => {
  let browser: Browser

  beforeAll(async () => {
    browser = await chromium.launch()
  })
  afterAll(async () => {
    await browser?.close()
  })

  test("runs Solitaire with no editor in the page;  Edit opens the editor at /edit/", async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    const problems: string[] = []
    page.on("pageerror", (error) => problems.push(error.message))
    await page.goto(`${EDITOR}run/${SOLITAIRE}`, { timeout: 60_000 })
    await page.waitForSelector(CARDS, { timeout: 60_000 })
    expect(await page.evaluate(() => "editor" in window)).toBe(false)
    expect(await page.locator(".cm-editor").count()).toBe(0)
    await page.locator(".RunModes ui-item[icon=pencil]").click()
    await page.waitForURL(`**/edit/${SOLITAIRE}`, { timeout: 30_000 })
    await page.waitForFunction(() => !!(window as { editor?: unknown }).editor, undefined, { timeout: 60_000 })
    expect(problems).toEqual([])
    await page.close()
  })

  test("the editor in Run, reloaded, is the editor again, not the run page (I364)", async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    await page.goto(`${EDITOR}edit/${SOLITAIRE}`, { timeout: 60_000 })
    // the project open and running in the editor, then its Run
    await page.waitForSelector(CARDS, { timeout: 120_000 })
    await page.evaluate(() => (window as unknown as { editor: { showRunner(): Promise<void> } }).editor.showRunner())
    await page.waitForURL(`**/run/${SOLITAIRE}**`, { timeout: 30_000 })
    const inRun = new URL(page.url()).pathname
    await page.reload({ timeout: 60_000 })
    await page.waitForFunction(() => !!(window as { editor?: unknown }).editor, undefined, { timeout: 60_000 })
    expect(await page.locator(".RunBar").count()).toBe(0)
    // the editor took `?editor` off its address:  the same address as before the reload
    expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(inRun)
    await page.close()
  })

  test("the run page shows in one step:  its loading screen until the app is drawn and styled (I364)", async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    await page.goto(`${EDITOR}run/${SOLITAIRE}`, { timeout: 60_000 })
    await page.waitForFunction(() => document.documentElement.classList.contains("run-shown"), undefined, {
      timeout: 60_000,
      polling: "raf"
    })
    // shown:  the cards are there, and every Spell UI element of the page is drawn with its styles
    expect(await page.locator(CARDS).count()).toBeGreaterThan(0)
    expect(await page.locator(".RunBar ui-menu:not(:state(ready))").count()).toBe(0)
    await page.close()
  })

  test("a phone opening /edit/ gets the run page, with no Edit", async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true })
    await page.goto(`${EDITOR}edit/${SOLITAIRE}`, { timeout: 60_000 })
    await page.waitForURL(`**/run/${SOLITAIRE}`, { timeout: 30_000 })
    await page.waitForSelector(CARDS, { timeout: 60_000 })
    expect(await page.locator(".RunModes").count()).toBe(0)
    await page.close()
  })
})
