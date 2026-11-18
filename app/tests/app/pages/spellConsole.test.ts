import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"

/**
 * The Spell Console (epic `editor` P32):  a line of Spell typed under the console's lines runs on the running app,
 * as the browser's console does (Q38);  and Explain This, on the code's right-click menu (Q39, Q40).
 * - Counter, clicked three times:  the lines read and change ITS count, the app left running.
 * - Explain This asks NO real Claude:  `/api/explain` is answered here.
 * - Nothing is saved:  no line is typed into the code.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** What the stand-in Claude says of any code. */
const EXPLAINED = "Draws a button that counts its clicks."

describe.skipIf(!SERVING)("the Spell Console", { timeout: 240_000 }, () => {
  let browser: Browser
  let page: Page
  /** What the editor asked `/api/explain`. */
  let asked: { code?: string; language?: string } | undefined
  /** How the stand-in server answers `/api/explain`. */
  let explain: { status?: number; json: unknown } = { json: { explanation: EXPLAINED } }

  const button = () => page.locator(".AppPaneBody ui-button").first()
  const input = () => page.locator(".SpellConsoleInput .cm-content")

  /** The text in the console's line, without its placeholder. */
  const typedText = () =>
    page.evaluate(() => {
      const content = document.querySelector(".SpellConsoleInput .cm-content")!.cloneNode(true) as HTMLElement
      content.querySelectorAll(".cm-placeholder").forEach((it) => it.remove())
      return content.textContent ?? ""
    })

  /** Type `line` into the console's line, then Return. */
  async function run(line: string): Promise<void> {
    await input().click()
    await page.keyboard.type(line)
    await page.keyboard.press("Enter")
  }

  /** The text of the console's last line of `level` (`typed`, `answer`, `error`). */
  const last = (level: string) =>
    page.evaluate((level) => {
      const lines = [...document.querySelectorAll(`.ProgramPanel .ConsoleLine.${level}`)]
      return (lines.at(-1) as HTMLElement | undefined)?.innerText.trim()
    }, level)

  beforeAll(async () => {
    browser = await chromium.launch()
    const context = await browser.newContext({ viewport: { width: 1400, height: 900 } })
    await context.route(/\/api\/explain/, (route) => {
      asked = route.request().postDataJSON() as typeof asked
      return route.fulfill(explain)
    })
    page = await context.newPage()
    await page.goto(`${EDITOR}edit/@spell/examples/Counter`, { timeout: 60_000 })
    await page.waitForSelector(".AppPaneBody ui-button", { timeout: 60_000 })
    await page.waitForTimeout(3000)
    for (let clicks = 0; clicks < 3; clicks++) await button().click()
    if (!(await page.locator(".ProgramPanel").count())) {
      await page.getByText("View", { exact: true }).first().click()
      await page.waitForTimeout(500)
      await page.getByText("Program Panel", { exact: true }).first().click()
    }
    await page.locator('.ProgramPanel [data-tab="output"]').first().click()
    await input().waitFor({ timeout: 30_000 })
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
  })

  test("a line reads the running app:  the line as typed, then its answer", async () => {
    await run("counter app's counter's count")
    await expect.poll(() => last("typed"), { timeout: 10_000 }).toBe("counter app's counter's count")
    await expect.poll(() => last("answer"), { timeout: 10_000 }).toBe("3")
    expect(await typedText()).toBe("")
  })

  test("a line changes the running app, its things kept (Q38)", async () => {
    await run("count up of counter app's counter")
    await expect.poll(() => button().innerText(), { timeout: 10_000 }).toBe("Clicked 4 times")
  })

  test("what a line declares, later lines know", async () => {
    await run("x is 3")
    await expect.poll(() => last("answer"), { timeout: 10_000 }).toBe("3")
    await run("x + 4")
    await expect.poll(() => last("answer"), { timeout: 10_000 }).toBe("7")
  })

  test("a line that isn't Spell says why, in red, and the app keeps running", async () => {
    await run("foo bar baz")
    await expect.poll(() => last("typed"), { timeout: 10_000 }).toBe("foo bar baz")
    await expect.poll(async () => (await last("error")) ?? "", { timeout: 10_000 }).not.toBe("")
    await button().click()
    await expect.poll(() => button().innerText(), { timeout: 10_000 }).toBe("Clicked 5 times")
  })

  test("Up brings back the line before", async () => {
    await input().click()
    await page.keyboard.press("ArrowUp")
    expect(await typedText()).toBe("foo bar baz")
    await page.keyboard.press("ArrowUp")
    expect(await typedText()).toBe("x + 4")
    await page.keyboard.press("ArrowDown")
    await page.keyboard.press("ArrowDown")
    expect(await typedText()).toBe("")
  })

  /** Right-click the counter's `to draw it`, then Explain This:  its modal. */
  async function explainDrawing() {
    const head = page.locator(".InputEditor .cm-line", { hasText: "to draw it" }).first()
    await head.click({ button: "right" })
    await page.getByText("Explain This", { exact: true }).first().click()
    const modal = page.locator(".ExplainThis")
    await modal.waitFor({ timeout: 15_000 })
    return modal
  }

  /** Close the modal, and wait till it's gone. */
  async function close() {
    await page.locator(".ExplainThis ui-button.cancel").click()
    await expect.poll(() => page.locator(".ExplainThis").count(), { timeout: 10_000 }).toBe(0)
  }

  test("Explain This on an action's head line:  the whole action, line by line, then Claude's summary;  nothing run", async () => {
    explain = { json: { explanation: EXPLAINED } }
    const modal = await explainDrawing()
    await expect
      .poll(() => modal.locator(".words ui-markdown.summary").textContent(), { timeout: 15_000 })
      .toBe(EXPLAINED)
    // the whole action, from its margin:  its head, then its body
    expect(asked?.code).toMatch(/^to draw it\n/)
    expect(asked?.code).toContain("<button")
    expect(asked?.language).toBe("en")
    expect(await modal.locator("section.code ui-code").textContent()).toMatch(/^to draw it\n/)
    // the editor's own words, a line each:  the action's head first, no comment lines (they're words already)
    const lines = await modal.locator(".lines > li > code").allInnerTexts()
    expect(lines[0]).toBe("to draw it")
    expect(lines.some((line) => line.startsWith("//"))).toBe(false)
    expect(await modal.locator(".lines > li ui-markdown").first().textContent()).toBeTruthy()
    expect(await button().innerText()).toBe("Clicked 5 times")
    await close()
  })

  test("with no Claude here, the lines stand alone:  no error, nothing alarming", async () => {
    explain = { status: 409, json: { error: "POST /api/explain:  Claude Code isn't on this machine" } }
    const errorBefore = await page.evaluate(() =>
      String((window as unknown as { editor: { error?: unknown } }).editor.error)
    )
    const modal = await explainDrawing()
    await expect.poll(() => modal.locator(".asking").count(), { timeout: 15_000 }).toBe(0)
    expect(await modal.locator(".summary").count()).toBe(0)
    expect(await modal.locator(".lines > li").count()).toBeGreaterThan(0)
    const errorAfter = await page.evaluate(() =>
      String((window as unknown as { editor: { error?: unknown } }).editor.error)
    )
    expect(errorAfter).toBe(errorBefore)
    await close()
  })
})
