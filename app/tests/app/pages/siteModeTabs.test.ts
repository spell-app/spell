import { chromium, type Browser, type BrowserContext, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"

/**
 * Site mode and back, with files open as tabs (epic `mockup` I38, I39):
 * the site editor shows, and coming back to Edit finds the same tabs, in view, the row as wide as the bar.
 * - Owen (I38):  "There was a flicker as the tabs scrolled off before ending up on this":
 *   back in Edit, the row had slid 5,700px past its 8 tabs, the chosen one's thumb drawn past them.
 *   The tabs put away animated out, still taking their room while the row measured itself.
 * - Owen (I39):  "Now arrow is in the middle", "There were more tabs showing than were visible".
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** A site of 3 files:  every tab fits. */
const SITE = "@spell/examples/StarWarsSite"

/** A project of 13 files:  more than the bar's 8 tabs. */
const MANY_FILES = "@spell/examples/PublicServers"

/** What a page swap and its redraw take, at most. */
const SETTLE_MS = 2500

/** The file tab bar, as measured:  its row, its keys, its tabs. */
type TabBar = {
  /** the row's box, which scrolls:  left and right, px */
  row: { left: number; right: number; scrollLeft: number; scrollWidth: number; clientWidth: number }
  /** the `›` key's box, while it shows */
  scrollEnd?: { left: number; right: number }
  /** the button listing every file, while it shows */
  allItems?: { left: number; right: number }
  /** the bar's gap before that button, px */
  gap: number
  /** the tabs in the row (not put away), by file name, each with its box */
  tabs: { name: string; left: number; right: number; isChosen: boolean }[]
  /** the far side of the thumb under the chosen tab, in the row's content */
  thumbEnd?: number
}

describe.skipIf(!SERVING)("Site mode and back, with tabs open", { timeout: 180_000 }, () => {
  let browser: Browser
  let context: BrowserContext
  let page: Page

  /** The file tab bar now. */
  const tabBar = () =>
    page.evaluate((): TabBar => {
      const host = document.querySelector(".FileTabs > :not(ui-menu)")
      const toolbar = host?.shadowRoot?.querySelector("ui-toolbar")
      const shadow = toolbar?.shadowRoot
      const row = shadow?.querySelector<HTMLElement>(".ui.menu")
      if (!toolbar || !shadow || !row) throw new Error("tabBar():  no file tab bar")
      const box = (element: Element | null | undefined) => {
        if (!element) return undefined
        const { left, right, width } = element.getBoundingClientRect()
        return width ? { left, right } : undefined
      }
      const scrollEnd = shadow.querySelector(".scroll.end")
      const allItems = shadow.querySelector(".all-items")
      const thumbX = parseFloat(row.style.getPropertyValue("--_menu-thumb-x"))
      const thumbWidth = parseFloat(row.style.getPropertyValue("--_menu-thumb-width"))
      return {
        row: { ...box(row)!, scrollLeft: row.scrollLeft, scrollWidth: row.scrollWidth, clientWidth: row.clientWidth },
        scrollEnd: scrollEnd?.hasAttribute("data-can") ? box(scrollEnd) : undefined,
        allItems: box(allItems),
        gap: parseFloat(getComputedStyle(allItems?.parentElement ?? row).columnGap) || 0,
        tabs: [...toolbar.children]
          .filter((each) => each.localName === "ui-item" && !(each as HTMLElement).hidden)
          .map((tab) => ({
            name: tab.getAttribute("label") ?? "",
            ...box(tab.shadowRoot?.querySelector("[part~=item]"))!,
            isChosen: tab.matches(":state(selected)")
          })),
        thumbEnd: row.classList.contains("thumbed") ? thumbX + thumbWidth : undefined
      }
    })

  /** Show each of `count` files of the project, the last one chosen. */
  const openFiles = async (count: number) => {
    const files = await page.evaluate(() =>
      (window as unknown as { project: { files: { path: string }[] } }).project.files.map((file) => file.path)
    )
    for (const path of files.slice(0, count)) {
      await page.evaluate(
        (each) => (window as unknown as { editor: { showEditor(path: string): void } }).editor.showEditor(each),
        path
      )
      await page.waitForTimeout(600)
    }
    await page.waitForTimeout(SETTLE_MS)
  }

  /** Press one of the top bar's modes, and let the page settle. */
  const pressMode = async (mode: RegExp) => {
    await page.locator(".ModeTabs ui-item", { hasText: mode }).click()
    await page.waitForTimeout(SETTLE_MS)
  }

  /** The row's state that matters:  the same tabs, the chosen one, and each tab in view or not. */
  const shape = (bar: TabBar) => ({
    tabs: bar.tabs.map((tab) => tab.name),
    chosen: bar.tabs.find((tab) => tab.isChosen)?.name
  })

  /** The row is sane:  no room past its tabs, the thumb on its tab, the chosen tab in view. */
  const expectSaneRow = (bar: TabBar) => {
    const chosen = bar.tabs.find((tab) => tab.isChosen)!
    expect(chosen).toBeDefined()
    // the row scrolls only as far as its tabs go:  it slid 5,700px past 8 tabs (I38)
    const tabsWidth = bar.tabs.reduce((sum, tab) => sum + tab.right - tab.left, 0)
    expect(bar.row.scrollWidth).toBeLessThan(tabsWidth + 40)
    // the thumb under the chosen tab, where that tab is in the row's content
    const chosenEnd = chosen.right - bar.row.left + bar.row.scrollLeft
    expect(Math.abs(bar.thumbEnd! - chosenEnd)).toBeLessThan(2)
    // the chosen tab in view
    expect(chosen.left).toBeGreaterThanOrEqual(bar.row.left - 1)
    expect(chosen.right).toBeLessThanOrEqual(bar.row.right + 1)
  }

  beforeAll(async () => {
    browser = await chromium.launch()
    context = await browser.newContext({ viewport: { width: 1400, height: 860 } })
    // every save is answered here, and goes nowhere
    await context.route(/\/api\/projects\/file\/|\.(spell)(\?.*)?$/, (route) => {
      const request = route.request()
      if (request.isNavigationRequest() || request.method() === "GET") return route.continue()
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
    })
    page = await context.newPage()
  })

  afterAll(async () => {
    await browser?.close()
  })

  test("Site shows the site editor, and Edit brings back the same tabs, every one in view (I38, I39)", async () => {
    await page.goto(`${EDITOR}edit/${SITE}`)
    await page.locator(".FileTabs ui-toolbar").first().waitFor({ timeout: 30_000 })
    await openFiles(3)
    const before = await tabBar()
    expect(before.tabs).toHaveLength(3)

    await pressMode(/Site/)
    expect(page.url()).toContain(`/site/${SITE}`)
    expect(await page.locator(".SiteCard").count()).toBeGreaterThan(0)
    expect(await page.locator(".FileTabs").count()).toBe(0)

    await pressMode(/Edit/)
    expect(page.url()).toContain(`/edit/${SITE}/`)
    const after = await tabBar()
    expect(shape(after)).toEqual(shape(before))
    expectSaneRow(after)
    // they fit:  no `›`, no list of every file, every tab whole inside the row (I39)
    expect(after.scrollEnd).toBeUndefined()
    expect(after.allItems).toBeUndefined()
    for (const tab of after.tabs) {
      expect(tab.left).toBeGreaterThanOrEqual(after.row.left - 1)
      expect(tab.right).toBeLessThanOrEqual(after.row.right + 1)
    }
  })

  test("with more files than tabs, the round trip keeps the row, and its › sits by the file menu (I38, I39)", async () => {
    // a narrower window, so the 8 tabs overflow the code pane's bar
    await page.setViewportSize({ width: 1100, height: 860 })
    await page.goto(`${EDITOR}edit/${MANY_FILES}`)
    await page.locator(".FileTabs ui-toolbar").first().waitFor({ timeout: 30_000 })
    await openFiles(10)
    const before = await tabBar()
    expect(before.tabs).toHaveLength(8)
    expectSaneRow(before)

    // the site editor's page, and back:  the file tabs drawn again, from what they remember
    await page.evaluate(() => (window as unknown as { editor: { showSiteEditor(): void } }).editor.showSiteEditor())
    await page.waitForTimeout(SETTLE_MS)
    expect(await page.locator(".FileTabs").count()).toBe(0)
    await pressMode(/Edit/)

    const after = await tabBar()
    expect(shape(after)).toEqual(shape(before))
    expectSaneRow(after)
    // the row runs to the file menu:  its `›` right before it, the bar's gap between them (I39)
    expect(after.scrollEnd).toBeDefined()
    expect(after.allItems).toBeDefined()
    expect(Math.abs(after.allItems!.left - after.gap - after.row.right)).toBeLessThan(2)
    expect(Math.abs(after.scrollEnd!.right - after.row.right)).toBeLessThan(2)
  })
})
