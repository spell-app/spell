import { chromium, type Browser } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"

/**
 * The run page, `/run/<project>` opened straight (epic `solid-2-final` P12):  the project runs with no editor in the page,
 * and Edit opens the editor at `/edit/<project>`.
 * - The page is `run.html`, not the editor's `index.html`:  no `window.editor`, no code pane.
 * - A phone opening `/edit/<project>` goes to the run page before the editor downloads, and shows no Edit.
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

  test("a phone opening /edit/ gets the run page, with no Edit", async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true })
    await page.goto(`${EDITOR}edit/${SOLITAIRE}`, { timeout: 60_000 })
    await page.waitForURL(`**/run/${SOLITAIRE}`, { timeout: 30_000 })
    await page.waitForSelector(CARDS, { timeout: 60_000 })
    expect(await page.locator(".RunModes").count()).toBe(0)
    await page.close()
  })
})
