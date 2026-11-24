import { chromium, type Browser, type BrowserContext, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"

/**
 * Click to place (epic `editor` T153), from the running editor, by a real mouse and keys:  a part picked up
 * (`PartPlacing.pickUp()`, what the add rail's click calls), then put in the app with the next click, no mouse held.
 * - A program of its own, answered here:  NOTHING reaches the disk, so the built-in examples can't change.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** The file the program is answered for:  the example's text never read. */
const FILE = "TaskList.spell"

/** The address of that file, loaded or saved, and of no other. */
const PROGRAM_URL = /\/TaskList\.spell(\?.*)?$/

/** Two texts in a container, room to place things between and after them. */
const PROGRAM = `# Demo

demo is an app
\tto draw demo
\t\t<container>
\t\t\t<text>First</text>
\t\t\t<text>Second</text>
\t\t</>
`

/** What a compile and redraw takes, at most. */
const SETTLE_MS = 2500

/** What placing writes:  a button. */
const BUTTON = "<button>Placed</button>"

describe.skipIf(!SERVING)("click to place", { timeout: 180_000 }, () => {
  let browser: Browser
  let context: BrowserContext
  let page: Page

  /** The lines inside the program's container, with no indent. */
  const written = () =>
    page.evaluate((file) => {
      const { project } = window as unknown as { project: { spellFiles: { path: string; contents: string }[] } }
      const lines = project.spellFiles.find((each) => each.path.endsWith(`/${file}`))!.contents.split("\n")
      const start = lines.findIndex((line) => line.trim() === "<container>")
      return lines
        .slice(start + 1)
        .map((line) => line.trim())
        .filter((line) => line && line !== "</>")
    }, FILE)

  /** The middle of the `index`th `selector` in the app, as drawn. */
  const middleOf = (selector: string, index = 0) =>
    page.evaluate(
      ([name, at]) => {
        const element = document.querySelectorAll(`.AppPaneBody ${name}`)[at as number]!
        // a text draws no box of its own (`display: contents`):  its shadow root's span does
        const own = element.getBoundingClientRect()
        const box = own.width
          ? own
          : [...(element.shadowRoot?.children ?? [])]
              .map((child) => child.getBoundingClientRect())
              .find((one) => one.width)!
        return { x: box.x + box.width / 2, y: box.y + box.height / 2, left: box.left, right: box.right }
      },
      [selector, index] as const
    )

  /** Pick a button up, as the add rail's click does. */
  const pickUp = () =>
    page.evaluate((code) => {
      const placing = (window as unknown as { PartPlacing: { pickUp(part: object, options?: object): void } })
        .PartPlacing
      placing.pickUp({ label: "Button", title: "Add Button", codesFor: () => [code] })
    }, BUTTON)

  /** Is a button picked up? */
  const isPicked = () =>
    page.evaluate(() =>
      (window as unknown as { PartPlacing: { isPicked(label: string): boolean } }).PartPlacing.isPicked("Button")
    )

  beforeAll(async () => {
    browser = await chromium.launch()
    context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    let saved: string | undefined
    await context.route(/\/api\/projects\/file\/|\.(spell)(\?.*)?$/, (route) => {
      const request = route.request()
      if (request.isNavigationRequest()) return route.continue()
      const isProgram = PROGRAM_URL.test(request.url())
      if (request.method() !== "GET") {
        if (isProgram) saved = request.postData() ?? ""
        return route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
      }
      return isProgram ? route.fulfill({ contentType: "text/plain", body: saved ?? PROGRAM }) : route.continue()
    })
    page = await context.newPage()
    await page.goto(`${EDITOR}edit/@spell/examples/TaskList`, { timeout: 60_000 })
    await page.waitForSelector(".InspectAppButton", { state: "attached", timeout: 60_000 })
    await page.waitForTimeout(6000)
    await page.evaluate(() => (window as unknown as { Inspector: { toggle(): void } }).Inspector.toggle())
    await page.waitForSelector(".AppPaneBody ui-text", { state: "attached", timeout: 30_000 })
    await page.waitForTimeout(1000)
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
  })

  test("a click puts it where the line shows, and only that click:  nothing held down", async () => {
    await pickUp()
    expect(await isPicked()).toBe(true)
    const second = await middleOf("ui-text", 1)
    // the far end of Second (texts lie in a row):  after it
    await page.mouse.move(second.right - 3, second.y, { steps: 4 })
    await page.waitForTimeout(200)
    expect(await page.locator(".PartPlaceGhost").isVisible()).toBe(true)
    expect(await page.locator(".PartDropMarker").count()).toBe(1)
    await page.mouse.click(second.right - 3, second.y)
    await page.waitForTimeout(SETTLE_MS)
    expect(await written()).toEqual(["<text>First</text>", "<text>Second</text>", BUTTON])
    expect(await isPicked()).toBe(false)
    expect(await page.locator(".PartPlaceGhost").count()).toBe(0)
  })

  test("Shift-click places one and keeps it picked up;  Escape puts it down", async () => {
    await pickUp()
    const first = await middleOf("ui-text", 0)
    // the near end of First:  before it
    await page.mouse.move(first.left + 3, first.y, { steps: 4 })
    await page.keyboard.down("Shift")
    await page.mouse.click(first.left + 3, first.y)
    await page.keyboard.up("Shift")
    await page.waitForTimeout(SETTLE_MS)
    expect(await written()).toEqual([BUTTON, "<text>First</text>", "<text>Second</text>", BUTTON])
    expect(await isPicked()).toBe(true)
    await page.keyboard.press("Escape")
    expect(await isPicked()).toBe(false)
    expect(await page.locator(".PartDropMarker").count()).toBe(0)
  })

  test("picked up again, it's put down;  by keys, the arrows move the line and Enter places it", async () => {
    await pickUp()
    await pickUp()
    expect(await isPicked()).toBe(false)
    await page.evaluate((code) => {
      const placing = (window as unknown as { PartPlacing: { pickUp(part: object, options?: object): void } })
        .PartPlacing
      placing.pickUp({ label: "Button", title: "Add Button", codesFor: () => [code] }, { keyboard: true })
    }, BUTTON)
    // the first place is before the app's first part, then after each part:  two steps, after First's button
    await page.keyboard.press("ArrowDown")
    await page.keyboard.press("ArrowDown")
    expect(await page.locator(".PartDropMarker").count()).toBe(1)
    await page.keyboard.press("Enter")
    await page.waitForTimeout(SETTLE_MS)
    const lines = await written()
    expect(lines.filter((line) => line === BUTTON)).toHaveLength(3)
    expect(await isPicked()).toBe(false)
  })
})
