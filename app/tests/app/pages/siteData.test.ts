import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

/**
 * The site editor's Data tab (epic `mockup` P11):  the Star Wars site's place as a NERD, a box turning over to its
 * ERD, and its sample rows under it.
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

/** The project. */
const PROJECT = "@spell/examples/StarWarsSite"

/** What a turn of a card takes, at most. */
const TURN_MS = 1500

describe.skipIf(!SERVING)("the site editor's Data tab", { timeout: 120_000 }, () => {
  let browser: Browser
  let page: Page

  /** The diagram's texts. */
  const diagramTexts = () => page.locator("ui-diagram.nerd svg text").allTextContents()

  beforeAll(async () => {
    browser = await chromium.launch()
    page = await (await browser.newContext({ viewport: { width: 1500, height: 1100 } })).newPage()
    await page.goto(`${EDITOR}site/${PROJECT}`)
    await page.locator(".SiteEditorPage .TileCard").first().waitFor({ timeout: 30_000 })
    await page.evaluate(() => localStorage.clear())
    await page.locator("ui-button", { hasText: "Data" }).click()
    await page.locator("ui-diagram.nerd svg text").first().waitFor({ timeout: 20_000 })
  })

  afterAll(async () => {
    await browser?.close()
  })

  test("draws the place's NERD:  a box per collection, only its linking fields", async () => {
    const texts = await diagramTexts()
    for (const box of ["Character", "Planet", "Film", "Species", "Vehicle", "Starship"]) expect(texts).toContain(box)
    expect(texts).toContain("homeworld")
    expect(texts).toContain("films[]")
    // plain fields are the ERD's
    expect(texts).not.toContain("height")
    expect(await page.locator(".TileCard").count()).toBe(0)
  })

  test("a box clicked turns over to its ERD, and shows its sample rows", async () => {
    await page.locator("ui-diagram.nerd svg text", { hasText: /^Character$/ }).first().click()
    await page.waitForTimeout(TURN_MS)
    const card = page.locator("ui-diagram-node[name='Character']")
    expect(await card.count()).toBe(1)
    expect(await card.locator(".erd .row").allTextContents()).toContain("homeworld→ Planet")
    expect(await page.locator(".samples h2").textContent()).toContain("Character")
    expect(await page.locator(".samples ui-table").count()).toBe(1)
  })

  test("clicked again, it turns back, and the NERD's box is drawn again", async () => {
    await page.locator("ui-diagram-node[name='Character'] .erd").click()
    await page.waitForTimeout(TURN_MS)
    expect(await page.locator("ui-diagram-node").count()).toBe(0)
    expect(await diagramTexts()).toContain("homeworld")
  })
})
