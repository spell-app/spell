import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { CodeEditor, EDITOR, SERVING } from "./runningEditor"

/**
 * The Inspector's Views tree and selection across a reload of Solitaire, while its deal draws the cards
 * (epic `editor` I171;  Owen:  "cards added to the columns are flashing visible for a second then get hidden").
 * - Rows opened by hand, and what's selected, are remembered by each part's path (`partKeysFor()`):
 *   by its place among all the parts, a column opened by hand moved to the next column each time a card was dealt.
 * - NOTHING reaches the disk:  every save is answered here, so the built-in examples can't change.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** Solitaire, in the editor. */
const SOLITAIRE = `${EDITOR}edit/@spell/examples/Solitaire`

/** The page's debug globals, what's used of them. */
type DebugGlobals = {
  Inspector: { allSelected: { element: Element }[]; select(element: Element | undefined): void }
  __views: { open: string[]; selected: string[] }[]
}

/** Open Solitaire, its code showing, with the Inspector open. */
async function open(page: Page): Promise<void> {
  await page.goto(SOLITAIRE, { timeout: 60_000 })
  await new CodeEditor(page).shown()
  await page.waitForTimeout(4000)
  if (!(await page.locator(".InspectorTree").count())) {
    await page.evaluate(() => (window as unknown as { Inspector: { toggle(): void } }).Inspector.toggle())
    await page.waitForTimeout(1500)
  }
}

/** The pile `id`'s element in the app, `C5`. */
function pileRow(page: Page, id: string) {
  return page
    .locator(".InspectorTree ui-tree-item[title=solitaire-column]")
    .filter({ hasText: `"${id}"` })
    .first()
}

describe.skipIf(!SERVING)("the Views tree and the selection, across a reload", { timeout: 180_000 }, () => {
  let browser: Browser
  let page: Page

  beforeAll(async () => {
    browser = await chromium.launch()
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await context.route(/\/api\/projects\/file\/|\.(spell)(\?.*)?$/, (route) =>
      route.request().method() === "GET"
        ? route.continue()
        : route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
    )
    // every frame, which piles' rows are open and what's selected:  so a row open for one frame is seen
    await context.addInitScript(() => {
      const globals = window as unknown as DebugGlobals
      globals.__views = []
      const sample = () => {
        globals.__views.push({
          open: [
            ...document.querySelectorAll(
              ".InspectorTree ui-tree-item[open][title^=solitaire-]:not([title=solitaire-app])"
            )
          ].map((row) => row.getAttribute("which") || row.getAttribute("label") || ""),
          selected: (globals.Inspector?.allSelected ?? []).map(({ element }) => `${element.localName}#${element.id}`)
        })
        requestAnimationFrame(sample)
      }
      requestAnimationFrame(sample)
    })
    page = await context.newPage()
  }, 120_000)

  afterAll(() => browser?.close())

  test("a column opened by hand stays the only one open while the cards are dealt;  the selected column stays selected", async () => {
    await open(page)
    // open C5's row as a click on its caret does, and select C3
    await pileRow(page, "C5").evaluate((row) => row.dispatchEvent(new CustomEvent("ui-opening", { bubbles: true })))
    await page.evaluate(() =>
      (window as unknown as DebugGlobals).Inspector.select(document.querySelector(".AppPaneBody solitaire-column#C3")!)
    )
    await page.waitForTimeout(800)

    await open(page)
    await page.waitForTimeout(3000)
    const frames = await page.evaluate(() => (window as unknown as DebugGlobals).__views)
    const opened = new Set(frames.flatMap((frame) => frame.open))
    expect([...opened], "no other pile's row opened, even for a frame").toEqual(['"C5"'])
    const selected = new Set(frames.flatMap((frame) => frame.selected))
    expect([...selected], "only C3 was ever selected").toEqual(["solitaire-column#C3"])
  })

  test("a card selected is the same card after a reload, wherever the new deal put it", async () => {
    await open(page)
    const card = await page.evaluate(() => {
      const element = document.querySelector(".AppPaneBody solitaire-column#C7 > solitaire-card:last-child")!
      ;(window as unknown as DebugGlobals).Inspector.select(element)
      return element.id
    })
    await page.waitForTimeout(800)
    await open(page)
    await page.waitForTimeout(3000)
    const frames = await page.evaluate(() => (window as unknown as DebugGlobals).__views)
    const selected = new Set(frames.flatMap((frame) => frame.selected))
    expect([...selected], "never another card, even for a frame").toEqual([`solitaire-card#${card}`])
  })
})
