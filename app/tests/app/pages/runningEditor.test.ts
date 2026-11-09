import { chromium } from "playwright"
import { describe, expect, test } from "vite-plus/test"

import { stoppedPagesReport } from "./runningEditor"

/** Telling a test its page stopped:  a blank page, so it needs no editor. */
describe("runningEditor:  a stopped page", { timeout: 60_000 }, () => {
  /** A new browser's blank page, `say` run in it, then what's reported;  its own browser closed again. */
  async function reportAfter(say: string): Promise<string | undefined> {
    const browser = await chromium.launch()
    try {
      const page = await (await browser.newContext()).newPage()
      await page.goto("about:blank")
      await page.evaluate(say)
      await page.waitForTimeout(200)
      return stoppedPagesReport()
    } finally {
      await browser.close()
    }
  }

  test("a page where Solid halted is reported, with the error that did it", async () => {
    const report = await reportAfter(`
      console.error("[REACTIVITY_HALTED] An uncaught error halted the reactive system.\\n  in span.children")
      setTimeout(() => { throw new TypeError("the first error") })
    `)
    expect(report).toMatch(/updates stopped for good/)
    expect(report).toMatch(/in span\.children/)
    expect(report).toMatch(/the first error/)
  })

  test("once:  asking again finds nothing", async () => {
    await reportAfter(`console.error("[REACTIVITY_HALTED] An uncaught error halted the reactive system.")`)
    expect(stoppedPagesReport()).toBeUndefined()
  })

  test("a later notice about the same stop, or any other error, isn't a stop", async () => {
    expect(await reportAfter(`console.error("[REACTIVITY_HALTED] Update ignored:  already halted")`)).toBeUndefined()
    expect(await reportAfter(`console.error("Failed to load resource")`)).toBeUndefined()
  })
})
