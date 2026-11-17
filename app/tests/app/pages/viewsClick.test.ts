import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { CodeEditor, EDITOR, SERVING } from "./runningEditor"

/**
 * A click on a row of the Inspector's Views tree inspects that part (epic `editor` I236):
 * the properties card's header names it.
 * - Owen:  "Clicking an item in the views menu doesn't inspect it".
 * - The cause:  a change to the Inspector's code, hot-swapped into an open page, made a second Inspector
 *   (`Inspector` and `InspectorParts` import each other):  the tree chose parts in the new one,
 *   the cards showed the old one's.  Now such a change reloads the page.
 *   - Not tested here:  these tests' pages never take Vite's swaps (`runningEditor`, "Code as it was loaded").
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** Solitaire, in the editor. */
const SOLITAIRE = `${EDITOR}edit/@spell/examples/Solitaire`

/** The page's debug globals, what's used of them. */
type DebugGlobals = { Inspector: { toggle(): void } }

/** Open the Inspector, if it isn't. */
async function openInspector(page: Page): Promise<void> {
  if (await page.locator(".InspectorTree").count()) return
  await page.evaluate(() => (window as unknown as DebugGlobals).Inspector.toggle())
  await page.locator(".InspectorTree").waitFor({ timeout: 10_000 })
}

/** Click the words of the Views tree's row labelled `label`, as a person would. */
async function clickRow(page: Page, label: string): Promise<void> {
  const row = page.locator(`.InspectorTree ui-tree-item[label="${label}"]`).first()
  await row.scrollIntoViewIfNeeded()
  const box = await row.evaluate((each) => {
    const { x, y, height } = each.shadowRoot!.querySelector(".words")!.getBoundingClientRect()
    return { x: x + 10, y: y + height / 2 }
  })
  await page.mouse.click(box.x, box.y, { delay: 80 })
}

/** What the properties card's header names:  the part inspected. */
function inspected(page: Page): Promise<string> {
  return page.evaluate(
    () => document.querySelector("ui-panel.InspectorCard ui-item")?.textContent?.trim().replace(/\s+/g, " ") ?? ""
  )
}

describe.skipIf(!SERVING)("a click on a Views row", { timeout: 120_000 }, () => {
  let browser: Browser
  let page: Page

  beforeAll(async () => {
    browser = await chromium.launch()
    page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
    await page.goto(SOLITAIRE, { timeout: 60_000 })
    await new CodeEditor(page).shown()
    await page.waitForTimeout(3000)
    await openInspector(page)
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
  })

  test("inspects that part", async () => {
    await clickRow(page, "Segment")
    await expect.poll(() => inspected(page), { timeout: 8000 }).toBe("<ui-segment />")
    await clickRow(page, "Menu")
    await expect.poll(() => inspected(page), { timeout: 8000 }).toBe("<ui-toolbar />")
  })
})
