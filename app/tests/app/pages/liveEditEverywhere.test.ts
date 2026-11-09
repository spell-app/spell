import { chromium, type Browser, type BrowserContext, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"

/**
 * A program that imports another project takes an edit as it runs, its things kept (epic `editor`, Live Edit Everywhere).
 * - The frozen `counter-app`, which draws the frozen `counter` library's counter:  counted to 3, then edited.
 * - The app's own code edited, and the library's compiled code changed under it:  the count stays 3, on the same element.
 * - A property the library's edit adds shows as the element's attribute at once, both ways (I47).
 * - NOTHING reaches the disk:  every save is answered here, so the frozen projects can't change.
 * - Needs this checkout's editor running:  `spell server start all`;  skips itself when it isn't, as in CI.
 * - Headless Playwright, never a real browser window.
 */

/** What a compile and redraw takes, at most. */
const SETTLE_MS = 3000

describe.skipIf(!SERVING)("live edit everywhere", { timeout: 240_000 }, () => {
  let browser: Browser
  let context: BrowserContext
  let page: Page
  /** The library's compiled code, changed:  what a read of it answers once set. */
  let libraryEdit: ((compiled: string) => string) | undefined

  /** The counter's element, and what it shows. */
  const counter = () => page.locator(".AppPaneBody counter-counter").first()

  /** Change the app's file as typing would, and compile it. */
  async function editApp(from: string, to: string): Promise<void> {
    await page.evaluate(
      async ({ text, replacement }) => {
        const { project, editor } = window as unknown as {
          project: { spellFiles: { path: string; contents: string }[] }
          editor: { compileApp(): Promise<void>; history: { change(change: object, step: { title: string }): void } }
        }
        const found = project.spellFiles.find((each) => each.path.endsWith("/CounterApp.spell"))!
        const before = found.contents
        editor.history.change(
          { file: found, at: 0, before, after: before.replace(text, replacement) },
          { title: "Typed" }
        )
        await editor.compileApp()
      },
      { text: from, replacement: to }
    )
    await page.waitForTimeout(SETTLE_MS)
  }

  /** What the counter shows:  its button, in its shadow root. */
  const shown = () => counter().locator("ui-button").first().innerText()

  /** Mark the counter's element, so a redraw shows as a new one. */
  const markCounter = () =>
    page.evaluate(() => {
      ;(document.querySelector(".AppPaneBody counter-counter") as HTMLElement & { marked?: boolean }).marked = true
    })
  const isSameCounter = () =>
    page.evaluate(
      () => !!(document.querySelector(".AppPaneBody counter-counter") as HTMLElement & { marked?: boolean }).marked
    )

  beforeAll(async () => {
    browser = await chromium.launch()
    context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    // saves never reach the disk;  the library's compiled code, once changed, is answered from here
    await context.route(/\/api\/projects\/file\/|\.(spellml|spell|spell\.js)(\?.*)?$/, (route) => {
      const request = route.request()
      if (request.isNavigationRequest()) return route.continue()
      if (request.method() !== "GET") return route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
      const url = new URL(request.url())
      if (libraryEdit && url.pathname.endsWith("/counter/counter.spell.js")) {
        return route
          .fetch()
          .then((response) => response.text())
          .then((text) => route.fulfill({ contentType: "text/javascript", body: libraryEdit!(text) }))
      }
      return route.continue()
    })
    page = await context.newPage()
    await page.goto(`${EDITOR}edit/@spell/test/counter-app`, { timeout: 60_000 })
    await counter().waitFor({ timeout: 60_000 })
    await page.waitForTimeout(2000)
    for (let click = 0; click < 3; click++) await counter().locator("ui-button").click()
    await page.waitForTimeout(300)
    await markCounter()
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
  })

  test("the app's own edit keeps the imported counter's count, on the same element", async () => {
    expect(await shown()).toContain("Count: 3")
    await editApp(`<div class="Tally">`, `<div class="Tally Edited">`)
    await expect.poll(() => page.locator(".AppPaneBody .Tally.Edited").count()).toBe(1)
    expect(await shown()).toContain("Count: 3")
    expect(await isSameCounter()).toBe(true)
  })

  test("the library's edit draws again, its count kept, on the same element", async () => {
    libraryEdit = (compiled) => compiled.replace("`Count: ", "`Clicks: ")
    await editApp(`Tally Edited`, `Tally Edited Again`)
    await expect.poll(shown).toContain("Clicks: 3")
    expect(await isSameCounter()).toBe(true)
  })

  test("a property the library's edit adds shows as its attribute, both ways, with no Restart (I47)", async () => {
    libraryEdit = (compiled) => compiled.replace("`Count: ", "`Clicks: ").replace(NEW_PROPERTY_AT, NEW_PROPERTY)
    await editApp(`Tally Edited Again`, `Tally Edited Thrice`)
    await expect.poll(() => page.locator(".AppPaneBody .Tally.Edited.Thrice").count()).toBe(1)
    // the thing's new property, set as the program runs:  its element shows it, and follows it
    expect(await stepOnThePage((counter) => (counter.thing.step = 2))).toEqual({ attribute: "2", thing: 2 })
    expect(await stepOnThePage((counter) => (counter.thing.step = 5))).toEqual({ attribute: "5", thing: 5 })
    // the page writing it:  the thing takes it, as a number
    expect(await stepOnThePage((counter) => counter.setAttribute("step", "7"))).toEqual({ attribute: "7", thing: 7 })
    expect(await stepOnThePage((counter) => (counter.step = 9))).toEqual({ attribute: "9", thing: 9 })
    expect(await shown()).toContain("Clicks: 3")
    expect(await isSameCounter()).toBe(true)
  })

  /** Do `change` to the counter's element, then answer its `step` attribute and its thing's `step`. */
  async function stepOnThePage(change: (counter: SteppedCounter) => unknown) {
    await page.evaluate(`(${String(change)})(document.querySelector(".AppPaneBody counter-counter"))`)
    await page.waitForTimeout(200)
    return page.evaluate(() => {
      const element = document.querySelector(".AppPaneBody counter-counter") as unknown as SteppedCounter
      return { attribute: element.getAttribute("step"), thing: element.thing.step }
    })
  }
})

/** Where the counter's compiled class gains a property:  just before its `create()`. */
const NEW_PROPERTY_AT = "  /** a new counter starts at 0 */"

/** `- its "step" is a number`, as the library's compiled class would have it. */
const NEW_PROPERTY = `  static { this.declareProp("step", { type: "number" }) }
  get step() { return this.getProp("step") }
  set step(value) { this.setProp("step", value) }

${NEW_PROPERTY_AT}`

/** The counter's element, once its type has a `step`. */
type SteppedCounter = HTMLElement & { step: number; thing: { step: number } }
