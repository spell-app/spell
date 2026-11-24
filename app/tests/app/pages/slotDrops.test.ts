import { chromium, type Browser, type BrowserContext, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"

/**
 * Dropping a part into a slot its holder doesn't have yet, from the running editor, by a real mouse
 * (epic `editor` T150):  a card's empty slots show as drop zones while something is dragged over it,
 * and the Views tree lists them as rows to drop onto.
 * - A program of its own, answered here:  NOTHING reaches the disk, so the built-in examples can't change.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** The file the program is answered for:  the example's text never read. */
const FILE = "TaskList.spell"

/** The address of that file, loaded or saved, and of no other. */
const PROGRAM_URL = /\/TaskList\.spell(\?.*)?$/

/**
 * A button, and a card with a header (its `heading`) and content:  its other slots are empty.
 * - A card's slots:  avatar and meta at its top, description and extra at its bottom.
 */
const PROGRAM = `# Slots

slots is an app
\tto draw slots
\t\t<container>
\t\t\t<button>Go</button>
\t\t\t<card heading="A card">
\t\t\t\t<content>Some words about it, long enough to give the card a body.</>
\t\t\t</>
\t\t</>
`

/** What a compile and redraw takes, at most. */
const SETTLE_MS = 2500

describe.skipIf(!SERVING)("dropping into an empty slot", { timeout: 180_000 }, () => {
  let browser: Browser
  let context: BrowserContext
  let page: Page

  /** The program's real text. */
  const text = () =>
    page.evaluate((file) => {
      const { project } = window as unknown as { project: { spellFiles: { path: string; contents: string }[] } }
      return project.spellFiles.find((each) => each.path.endsWith(`/${file}`))!.contents
    }, FILE)

  /** The middle of the first `selector` in the app, as drawn. */
  const middleOf = (selector: string) =>
    page.evaluate((name) => {
      const element = document.querySelector(`.AppPaneBody ${name}`)!
      const own = element.getBoundingClientRect()
      const box = own.width
        ? own
        : [...(element.shadowRoot?.children ?? [])]
            .map((child) => child.getBoundingClientRect())
            .find((one) => one.width)!
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    }, selector)

  /** Select the button, inspecting:  a drag starts on what's selected. */
  async function selectButton(): Promise<{ x: number; y: number }> {
    if ((await page.locator(".InspectAppButton").first().getAttribute("aria-pressed")) !== "true") {
      await page.locator(".InspectAppButton [part~=item]").first().click()
    }
    // Inspect app's help box would cover the app's top
    await page.evaluate(() => (window as unknown as { Inspector: { dismissHelp(): void } }).Inspector.dismissHelp())
    await page.waitForTimeout(300)
    const button = await middleOf("ui-button")
    await page.mouse.click(button.x, button.y)
    await page.waitForTimeout(500)
    return button
  }

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
    await page.waitForSelector(".AppPaneBody ui-card", { timeout: 30_000 })
    await page.waitForTimeout(1000)
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
  })

  test("over a card, its empty slots show as zones;  a drop on one writes the slot around what's dropped", async () => {
    const button = await selectButton()
    const card = await middleOf("ui-card")
    await page.mouse.move(button.x, button.y)
    await page.mouse.down()
    await page.mouse.move(button.x + 10, button.y + 10, { steps: 3 })
    await page.mouse.move(card.x, card.y, { steps: 8 })
    await page.waitForTimeout(200)
    const zones = await page.locator(".PartSlotZone").allTextContents()
    expect(zones).toEqual(["⟨avatar⟩", "⟨meta⟩", "⟨description⟩", "⟨extra⟩"])
    const extra = (await page.locator(".PartSlotZone").nth(3).boundingBox())!
    await page.mouse.move(extra.x + extra.width / 2, extra.y + extra.height / 2, { steps: 6 })
    await page.waitForTimeout(200)
    expect(await page.locator(".PartSlotZone.landing").allTextContents()).toEqual(["⟨extra⟩"])
    await page.mouse.up()
    await page.waitForTimeout(SETTLE_MS)
    expect(await page.locator(".PartSlotZone").count()).toBe(0)
    const after = await text()
    // the button's own line under the container is gone:  it's only inside the new slot
    expect(after.split("\n")).not.toContain("\t\t\t<button>Go</button>")
    expect(after).toContain(
      "\t\t\t\t<content>Some words about it, long enough to give the card a body.</>\n" +
        "\t\t\t\t<extra>\n\t\t\t\t\t<button>Go</button>\n\t\t\t\t</>\n\t\t\t</>"
    )
  })

  test("the Views tree lists the card's empty slots;  a row dragged onto one goes in it", async () => {
    const slotRows = page.locator(".InspectorTree ui-tree-item.InspectorSlotRow")
    await expect
      .poll(() => slotRows.evaluateAll((rows) => rows.map((row) => row.getAttribute("label"))), { timeout: 15_000 })
      .toEqual(["⟨avatar⟩", "⟨meta⟩", "⟨description⟩"])
    await selectButton()
    const row = (await page.locator('.InspectorTree ui-tree-item[label="Go"]').first().boundingBox())!
    const description = (await slotRows.nth(2).boundingBox())!
    await page.mouse.move(row.x + 140, row.y + 10)
    await page.mouse.down()
    await page.mouse.move(row.x + 150, row.y + 20, { steps: 3 })
    await page.mouse.move(description.x + 60, description.y + 10, { steps: 8 })
    await page.waitForTimeout(200)
    await page.mouse.up()
    await page.waitForTimeout(SETTLE_MS)
    const after = await text()
    expect(after).toContain("\t\t\t\t<description>\n\t\t\t\t\t<button>Go</button>\n\t\t\t\t</>")
  })
})
