import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"

/**
 * The file tab bar's button listing every file shows only while a file isn't a tab you can see (epic `editor` I235).
 * - Owen:  "If all the files are present in the list, hide the 'more files' button".
 *   It stayed once shown:  it took the room the row's last tab needed, so the row still overflowed.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** One file:  its tab always fits. */
const FEW_FILES = "@spell/examples/Counter"

/** Six files:  more than a narrow bar shows, and no more than its 8 tabs. */
const SOME_FILES = "@spell/examples/Solitaire"

/** What a resize and its redraw take, at most. */
const SETTLE_MS = 800

/** The file tab bar as measured:  its button, and how far its row overflows. */
type MoreFiles = {
  /** the button listing every file is drawn */
  hasButton: boolean
  /** the room it takes, its gap before it included, px;  `0` without it */
  buttonRoom: number
  /** how far the row's tabs overflow it, px */
  overflowBy: number
  /** tabs in the row, none put away */
  tabs: number
}

describe.skipIf(!SERVING)("The file tabs' button listing every file (I235)", { timeout: 180_000 }, () => {
  let browser: Browser
  let page: Page

  /** The file tab bar now;  `changes` counts each time its button came or went, since `watchButton()`. */
  const moreFiles = () =>
    page.evaluate((): MoreFiles & { changes: number } => {
      const toolbar = document.querySelector(".FileTabs > :not(ui-menu)")?.shadowRoot?.querySelector("ui-toolbar")
      const row = toolbar?.shadowRoot?.querySelector<HTMLElement>(".ui.menu")
      if (!toolbar || !row) throw new Error("moreFiles():  no file tab bar")
      const button = toolbar.shadowRoot!.querySelector(".all-items")
      const gap = button ? parseFloat(getComputedStyle(button.parentElement!).columnGap) || 0 : 0
      return {
        hasButton: !!button,
        buttonRoom: button ? button.getBoundingClientRect().width + gap : 0,
        overflowBy: row.scrollWidth - row.clientWidth,
        tabs: [...toolbar.children].filter((each) => each.localName === "ui-item" && !(each as HTMLElement).hidden)
          .length,
        changes: (window as unknown as { buttonChanges?: number }).buttonChanges ?? 0
      }
    })

  /** Count each time the button comes or goes, from now on. */
  const watchButton = () =>
    page.evaluate(() => {
      const toolbar = document.querySelector(".FileTabs > :not(ui-menu)")!.shadowRoot!.querySelector("ui-toolbar")!
      const counter = window as unknown as { buttonChanges: number }
      counter.buttonChanges = 0
      new MutationObserver((records) => {
        for (const record of records) {
          for (const node of [...record.addedNodes, ...record.removedNodes]) {
            if ((node as Element).classList?.contains("all-items")) counter.buttonChanges++
          }
        }
      }).observe(toolbar.shadowRoot!, { childList: true, subtree: true })
    })

  /** Open `project` in the editor, `width` px wide, and let it settle. */
  const open = async (project: string, width: number) => {
    await page.setViewportSize({ width, height: 860 })
    await page.goto(`${EDITOR}edit/${project}`)
    await page.locator(".FileTabs ui-toolbar").first().waitFor({ timeout: 30_000 })
    await page.waitForTimeout(3000)
  }

  beforeAll(async () => {
    browser = await chromium.launch()
    page = await browser.newPage()
  })

  afterAll(async () => {
    await browser?.close()
  })

  test("a project whose files are all tabs:  no button", async () => {
    await open(FEW_FILES, 1400)
    const bar = await moreFiles()
    expect(bar.hasButton).toBe(false)
    expect(bar.overflowBy).toBeLessThanOrEqual(1)
  })

  test("narrow, a file scrolled out:  the button;  widened till every tab fits, it goes once, and never flickers", async () => {
    await open(SOME_FILES, 1000)
    const narrow = await moreFiles()
    expect(narrow.tabs).toBe(6)
    expect(narrow.hasButton).toBe(true)
    // it's there because the row needs more room than it takes
    expect(narrow.overflowBy).toBeGreaterThan(narrow.buttonRoom)

    await watchButton()
    let wasGone = false
    for (let width = 1000; width <= 1800; width += 20) {
      await page.setViewportSize({ width, height: 860 })
      await page.waitForTimeout(SETTLE_MS)
      const bar = await moreFiles()
      // shown only while the row couldn't hold every tab without it;  gone, every tab fits
      if (bar.hasButton) expect(bar.overflowBy).toBeGreaterThan(bar.buttonRoom)
      else expect(bar.overflowBy).toBeLessThanOrEqual(1)
      // once gone, it stays gone as the bar widens
      if (wasGone) expect(bar.hasButton).toBe(false)
      wasGone ||= !bar.hasButton
    }
    expect(wasGone).toBe(true)
    // it went once:  never back and gone again on the way
    expect((await moreFiles()).changes).toBe(1)
  })
})
