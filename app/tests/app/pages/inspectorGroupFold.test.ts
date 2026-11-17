import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { CodeEditor, EDITOR, SERVING } from "./runningEditor"

/**
 * The Inspector's property sections fold only when their own title is clicked (epic `editor` I222):
 * a menu closing inside one, a select's, left it folded.
 * - Owen:  "Clicking on `Options` with that menu visible hides the section".
 * - `todos-form-based`'s violet menu:  its Appearance section heads a run of yes-or-no properties,
 *   drawn as one select of pills, "Options".
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** The page's debug globals, what's used of them. */
type DebugGlobals = { Inspector: { toggle(): void } }

/** The Inspector's section titled `label`. */
function section(page: Page, label: string) {
  return page.locator(`ui-property-group[label="${label}"]`).first()
}

/** Is the section titled `label` open? */
function isOpen(page: Page, label: string): Promise<boolean> {
  return section(page, label).evaluate((group) => !group.matches(":state(collapsed)"))
}

/**
 * Click the fold button of the section titled `label`.
 * - SIDE EFFECT:  the editor keeps which sections are folded, so the tests leave theirs open.
 */
function clickTitle(page: Page, label: string): Promise<void> {
  return section(page, label).evaluate((group) =>
    (group.shadowRoot!.querySelector("button.toggle") as HTMLElement).click()
  )
}

/** Open the section titled `label`, if it's folded. */
async function openSection(page: Page, label: string): Promise<void> {
  if (!(await isOpen(page, label))) await clickTitle(page, label)
  await expect.poll(() => isOpen(page, label)).toBe(true)
}

/** Pick the app's violet menu, the first "Menu" in the Views card. */
async function pickTheMenu(page: Page): Promise<void> {
  await page.locator('[data-panel="views"]').getByText("Menu", { exact: true }).first().click()
  await page.waitForSelector("ui-property:state(flags)", { state: "attached", timeout: 8000 })
  await page.waitForTimeout(500)
}

describe.skipIf(!SERVING)("the Inspector's sections", () => {
  let browser: Browser
  let page: Page

  beforeAll(async () => {
    browser = await chromium.launch()
    page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
    await page.goto(`${EDITOR}edit/@spell/test/todos-form-based/todo.spell`, { timeout: 60_000 })
    await new CodeEditor(page).shown()
    await page.waitForTimeout(4000)
    if (!(await page.getByText("Click a part of your app to pick it").isVisible())) {
      await page.evaluate(() => (window as unknown as DebugGlobals).Inspector.toggle())
    }
    await page.waitForTimeout(1000)
    await pickTheMenu(page)
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
  })

  test("stay open when the pills' label is clicked with their menu open:  the menu closes", async () => {
    const lead = page.locator("ui-property:state(flags)").first()
    const select = lead.locator("ui-dropdown")
    const label = (await lead.evaluate((property) => property.closest("ui-property-group")!.getAttribute("label")))!
    await openSection(page, label)
    await select.click()
    await expect.poll(() => select.evaluate((each) => each.matches(":state(open)"))).toBe(true)
    const at = await lead.evaluate((property) => {
      const box = property.shadowRoot!.querySelector(".label")!.getBoundingClientRect()
      return { x: box.x + 10, y: box.y + box.height / 2 }
    })
    await page.mouse.click(at.x, at.y)
    await page.waitForTimeout(800)
    expect(await select.evaluate((each) => each.matches(":state(open)"))).toBe(false)
    expect(await isOpen(page, label)).toBe(true)
  }, 60_000)

  test("still fold by their title", async () => {
    const label = "Appearance"
    await openSection(page, label)
    await clickTitle(page, label)
    await expect.poll(() => isOpen(page, label)).toBe(false)
    await clickTitle(page, label)
    await expect.poll(() => isOpen(page, label)).toBe(true)
  }, 30_000)
})
