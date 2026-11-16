import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"

/**
 * A thing's computed properties in the Inspector, on Solitaire's cards (epic `editor` I224, I225):
 * - read only, with no "won't be saved" icon:  they're worked out by the program, never set
 *   (Owen:  "These should be read-only since they are getters")
 * - short ones two to a row:  Aliases' two yes-or-no toggles, each on its label's line;  Names' short values
 *   (Owen:  "Put them on one line", "These should go 2 per line")
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.  Saves nothing:  it only reads and clicks.
 */

/** What the test reads of one computed field. */
type ComputedRead = {
  label: string
  /** Its value, when it's a yes or no. */
  selected?: boolean
  /** Its box's top and left, to tell a row. */
  top: number
  left: number
  isHalf: boolean
  isInlineCheck: boolean
  hasUnsavedIcon: boolean
  isDisabled: boolean
}

describe.skipIf(!SERVING)("a thing's computed properties", { timeout: 180_000 }, () => {
  let browser: Browser
  let page: Page

  /** Every computed field the Inspector shows, as drawn. */
  const computedFields = (): Promise<ComputedRead[]> =>
    page.evaluate(() =>
      [...document.querySelectorAll("ui-property.InspectorComputed")].map((property) => {
        const box = property.getBoundingClientRect()
        const toggle = property.querySelector("ui-checkbox")
        return {
          label: property.getAttribute("label") ?? "",
          selected: toggle ? toggle.hasAttribute("selected") : undefined,
          top: Math.round(box.top),
          left: Math.round(box.left),
          isHalf: property.matches(":state(half)"),
          isInlineCheck: property.matches(":state(inline-check)"),
          hasUnsavedIcon: !!property.shadowRoot?.querySelector('[part~="unsaved"]'),
          isDisabled: !!toggle?.hasAttribute("disabled")
        }
      })
    )

  beforeAll(async () => {
    browser = await chromium.launch()
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    // nothing reaches the disk, though nothing here should save
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
    // a card, inspected as a click on it does:  the first one with a face card's yes or no
    await page.evaluate(async () => {
      const { editor, Inspector } = window as unknown as {
        editor: { loadRuntime(): Promise<{ core: { things: { all(): object[] } } }> }
        Inspector: { inspectThing(thing: object): void; isOpen: boolean; toggle(): void }
      }
      const { core } = await editor.loadRuntime()
      const card = core.things.all().find((thing) => "isAFaceCard" in thing)!
      if (!Inspector.isOpen) Inspector.toggle()
      Inspector.inspectThing(card)
    })
    await page.waitForSelector("ui-property.InspectorComputed", { timeout: 15_000 })
    await page.waitForTimeout(1500)
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
  })

  test("Aliases' yes-or-no fields are read only, two to a row, with no unsaved icon", async () => {
    const fields = await computedFields()
    const face = fields.find((field) => /face card/i.test(field.label))!
    const number = fields.find((field) => /number card/i.test(field.label))!
    expect(face, "Is a face card shows").toBeDefined()
    expect(number, "Is a number card shows").toBeDefined()
    for (const field of [face, number]) {
      expect(field.isHalf, `${field.label}:  half a row`).toBe(true)
      expect(field.isInlineCheck, `${field.label}:  its toggle on its label's line`).toBe(true)
      expect(field.hasUnsavedIcon, `${field.label}:  no "won't be saved" icon`).toBe(false)
      expect(field.isDisabled, `${field.label}:  drawn as read only`).toBe(true)
    }
    // side by side:  one row, two columns
    expect(Math.abs(face.top - number.top)).toBeLessThan(4)
    expect(face.left).not.toBe(number.left)
  })

  test("a click on a computed toggle changes nothing", async () => {
    const before = (await computedFields()).find((field) => /face card/i.test(field.label))!
    const box = await page.evaluate(() => {
      const property = [...document.querySelectorAll("ui-property.InspectorComputed")].find((each) =>
        /face card/i.test(each.getAttribute("label") ?? "")
      )!
      const rect = property.querySelector("ui-checkbox")!.getBoundingClientRect()
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
    })
    await page.mouse.click(box.x, box.y)
    await page.waitForTimeout(500)
    const after = (await computedFields()).find((field) => /face card/i.test(field.label))!
    expect(after.selected).toBe(before.selected)
  })

  test("short computed values sit two to a row;  none shows an unsaved icon", async () => {
    const fields = await computedFields()
    expect(fields.filter((field) => field.hasUnsavedIcon).map((field) => field.label)).toEqual([])
    const value = fields.find((field) => field.label === "Value")
    const symbol = fields.find((field) => field.label === "Symbol")
    expect(value?.isHalf, "Value:  half a row").toBe(true)
    expect(symbol?.isHalf, "Symbol:  half a row").toBe(true)
    // some pair shares a row
    const halves = fields.filter((field) => field.isHalf)
    const shareARow = halves.some((one) =>
      halves.some((other) => other !== one && Math.abs(other.top - one.top) < 4 && other.left !== one.left)
    )
    expect(shareARow).toBe(true)
  })
})
