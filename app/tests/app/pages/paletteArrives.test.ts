import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"

/**
 * The add bar down the editor's left edge (epic `editor` T151), on a cold start (I255), in the running editor:
 * - it never shows before the top bar's menus:  the editor's own Spell, which draws the bar, is held back here
 *   past the page's loading hero, so the race shows every time
 * - once the bar is drawn, it shows, fading and sliding in
 * - it doesn't animate again:  Run and back to Edit draw it again, still
 * - Needs this checkout's editor running:  `spell server start all`.  Skips itself when it isn't, as in CI.
 * - Headless Playwright, never a real browser window.
 */

/** How long the editor's Spell is held back:  past the hero's longest wait, 8 seconds (`PageLoading`). */
const HELD_MSEC = 10_000
describe.skipIf(!SERVING)("the add bar, on a cold start", { timeout: 180_000 }, () => {
  let browser: Browser
  let page: Page
  /** What the page showed each frame, until the bar was drawn:  the add bar (`strip`) and the hero. */
  let framesBeforeBar: { strip: boolean; hero: boolean }[] = []

  beforeAll(async () => {
    browser = await chromium.launch()
    const context = await browser.newContext({ viewport: { width: 1290, height: 900 } })
    // the editor's Spell runs on the layout's copy of the runtime (`layoutSpell.ts`):  hold back its first module
    let isHeld = false
    await context.route(/\?layout-copy$/, async (route) => {
      if (!isHeld) {
        isHeld = true
        await new Promise((resolve) => setTimeout(resolve, HELD_MSEC))
      }
      await route.continue()
    })
    page = await context.newPage()
    await page.goto(`${EDITOR}edit/@spell/examples/Solitaire`, { timeout: 60_000 })
    framesBeforeBar = (await page.evaluate(
      () =>
        new Promise((resolve) => {
          const frames: { strip: boolean; hero: boolean }[] = []
          const look = () => {
            frames.push({
              strip: !!document.querySelector(".PaletteRailPlace"),
              hero: !!document.getElementById("PageLoading")
            })
            if (document.querySelector("ui-app-menu.AppMenu ui-item")) resolve(frames)
            else requestAnimationFrame(look)
          }
          look()
        })
    )) as { strip: boolean; hero: boolean }[]
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
  })

  test("it doesn't show before the top bar, though the hero has gone", async () => {
    expect(
      framesBeforeBar.some((frame) => !frame.hero),
      "the hero never went before the bar"
    ).toBe(true)
    expect(framesBeforeBar.filter((frame) => frame.strip)).toEqual([])
  })

  test("it shows once the bar is drawn, fading and sliding in", async () => {
    await page.waitForSelector(".PaletteRailPlace", { timeout: 30_000 })
    const strip = (await page.evaluate(() => {
      const element = document.querySelector(".PaletteRailPlace")!
      const bar = document.querySelector(".EditorBarPlace")!.getBoundingClientRect()
      return {
        isArriving: element.classList.contains("arriving"),
        animation: getComputedStyle(element).animationName,
        isUnderTheBar: element.getBoundingClientRect().top >= bar.top
      }
    })) as { isArriving: boolean; animation: string; isUnderTheBar: boolean }
    expect(strip).toEqual({ isArriving: true, animation: "palette-rail-arrives", isUnderTheBar: true })
  })

  test("Run and back to Edit draw it again without its animation", async () => {
    await page.waitForTimeout(1000)
    await page.evaluate(`window.editor.showRunner()`)
    await page.waitForFunction(`!document.querySelector(".PaletteRailPlace")`, undefined, { timeout: 10_000 })
    await page.evaluate(`window.editor.showEditor()`)
    await page.waitForSelector(".PaletteRailPlace", { timeout: 10_000 })
    const animation = await page.evaluate(() => {
      const element = document.querySelector(".PaletteRailPlace")!
      return { isArriving: element.classList.contains("arriving"), name: getComputedStyle(element).animationName }
    })
    expect(animation).toEqual({ isArriving: false, name: "none" })
  })
})
