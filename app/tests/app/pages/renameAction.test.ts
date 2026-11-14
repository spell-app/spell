import { chromium, type Browser, type BrowserContext, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"

/**
 * Renaming an action by its name in the Inspector's Code card, on Solitaire (epic `editor` I111):
 * a click on `cheat` makes it a field, and leaving the field renames it everywhere it's named.
 * - NOTHING reaches the disk:  every save is answered here, and a file read back is what was "saved",
 *   so the built-in examples can't change.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** What a compile and redraw takes, at most. */
const SETTLE_MS = 2500

describe.skipIf(!SERVING)("Renaming an action in the Inspector", { timeout: 180_000 }, () => {
  let browser: Browser
  let context: BrowserContext
  let page: Page

  /** Every spell file of Solitaire, as the editor holds them now, one after another. */
  const allFiles = () =>
    page.evaluate(() =>
      (window as unknown as { project: { spellFiles: { contents: string }[] } }).project.spellFiles
        .map((file) => file.contents)
        .join("\n")
    )

  /** How many times `words` is in `text`. */
  const count = (text: string, words: string) => text.split(words).length - 1

  /** The field for the action called `words`, opened by a click on its name. */
  const openField = async (words: string) => {
    const name = page.locator(".InspectorActionName").filter({ hasText: new RegExp(`^${words}$`) })
    await name.scrollIntoViewIfNeeded()
    await name.click()
    const field = page.locator(".InspectorActionNameField")
    await expect.poll(() => field.count()).toBe(1)
    // its words chosen, to type over
    await page.waitForTimeout(300)
    return field
  }

  beforeAll(async () => {
    browser = await chromium.launch()
    context = await browser.newContext({ viewport: { width: 1500, height: 950 } })
    // saves answered here;  a file the editor reads back after saving is what it saved
    const saved = new Map<string, string>()
    await context.route(/\/api\/(projects\/file|prefs)\//, (route) => {
      const request = route.request()
      if (request.method() === "GET") return route.continue()
      const at = request.url().match(/\/api\/projects\/file\/(.*?)(\?|$)/)?.[1]
      if (at) {
        let body = request.postData() ?? ""
        try {
          const json = JSON.parse(body) as { contents?: unknown }
          if (typeof json.contents === "string") body = json.contents
        } catch {
          // a body that isn't JSON is the file's text
        }
        saved.set(decodeURIComponent(at), body)
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
    })
    await context.route(/\/spaces\/.*\.spell(\?|$)/, (route) => {
      const at = decodeURIComponent(
        route
          .request()
          .url()
          .match(/\/spaces\/(.*?)(\?|$)/)![1]!
      )
      const text = saved.get(at)
      return text === undefined
        ? route.continue()
        : route.fulfill({ status: 200, contentType: "text/plain", body: text })
    })
    page = await context.newPage()
    await page.goto(`${EDITOR}edit/@spell/examples/Solitaire`, { timeout: 60_000 })
    await page.waitForSelector(".InputEditor .monaco-editor .view-line", { timeout: 60_000 })
    await page.waitForTimeout(3000)
    if (!(await page.evaluate(() => !!document.querySelector(".InspectAppButton.inspecting")))) {
      await page.locator(".InspectAppButton [part~=item]").first().click({ force: true })
    }
    await page.waitForTimeout(1500)
    // the game's top bar, then the app itself, from the Views card
    const bar = (await page.locator("solitaire-app").first().boundingBox())!
    await page.mouse.click(bar.x + bar.width / 2, bar.y + 36)
    await page.waitForTimeout(SETTLE_MS)
    await page.locator(".InspectorViews").getByText("Solitaire", { exact: true }).first().click({ force: true })
    await page.waitForTimeout(SETTLE_MS)
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
  })

  test("Esc leaves it as it was", async () => {
    const before = await allFiles()
    await openField("cheat")
    await page.keyboard.type("nope")
    await page.keyboard.press("Escape")
    await expect.poll(() => page.locator(".InspectorActionNameField").count()).toBe(0)
    expect(await allFiles()).toBe(before)
  })

  test("a name another member has is refused at the field, in words, and nothing is renamed", async () => {
    const before = await allFiles()
    const field = await openField("cheat")
    const row = page.locator("ui-section.InspectorEvent.action").filter({ has: field })
    // a property of the app's
    await page.keyboard.type("score")
    await page.keyboard.press("Enter")
    const error = page.locator(".InspectorActionNameError")
    await expect.poll(() => error.count()).toBe(1)
    // what has the name, then the link back (I139)
    expect(await error.innerText()).toBe('There is already a property named "score."\nRestore "cheat"')
    expect(await field.getAttribute("state")).toBe("error")
    expect(await allFiles()).toBe(before)
    // another action's, and leaving by Tab
    await page.keyboard.press("ControlOrMeta+a")
    await page.keyboard.type("auto play")
    // a Space typed never folds the row around the field
    expect(await row.getAttribute("open")).not.toBe("false")
    await page.keyboard.press("Tab")
    await expect.poll(() => error.innerText()).toBe('There is already an action named "auto play."\nRestore "cheat"')
    expect(await allFiles()).toBe(before)
    // the Tab brings the focus back to the field, never on to the row's run button, ringed
    expect(await page.evaluate(() => document.activeElement?.className)).toContain("InspectorActionNameField")
    // never the error banner
    expect(await page.evaluate(() => !!(window as unknown as { editor: { error?: unknown } }).editor.error)).toBe(false)
    await page.keyboard.press("Escape")
    await expect.poll(() => field.count()).toBe(0)
  })

  test("Restore puts the old name back and closes the field", async () => {
    const before = await allFiles()
    const field = await openField("cheat")
    await page.keyboard.type("score")
    await page.keyboard.press("Enter")
    const restore = page.locator(".InspectorActionNameRestoreLink")
    await expect.poll(() => restore.count()).toBe(1)
    await restore.click()
    await expect.poll(() => field.count()).toBe(0)
    expect(
      await page
        .locator(".InspectorActionName")
        .filter({ hasText: /^cheat$/ })
        .count()
    ).toBe(1)
    await page.waitForTimeout(500)
    expect(await allFiles()).toBe(before)
    expect(await page.evaluate(() => !!(window as unknown as { editor: { error?: unknown } }).editor.error)).toBe(false)
  })

  test("leaving the field renames it everywhere it's named, as one undo", async () => {
    const before = await allFiles()
    const buttons = count(before, '<action "cheat"/>')
    expect(buttons).toBeGreaterThan(0)
    await openField("cheat")
    await page.keyboard.type("peek at a card")
    // a click away
    await page.locator(".InspectorViews").getByText("Solitaire", { exact: true }).first().click({ force: true })
    await expect.poll(allFiles, { timeout: 10_000 }).toContain('to "peek at a card" with shortcut "C", icon "eye"')
    await page.waitForTimeout(SETTLE_MS)
    const after = await allFiles()
    expect(count(after, '"cheat"')).toBe(0)
    expect(count(after, '<action "peek at a card"/>')).toBe(buttons)
    // one undo takes the head and every button back
    await page.keyboard.press("ControlOrMeta+z")
    await expect.poll(allFiles, { timeout: 10_000 }).toBe(before)
  })
})
