import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

/**
 * The editor's columns in Edit:  the app takes every change of size (epic `editor` I32).
 * - Dragging the code's bar sizes the code, and the app takes the difference:  the Inspector keeps its width, and slides.
 * - Real mouse drags, on Solitaire with the Inspector open.
 * - NOTHING is remembered:  the preference routes are answered here, so Owen's sizes stay as they are.
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

describe.skipIf(!SERVING)("the editor's columns", { timeout: 180_000 }, () => {
  let browser: Browser
  let page: Page

  /** The widths of the app, the Inspector and the code, whole px. */
  async function widths(): Promise<number[]> {
    return page.evaluate(() => {
      const columns = document.querySelector("ui-split-panel.EditorColumns")!
      return [...columns.children]
        .filter((pane) => !pane.hasAttribute("hidden"))
        .map((pane) => Math.round(pane.getBoundingClientRect().width))
    })
  }

  /** Drag the columns' bar number `bar` across by `moved` px, with the mouse. */
  async function drag(bar: number, moved: number): Promise<void> {
    const box = await page
      .locator("ui-split-panel.EditorColumns")
      .first()
      .evaluate((columns, index) => {
        const { x, y, width, height } = columns
          .shadowRoot!.querySelectorAll('[part~="bar"]')
          [index].getBoundingClientRect()
        return { x: x + width / 2, y: y + height / 2 }
      }, bar)
    await page.mouse.move(box.x, box.y)
    await page.mouse.down()
    for (let step = 1; step <= 5; step++) await page.mouse.move(box.x + (moved * step) / 5, box.y)
    await page.mouse.up()
    await page.waitForTimeout(300)
  }

  beforeAll(async () => {
    browser = await chromium.launch()
    const context = await browser.newContext({ viewport: { width: 1440, height: 800 } })
    // every size starts as the editor's own, and none is kept
    await context.route(/\/api\/prefs\//, (route) => route.fulfill({ status: 200, body: "{}" }))
    page = await context.newPage()
    await page.goto(`${EDITOR}edit/@spell/examples/Solitaire`, { timeout: 60_000 })
    await page.waitForSelector(".InputEditor .monaco-editor .view-line", { timeout: 60_000 })
    await page.waitForTimeout(2000)
    await page.locator(".InspectAppButton [part~=item]").first().click()
    await page.waitForFunction(
      () => document.querySelectorAll("ui-split-panel.EditorColumns > :not([hidden])").length === 3
    )
    await page.waitForTimeout(500)
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
  })

  test("dragging the code's bar sizes the code;  the app takes the difference, the Inspector keeps its width", async () => {
    const [app, inspector, code] = await widths()
    await drag(1, -100)
    const [appWider, inspectorWider, codeWider] = await widths()
    expect(codeWider).toBe(code + 100)
    expect(inspectorWider).toBe(inspector)
    expect(appWider).toBe(app - 100)
    await drag(1, 100)
    expect(await widths()).toEqual([app, inspector, code])
  })

  test("the window narrowing is the app's alone", async () => {
    const [app, inspector, code] = await widths()
    await page.setViewportSize({ width: 1340, height: 800 })
    await page.waitForTimeout(400)
    const [appNarrower, ...others] = await widths()
    expect(others).toEqual([inspector, code])
    expect(appNarrower).toBe(app - 100)
  })
})
