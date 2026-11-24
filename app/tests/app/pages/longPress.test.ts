import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"

/**
 * In Edit, a long press lifts a part to rearrange it, and a plain press and move stays the running app's
 * (epic `editor` I330;  Owen:  "drag to rearrange in the editor should be a long-press").
 * - On the editor's own Spell, its About box's words moved into its row of buttons, as Owen tried.
 * - Real mouse presses, held and not.
 * - NOTHING is written:  every save is answered here, and what it would have written is read from the request.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

describe.skipIf(!SERVING)("a long press in Edit", { timeout: 180_000 }, () => {
  let browser: Browser
  let page: Page
  /** What the editor would have saved of its own Spell, the last time it saved it. */
  let saved: string | undefined

  beforeAll(async () => {
    browser = await chromium.launch()
    const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } })
    await context.route(/\/api\//, (route) => {
      const request = route.request()
      if (request.method() === "GET") return route.continue()
      if (/SpellEditor\.spell$/.test(request.url())) saved = request.postData() ?? ""
      return route.fulfill({ status: 200, contentType: "application/json", body: "true" })
    })
    page = await context.newPage()
    await page.goto(`${EDITOR}edit/@spell/editor/spell-editor`, { timeout: 60_000 })
    await aboutBox().waitFor({ timeout: 120_000 })
  }, 180_000)

  afterAll(async () => {
    await browser?.close()
  })

  /** The About box's zone in the app pane. */
  function aboutBox() {
    return page
      .locator("section.EditorZone", { has: page.locator(".EditorZoneTitle", { hasText: /about box/i }) })
      .first()
  }

  /**
   * Press the About box's words, hold for `holdMs`, move onto its OK button, and let go.
   * - Measured just before the press:  the zones above it settle as the program runs.
   */
  async function pressAndMove(holdMs: number): Promise<void> {
    saved = undefined
    await aboutBox().scrollIntoViewIfNeeded()
    await page.waitForTimeout(1500)
    const words = (await aboutBox()
      .getByText(/Write programs/)
      .last()
      .boundingBox())!
    const ok = (await aboutBox().getByText("OK", { exact: true }).first().boundingBox())!
    const [x, y] = [words.x + words.width / 2, words.y + words.height / 2]
    const [toX, toY] = [ok.x + ok.width * 0.8, ok.y + ok.height / 2]
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.waitForTimeout(holdMs)
    for (let step = 1; step <= 15; step++)
      await page.mouse.move(x + ((toX - x) * step) / 15, y + ((toY - y) * step) / 15)
    await page.mouse.up()
    await page.waitForTimeout(3000)
  }

  test("a plain press and move:  the app's, so nothing is picked up and nothing is written", async () => {
    await pressAndMove(0)
    expect(saved).toBeUndefined()
    expect(await page.evaluate(() => (globalThis as any).Inspector.allSelected.length)).toBe(0)
  })

  // off with the long press itself (editor T161):  back on with `PartLongPress.isOn`
  test.skip("held still first:  the words are lifted, and dropped in the row of buttons, after OK", async () => {
    await pressAndMove(700)
    expect(saved).toBeDefined()
    const actions = saved!.slice(saved!.indexOf("<actions>", saved!.indexOf('<modal heading="About')))
    const inActions = actions.slice(0, actions.indexOf("</actions>"))
    expect(inActions).toContain("Write programs in plain words")
    expect(inActions.indexOf("Write programs")).toBeGreaterThan(inActions.indexOf("OK</button>"))
  })
})
