import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

/**
 * The site editor, `/site/<project>` (epic `mockup` P4):  its tree and board of the site's parts, a page's form,
 * adding, moving and undoing, each one step of the editor's history written into the site's file.
 * - Every save is answered here, and goes nowhere:  the editor holds what was changed, and the example on disk stays
 *   as it is.
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

/** The project, and its site's file. */
const PROJECT = "@spell/examples/StarWarsSite"
const FILE = "StarWarsSite.spellml"

/** What a compile and redraw takes, at most. */
const SETTLE_MS = 1500

describe.skipIf(!SERVING)("the site editor", { timeout: 180_000 }, () => {
  let browser: Browser
  let page: Page

  /** The site's file, as the editor holds it. */
  const text = () =>
    page.evaluate((file) => {
      const { project } = window as unknown as { project: { spellFiles: { path: string; contents: string }[] } }
      return project.spellFiles.find((each) => each.path.endsWith(`/${file}`))!.contents
    }, FILE)

  beforeAll(async () => {
    browser = await chromium.launch()
    const context = await browser.newContext({ viewport: { width: 1400, height: 860 } })
    await context.route(/\/api\/projects\/file\/|\.(spellml|spell)(\?.*)?$/, (route) => {
      const request = route.request()
      if (request.isNavigationRequest() || request.method() === "GET") return route.continue()
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
    })
    page = await context.newPage()
    await page.goto(`${EDITOR}site/${PROJECT}`)
    await page.locator(".SiteEditorPage .TileCard").first().waitFor({ timeout: 30_000 })
  })

  afterAll(async () => {
    await browser?.close()
  })

  test("shows every part of the site, as a tree and as cards", async () => {
    // six collections, a list and a page each, a dialog, a sidebar, the not found and error pages
    expect(await page.locator(".SiteEditorPage .TileCard").count()).toBe(16)
    expect(await page.locator("ui-tree-item").count()).toBe(16)
    // the app isn't run here:  nothing of the site is drawn over the page
    expect(await page.locator(".spell-site").count()).toBe(0)
  })

  test("a page's title changed in its form:  written into its line", async () => {
    await page.locator(".SiteEditorPage .TileCard", { hasText: "/films/:film" }).click()
    const title = page.locator("ui-property-editor input").nth(1)
    await title.fill("Movie")
    await title.press("Enter")
    await page.waitForTimeout(SETTLE_MS)
    expect(await text()).toContain('<page "film page" address="/films/:film" title="Movie"/>')
  })

  test("a page added, then taken back with ⌘Z", async () => {
    await page.locator(".SiteEditorPage ui-button", { hasText: "Add a page" }).click()
    await page.waitForTimeout(SETTLE_MS)
    expect(await text()).toContain('<page "new page" address="/new-page" title="New page"/>')
    expect(await text()).toContain('<spell-page "new page"/>')
    await page.locator(".SiteEditorPage h1").click()
    await page.keyboard.press("Meta+z")
    await page.waitForTimeout(SETTLE_MS)
    expect(await text()).not.toContain("new page")
  })

  test("a row dragged before another:  its part moves there", async () => {
    const from = (await page.locator('ui-tree-item[value="settings dialog"]').boundingBox())!
    const to = (await page.locator('ui-tree-item[value="films page"]').boundingBox())!
    await page.mouse.move(from.x + 40, from.y + 8)
    await page.mouse.down()
    await page.mouse.move(from.x + 40, from.y - 20, { steps: 5 })
    await page.mouse.move(to.x + 40, to.y + 8, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(SETTLE_MS)
    const after = await text()
    expect(after.indexOf('<dialog "settings dialog"/>')).toBeLessThan(after.indexOf('<page "films page"'))
  })
  test("a page with pages under it:  asked first, then all of them go, as one step ⌘Z takes back", async () => {
    await page.locator(".SiteEditorPage .TileCard", { hasText: "/planets" }).first().click()
    await page.locator(".SiteEditorPage .form ui-button", { hasText: "Delete" }).click()
    const ask = page.getByText("Delete planets page and its 1 page(s) under it (Planet)?")
    await ask.waitFor({ timeout: 10_000 })
    await page.getByRole("button", { name: "Delete them all" }).click()
    await page.waitForTimeout(SETTLE_MS)
    expect(await text()).not.toMatch(/planets? page/)
    await page.locator(".SiteEditorPage h1").click()
    await page.keyboard.press("Meta+z")
    await page.waitForTimeout(SETTLE_MS)
    expect(await text()).toContain('<page "planet page" address="/planets/:planet" title="Planet"/>')
    expect(await text()).toContain('<spell-page "planets page"/>')
  })

  test("a double click opens the page in Edit, and Back to the site comes back", async () => {
    await page.locator(".SiteEditorPage .TileCard", { hasText: "/people/:person" }).dblclick()
    await page.waitForURL(/\/edit\//, { timeout: 30_000 })
    const back = page.locator(".BackToSite ui-button")
    await back.waitFor({ timeout: 30_000 })
    await back.click()
    await page.waitForURL(/\/site\//, { timeout: 30_000 })
    await page.locator(".SiteEditorPage .TileCard").first().waitFor({ timeout: 30_000 })
  })
})
