import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { CodeEditor, EDITOR, SERVING } from "./runningEditor"

/**
 * A type's property editor in a file of its own (epic `editor` P25):  Solitaire's `Card.editor.spell`,
 * opened in the editor and tweaked, and the Inspector on a card shows the tweak.
 * - Owen:  "if I wanted to edit the property-editor, I could open that file in the spell editor and just tweak it".
 * - NOTHING reaches the disk:  every save is answered here, so the built-in example can't change.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** The page's debug globals, what's used of them. */
type DebugGlobals = {
  editor: {
    /** Show `path`'s file in the code pane. */
    showEditor(path: string): void
  }
}

/** The labels the Inspector's property editor shows, as drawn. */
function shownLabels(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll("ui-property-editor ui-property")].map((each) => each.getAttribute("label") ?? "")
  )
}

/** Select the first card on the table by a click on it, with Inspect app on. */
async function selectACard(page: Page): Promise<void> {
  if ((await page.locator(".InspectAppButton").first().getAttribute("aria-pressed")) !== "true") {
    await page.locator(".InspectAppButton [part~=item]").first().click()
  }
  const at = await page.evaluate(() => {
    const card = [...document.querySelectorAll("*")]
      .flatMap((each) => [each, ...(each.shadowRoot ? each.shadowRoot.querySelectorAll("*") : [])])
      .find((each) => each.localName === "solitaire-card")!
    const box = card.getBoundingClientRect()
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  })
  await page.mouse.click(at.x, at.y)
  await page.waitForSelector("ui-property-editor", { timeout: 8000 })
  await page.waitForTimeout(500)
}

describe.skipIf(!SERVING)("a type's property editor in its own file", () => {
  let browser: Browser
  let page: Page

  beforeAll(async () => {
    browser = await chromium.launch()
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    // saves answered here:  the example on disk never changes;  a read of a saved file gets what was saved,
    // as the editor reads its open file again after a save
    const saved = new Map<string, string>()
    await context.route(/\/api\/projects\/file\/|\.(spell)(\?.*)?$/, (route) => {
      const request = route.request()
      const tail = decodeURI(new URL(request.url()).pathname).split("/").slice(-3).join("/")
      if (request.method() !== "GET") {
        saved.set(tail, request.postData() ?? "")
        return route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
      }
      return saved.has(tail) ? route.fulfill({ contentType: "text/plain", body: saved.get(tail)! }) : route.continue()
    })
    page = await context.newPage()
    await page.goto(`${EDITOR}edit/@spell/examples/Solitaire/Card.editor.spell`, { timeout: 60_000 })
    await new CodeEditor(page).shown()
    await page.waitForTimeout(4000)
    await page.evaluate(() => (window as unknown as { Inspector: { toggle(): void } }).Inspector.toggle())
    await page.waitForTimeout(1000)
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
  })

  test("the Inspector on a card reads Card.editor.spell", async () => {
    await selectACard(page)
    expect(await shownLabels(page)).toContain("Rank")
  }, 60_000)

  test("a label tweaked in the file shows in the Inspector, once saved", async () => {
    // selecting the card followed it to Card.spell:  back to its editor's file
    await page.evaluate(() =>
      (window as unknown as DebugGlobals).editor.showEditor("@spell/examples/Solitaire/Card.editor.spell")
    )
    const code = new CodeEditor(page)
    await expect.poll(async () => (await code.text()).includes("property editor"), { timeout: 15_000 }).toBe(true)
    const at = await code.lineOf('label="Rank"')
    await code.focus()
    await code.setCaret(at, (await code.line(at)).indexOf('label="Rank"') + 'label="Rank'.length + 1)
    await page.keyboard.type(" of the card")
    await page.keyboard.press("ControlOrMeta+s")
    await page.waitForTimeout(1500)
    await selectACard(page)
    expect(await shownLabels(page)).toContain("Rank of the card")
  }, 60_000)
})
