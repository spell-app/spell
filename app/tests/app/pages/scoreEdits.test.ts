import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"

/**
 * The app's own stored values stay editable in the Inspector (epic `editor` I242):
 * Solitaire's Score, which the code gives no starting value.
 * - Owen:  "Score should be editable".
 * - A one of a kind's changes go to its type (I183), where a value with no starting value was taken for one
 *   the code works out, so it was read only;  now a change runs at once, its note saying it won't be kept.
 * - A real getter stays read only:  a card's Is a face card.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.  Nothing reaches the disk.
 */

describe.skipIf(!SERVING)("the app's stored values in the Inspector", { timeout: 180_000 }, () => {
  let browser: Browser
  let page: Page

  /** Inspect the first of the program's things with `property`, as a click on it does. */
  const inspect = (property: string) =>
    page.evaluate(async (property) => {
      const { editor, Inspector } = window as unknown as {
        editor: { loadRuntime(): Promise<{ core: { things: { all(): object[] } } }> }
        Inspector: { inspectThing(thing: object): void; isOpen: boolean; toggle(): void }
      }
      const { core } = await editor.loadRuntime()
      const thing = core.things.all().find((each) => property in each)!
      if (!Inspector.isOpen) Inspector.toggle()
      Inspector.inspectThing(thing)
    }, property)

  /** The app's score, as the program holds it, and as its field and its drawing show it. */
  const score = () =>
    page.evaluate(async () => {
      const { editor } = window as unknown as {
        editor: { loadRuntime(): Promise<{ core: { things: { all(): object[] } } }> }
      }
      const { core } = await editor.loadRuntime()
      const app = core.things.all().find((each) => "score" in each) as { score: number }
      const field = document.querySelector('ui-property[name="score"] ui-input') as HTMLElement & { value: string }
      return { score: app.score, field: field.value, isReadOnly: field.hasAttribute("readonly") }
    })

  beforeAll(async () => {
    browser = await chromium.launch()
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    // nothing reaches the disk
    await context.route(/\/api\/projects\/file\//, (route) =>
      route.request().method() === "GET"
        ? route.continue()
        : route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
    )
    page = await context.newPage()
    await page.goto(`${EDITOR}edit/@spell/examples/Solitaire`, { timeout: 60_000 })
    await page.waitForFunction(() => !!(window as unknown as { Inspector?: unknown }).Inspector, undefined, {
      timeout: 60_000
    })
    await page.waitForTimeout(6000)
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
  })

  test("Score takes what's typed, and the program's score changes", async () => {
    await inspect("score")
    await page.waitForSelector('ui-property[name="score"] ui-input', { timeout: 15_000 })
    await page.waitForTimeout(1000)
    expect((await score()).isReadOnly, "Score:  not read only").toBe(false)
    const input = page.locator('ui-property[name="score"] input').first()
    await input.click()
    await input.press("ControlOrMeta+a")
    await page.keyboard.type("42")
    await page.keyboard.press("Enter")
    await page.waitForTimeout(1000)
    expect(await score()).toMatchObject({ score: 42, field: "42" })
  })

  test("a card's Is a face card, a getter, stays read only", async () => {
    await inspect("isAFaceCard")
    await page.waitForSelector("ui-property.InspectorComputed", { timeout: 15_000 })
    await page.waitForTimeout(1000)
    const face = await page.evaluate(() => {
      const property = [...document.querySelectorAll("ui-property.InspectorComputed")].find((each) =>
        /face card/i.test(each.getAttribute("label") ?? "")
      )
      return { shows: !!property, isReadOnly: !!property?.matches(":state(readonly)") }
    })
    expect(face).toEqual({ shows: true, isReadOnly: true })
  })
})
