import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { CodeEditor, EDITOR, SERVING } from "./runningEditor"

/**
 * A pause in typing sends no built files;  Save does;  Cmd-Enter prints the program (epic `solid-2-final` P9).
 * - Solitaire's Card.spell, a few keys typed into a comment.
 * - NOTHING reaches the disk:  every write is answered here, and counted.
 * - Needs this checkout's editor running:  `spell server start all`.  Skips itself when it isn't, as in CI.
 * - Headless Playwright, never a real browser window.
 */

/** A compile and a run after the pause, at most:  `EDIT_COMPILE_DELAY` is 2 seconds. */
const SETTLE_MS = 6000

/** The names of the built files a compile writes, as a save sends them. */
const BUILT = /\.(spell\.js|spell\.js\.map|declarations\.json5|en\.js)$/

describe.skipIf(!SERVING)("quick typing", { timeout: 180_000 }, () => {
  let browser: Browser
  let page: Page
  /** Every write the page sent, by the file's name. */
  const writes: string[] = []

  beforeAll(async () => {
    browser = await chromium.launch()
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await context.route(/\/api\/|\/spaces\//, (route) => {
      const request = route.request()
      if (request.isNavigationRequest() || request.method() === "GET") return route.continue()
      writes.push(new URL(request.url()).pathname.split("/").at(-1)!)
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
    })
    page = await context.newPage()
    await page.goto(`${EDITOR}edit/@spell/examples/Solitaire/Card.spell`, { timeout: 90_000 })
    await new CodeEditor(page).shown(90_000)
    await page.waitForSelector(".AppPaneBody solitaire-card", { timeout: 90_000, state: "attached" })
    await page.waitForTimeout(SETTLE_MS)
  }, 150_000)

  afterAll(async () => {
    await browser?.close()
  })

  test("a pause in typing runs the edit, and sends no built file;  Save sends them", async () => {
    const runs = await page.evaluate(
      () => (window as unknown as { editor: { programRuns: number } }).editor.programRuns
    )
    await page.evaluate(() => {
      const { view } = (window as unknown as CodeWindow).editor.shownCodeEditor
      view.dispatch({ selection: { anchor: view.state.doc.line(2).to } })
      view.focus()
    })
    writes.length = 0
    for (const key of [" ", "o", "k"]) {
      await page.keyboard.press(key)
      await page.waitForTimeout(90)
    }
    await page.waitForTimeout(SETTLE_MS)
    expect(writes.filter((name) => BUILT.test(name))).toEqual([])
    expect(
      await page.evaluate(() => (window as unknown as { editor: { programRuns: number } }).editor.programRuns)
    ).toBe(runs + 1)

    writes.length = 0
    await page.keyboard.press("Meta+s")
    await page.waitForTimeout(3000)
    expect(writes.filter((name) => BUILT.test(name)).length).toBeGreaterThan(0)
  })

  test("Cmd-Enter prints the compiled program in the program's console", async () => {
    const printed = await page.evaluate(async () => {
      const { editor } = window as unknown as {
        editor: { compileApp(): Promise<void>; loadRuntime(): Promise<Runtime> }
      }
      const runtime = await editor.loadRuntime()
      const logged: string[] = []
      const { log } = runtime.core.console
      runtime.core.console.log = (...values: unknown[]) => {
        logged.push(values.map(String).join(" "))
        return log.apply(runtime.core.console, values)
      }
      try {
        await editor.compileApp()
      } finally {
        runtime.core.console.log = log
      }
      return logged.some((line) => /^\s+0 {2}/.test(line))
    })
    expect(printed).toBe(true)
  })
})

/** What the page functions read of the editor's code pane. */
type CodeWindow = Window & {
  editor: {
    shownCodeEditor: {
      view: {
        state: { doc: { line(number: number): { to: number } } }
        dispatch(spec: { selection: { anchor: number } }): void
        focus(): void
      }
    }
  }
}

/** The runtime's console, as the page function patches it. */
type Runtime = { core: { console: { log: (...values: unknown[]) => unknown } } }
