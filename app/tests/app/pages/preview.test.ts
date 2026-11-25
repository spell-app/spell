import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"

/**
 * Preview (epic `editor` T172):  the running app alone, full screen, nothing of the editor round it.
 * - ⌥⌘Enter goes in, from the app or the code:  Run, the top bar and every pane hidden, the app edge to edge.
 * - The same key comes back out:  Edit again, the Inspector, the Program panel, the code and the add bar as before.
 * - The app keeps running throughout:  the same card elements, in the same order, never dealt again.
 * - The browser leaving full screen (Escape) leaves Preview too.
 * - View › Preview goes in as the key does.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** The project it shows. */
const SOLITAIRE = "@spell/examples/Solitaire"

/** The key in and out. */
const PREVIEW_KEY = "Alt+Meta+Enter"

/** The page's globals the tests reach. */
type TestWindow = Window & { Preview: { isShowing: boolean }; firstCard?: Element }

/** What shows of the editor and the app, and whether the game is the one dealt first. */
type Shown = {
  /** the page's address */
  path: string
  /** `Preview.isShowing` */
  isPreviewing: boolean
  /** the top bar is drawn */
  hasBar: boolean
  /** the code, the Inspector, the Program panel and the add bar, each drawn */
  panes: { code: boolean; inspector: boolean; programPanel: boolean; addBar: boolean }
  /** the app's pane, across and down:  `[x, y, width, height]` */
  app: number[]
  /** the first card is the element it was at the start */
  isSameGame: boolean
  /** the cards' faces, in order:  the deal */
  deal: string
  /** the browser is full screen */
  isFullScreen: boolean
}

describe.skipIf(!SERVING)("Preview, over Solitaire", { timeout: 240_000 }, () => {
  let browser: Browser
  let page: Page

  beforeAll(async () => {
    browser = await chromium.launch()
    page = await browser.newPage({ viewport: { width: 1400, height: 860 } })
    // the panes Preview hides, then shows again:  the Inspector and the Program panel open
    await page.addInitScript(() => {
      localStorage.setItem("spellEditor:programPanel", "true")
      localStorage.setItem("spellEditor:inspector", "true")
    })
    await page.goto(`${EDITOR}edit/${SOLITAIRE}`, { timeout: 60_000 })
    await page.waitForSelector("solitaire-card", { timeout: 60_000 })
    await page.waitForSelector(".cm-editor", { timeout: 60_000 })
    await page.waitForTimeout(3000)
    await page.evaluate(() => {
      ;(window as unknown as TestWindow).firstCard = document.querySelector("solitaire-card")!
    })
  }, 120_000)
  afterAll(async () => {
    await browser?.close()
  })

  /** What shows now. */
  const shown = (): Promise<Shown> =>
    page.evaluate(() => {
      const isDrawn = (selector: string) => {
        const box = document.querySelector(selector)?.getBoundingClientRect()
        return !!box && box.width > 0 && box.height > 0
      }
      const app = document.querySelector(".AppPane")!.getBoundingClientRect()
      const cards = [...document.querySelectorAll("solitaire-card")]
      const testWindow = window as unknown as TestWindow
      return {
        path: location.pathname,
        isPreviewing: testWindow.Preview.isShowing,
        hasBar: isDrawn(".EditorBarPlace"),
        panes: {
          code: isDrawn(".EditorCode .cm-editor"),
          inspector: isDrawn(".InspectorPane"),
          programPanel: isDrawn(".ProgramPanel"),
          addBar: isDrawn(".PaletteRail")
        },
        app: [app.x, app.y, app.width, app.height].map(Math.round),
        isSameGame: cards[0] === testWindow.firstCard,
        deal: cards.map((card) => `${card.getAttribute("rank")} of ${card.getAttribute("suit")}`).join(","),
        isFullScreen: !!document.fullscreenElement
      }
    })

  /** Press the key, from what has the focus, and let the switch settle. */
  const pressPreview = async () => {
    await page.keyboard.press(PREVIEW_KEY)
    await page.waitForTimeout(1500)
  }

  test("⌥⌘Enter shows the app alone, full screen;  again, Edit and its panes as before, the game the same", async () => {
    const before = await shown()
    expect(before.path).toMatch(/^\/edit\//)
    expect(before).toMatchObject({ isPreviewing: false, hasBar: true, isSameGame: true })
    expect(before.panes).toEqual({ code: true, inspector: true, programPanel: true, addBar: true })

    // from the app:  a click on its empty felt
    await page.locator(".AppPane").click({ position: { x: 20, y: 700 } })
    await pressPreview()
    const previewing = await shown()
    expect(previewing.path).toMatch(/^\/run\//)
    expect(previewing).toMatchObject({ isPreviewing: true, hasBar: false, isSameGame: true, deal: before.deal })
    expect(previewing.panes).toEqual({ code: false, inspector: false, programPanel: false, addBar: false })
    // edge to edge
    expect(previewing.app).toEqual([0, 0, 1400, 860])
    expect(previewing.isFullScreen).toBe(true)

    await pressPreview()
    const after = await shown()
    expect(after.path).toBe(before.path)
    expect(after).toMatchObject({ isPreviewing: false, hasBar: true, isSameGame: true, deal: before.deal })
    expect(after.panes).toEqual(before.panes)
    expect(after.app).toEqual(before.app)
    expect(after.isFullScreen).toBe(false)
  })

  test("the key works from the code too", async () => {
    await page.locator(".EditorCode .cm-content").first().click()
    await pressPreview()
    expect(await shown()).toMatchObject({ isPreviewing: true, hasBar: false })
    await pressPreview()
    expect(await shown()).toMatchObject({ isPreviewing: false, hasBar: true, isSameGame: true })
  })

  test("leaving the browser's full screen (Escape) leaves Preview", async () => {
    const before = await shown()
    await page.locator(".AppPane").click({ position: { x: 20, y: 700 } })
    await pressPreview()
    expect(await shown()).toMatchObject({ isPreviewing: true, isFullScreen: true })
    // what Escape does in a real browser:  the browser leaves full screen, and the page hears of it
    await page.evaluate(() => document.exitFullscreen())
    await page.waitForTimeout(1500)
    const after = await shown()
    expect(after).toMatchObject({ isPreviewing: false, hasBar: true, isSameGame: true, path: before.path })
    expect(after.panes).toEqual(before.panes)
  })

  test("View › Preview goes in;  from Run, the key comes back to Run", async () => {
    await page.locator(".ModeTabs ui-item[data-tour=run]").click()
    await page.waitForURL(/\/run\//, { timeout: 30_000 })
    await page.waitForTimeout(1000)
    await page.locator("#ViewBarMenu [part~=item]").first().click()
    await page.getByText("Preview", { exact: true }).first().click()
    await page.waitForTimeout(1500)
    expect(await shown()).toMatchObject({ isPreviewing: true, hasBar: false })
    await pressPreview()
    const after = await shown()
    expect(after.path).toMatch(/^\/run\//)
    expect(after).toMatchObject({ isPreviewing: false, hasBar: true, isSameGame: true })
  })
})
