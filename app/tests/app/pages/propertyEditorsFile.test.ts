import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

/**
 * A type's property editor in a file of its own (epic `editor` P25):  Solitaire's `Card.editor.spellml`,
 * opened in the editor and tweaked, and the Inspector on a card shows the tweak.
 * - Owen:  "if I wanted to edit the property-editor, I could open that file in the spell editor and just tweak it".
 * - NOTHING reaches the disk:  every save is answered here, so the built-in example can't change.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** The kit's root, where the page server leaves its note of the editor's address. */
const KIT = path.resolve(import.meta.dirname, "../../../..")

/** The running editor's address, from that note;  `undefined`:  none noted. */
function editorAddress(): string | undefined {
  const note = path.join(KIT, ".spell-server.editor.json")
  return existsSync(note) ? (JSON.parse(readFileSync(note, "utf8")) as { url: string }).url : undefined
}

/** Does it answer? */
async function isServing(address: string | undefined): Promise<boolean> {
  if (!address) return false
  try {
    return (await fetch(address)).ok
  } catch (ignored) {
    return false
  }
}

const EDITOR = editorAddress()
const SERVING = await isServing(EDITOR)

/** The page's debug globals, what's used of them. */
type DebugGlobals = {
  editor: {
    /** Show `path`'s file in the code pane. */
    showEditor(path: string): void
    shownCodeEditor?: {
      getValue(): string
      setPosition(place: { lineNumber: number; column: number }): void
      focus(): void
    }
  }
}

/** The labels the Inspector's property editor shows, as drawn. */
function shownLabels(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll("ui-property-editor ui-property")].map((each) => each.getAttribute("label") ?? "")
  )
}

/** Select the first card on the table by a click on it, with Inspect app on. */
async function selectACard(page: Page): Promise<void> {
  if ((await page.locator(".InspectAppButton").first().getAttribute("aria-pressed")) !== "true") {
    await page.locator(".InspectAppButton [part~=item]").first().click()
  }
  const at = await page.evaluate(() => {
    const card = [...document.querySelectorAll("*")]
      .flatMap((each) => [each, ...(each.shadowRoot ? each.shadowRoot.querySelectorAll("*") : [])])
      .find((each) => each.localName === "solitaire-card")!
    const box = card.getBoundingClientRect()
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  })
  await page.mouse.click(at.x, at.y)
  await page.waitForSelector("ui-property-editor", { timeout: 8000 })
  await page.waitForTimeout(500)
}

describe.skipIf(!SERVING)("a type's property editor in its own file", () => {
  let browser: Browser
  let page: Page

  beforeAll(async () => {
    browser = await chromium.launch()
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    // saves answered here:  the example on disk never changes
    await context.route(/\/api\/projects\/file\/|\.(spellml|spell)(\?.*)?$/, (route) =>
      route.request().method() === "GET"
        ? route.continue()
        : route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
    )
    page = await context.newPage()
    await page.goto(`${EDITOR}edit/@spell/examples/Solitaire/Card.editor.spellml`, { timeout: 60_000 })
    await page.waitForSelector(".monaco-editor .view-line", { timeout: 60_000 })
    await page.waitForTimeout(4000)
    await page.locator(".InspectorToggle ui-icon").first().click({ force: true })
    await page.waitForTimeout(1000)
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
  })

  test("the Inspector on a card reads Card.editor.spellml", async () => {
    await selectACard(page)
    expect(await shownLabels(page)).toContain("Rank")
  }, 60_000)

  test("a label tweaked in the file shows in the Inspector, once saved", async () => {
    // selecting the card followed it to Card.spellml:  back to its editor's file
    await page.evaluate(() =>
      (window as unknown as DebugGlobals).editor.showEditor("@spell/examples/Solitaire/Card.editor.spellml")
    )
    await page.waitForFunction(
      () => (window as unknown as DebugGlobals).editor.shownCodeEditor?.getValue().includes("property editor"),
      undefined,
      { timeout: 15_000 }
    )
    await page.evaluate(() => {
      const code = (window as unknown as DebugGlobals).editor.shownCodeEditor!
      const lines = code.getValue().split("\n")
      const at = lines.findIndex((each) => each.includes('label="Rank"'))
      code.focus()
      code.setPosition({ lineNumber: at + 1, column: lines[at]!.indexOf('label="Rank"') + 'label="Rank'.length + 1 })
    })
    await page.keyboard.type(" of the card")
    await page.keyboard.press("ControlOrMeta+s")
    await page.waitForTimeout(1500)
    await selectACard(page)
    expect(await shownLabels(page)).toContain("Rank of the card")
  }, 60_000)
})
