import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"

/**
 * The site editor, `/site/<project>` (epic `mockup` P4):  its tree and board of the site's parts, a page's form,
 * adding, moving and undoing, each one step of the editor's history written into the site's file.
 * - Every save is answered here, and goes nowhere:  the editor holds what was changed, and the example on disk stays
 *   as it is.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

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
    // six collections, a list and a page each, the reviews page, two dialogs, a sidebar, the not found and error pages
    expect(await page.locator(".SiteEditorPage .TileCard").count()).toBe(18)
    expect(await page.locator("ui-tree-item").count()).toBe(18)
    // the app isn't run here:  nothing of the site is drawn over the page
    expect(await page.locator(".spell-site").count()).toBe(0)
  })

  test("the bar's Run | Edit | Site:  Site chosen here, and only for a site", async () => {
    const modes = page.locator("ui-menu.ModeTabs > ui-item")
    expect(await modes.count()).toBe(3)
    expect(await modes.nth(2).getAttribute("selected")).not.toBeNull()
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
    expect(await text()).not.toContain('"new page"')
  })

  test("a row dragged before another:  its part moves there", async () => {
    const from = (await page.locator('ui-tree-item[value="settings dialog"]').boundingBox())!
    const to = (await page.locator('ui-tree-item[value="films page"]').boundingBox())!
    await page.mouse.move(from.x + 40, from.y + 8)
    await page.mouse.down()
    await page.mouse.move(from.x + 40, from.y - 20, { steps: 5 })
    await page.mouse.move(to.x + 40, to.y + 3, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(SETTLE_MS)
    const after = await text()
    expect(after.indexOf('<dialog "settings dialog"/>')).toBeLessThan(after.indexOf('<page "films page"'))
  })

  /** Press part `name`'s row and drag it to `y` pixels down part `over`'s row:  still held, for its mark to be read. */
  async function dragOver(name: string, over: string, y: number) {
    const from = (await page.locator(`ui-tree-item[value="${name}"]`).boundingBox())!
    const to = (await page.locator(`ui-tree-item[value="${over}"]`).boundingBox())!
    await page.mouse.move(from.x + 40, from.y + 8)
    await page.mouse.down()
    await page.mouse.move(from.x + 40, from.y + 40, { steps: 5 })
    await page.mouse.move(to.x + 40, to.y + y, { steps: 10 })
  }

  /** The drop mark on part `name`'s row:  `before`, `after`, `into`;  `null`:  none. */
  const markOn = (name: string) => page.locator(`ui-tree-item[value="${name}"]`).getAttribute("data-drop")

  /** Let go of a drag with Escape, so nothing moves. */
  async function cancelDrag() {
    await page.keyboard.press("Escape")
    await page.mouse.up()
  }

  test("a row's top, middle and bottom each have their own mark;  a dialog's row has no middle", async () => {
    await dragOver("reviews page", "people page", 3)
    expect(await markOn("people page")).toBe("before")
    const to = (await page.locator('ui-tree-item[value="people page"]').boundingBox())!
    await page.mouse.move(to.x + 40, to.y + 11, { steps: 3 })
    expect(await markOn("people page")).toBe("into")
    await page.mouse.move(to.x + 40, to.y + 19, { steps: 3 })
    expect(await markOn("people page")).toBe("after")
    const dialog = (await page.locator('ui-tree-item[value="settings dialog"]').boundingBox())!
    await page.mouse.move(dialog.x + 40, dialog.y + dialog.height / 2 - 2, { steps: 3 })
    expect(await markOn("settings dialog")).toBe("before")
    await page.mouse.move(dialog.x + 40, dialog.y + dialog.height / 2 + 2, { steps: 3 })
    expect(await markOn("settings dialog")).toBe("after")
    await cancelDrag()
    expect(await markOn("settings dialog")).toBeNull()
  })

  test("a row can't be dropped on itself or one of its own pages:  no mark, nothing moves", async () => {
    const before = await text()
    await dragOver("planets page", "planet page", 11)
    expect(await markOn("planet page")).toBeNull()
    await page.mouse.up()
    await page.waitForTimeout(SETTLE_MS)
    expect(await text()).toBe(before)
  })

  test("a row dropped on a page's middle:  its first page, and ⌘Z takes it back in one step", async () => {
    const before = await text()
    await dragOver("starship page", "reviews page", 11)
    expect(await markOn("reviews page")).toBe("into")
    await page.mouse.up()
    await page.waitForTimeout(SETTLE_MS)
    expect(await text()).toContain(
      [
        '\t<page "reviews page" address="/reviews" title="Reviews">',
        '\t\t<page "starship page" address="/starships/:starship" title="Starship"/>',
        "\t</>"
      ].join("\n")
    )
    await page.locator(".SiteEditorPage h1").click()
    await page.keyboard.press("Meta+z")
    await page.waitForTimeout(SETTLE_MS)
    expect(await text()).toBe(before)
  })
  test("a page with pages under it:  asked first, then all of them go, as one step ⌘Z takes back", async () => {
    await page.locator(".SiteEditorPage .TileCard", { hasText: "/planets" }).first().click()
    await page.locator(".SiteEditorPage .form ui-button", { hasText: "Delete" }).click()
    const ask = page.getByText("Delete planets page and its 1 page(s) under it (Planet)?")
    await ask.waitFor({ timeout: 10_000 })
    await page.getByRole("button", { name: "Delete them all" }).click()
    await page.waitForTimeout(SETTLE_MS)
    expect(await text()).not.toMatch(/(<page|<spell-page) "planets? page"/)
    await page.locator(".SiteEditorPage h1").click()
    await page.keyboard.press("Meta+z")
    await page.waitForTimeout(SETTLE_MS)
    expect(await text()).toContain('<page "planet page" address="/planets/:planet" title="Planet"/>')
    expect(await text()).toContain('<spell-page "planets page">')
  })

  test("a page's stories:  one added, then ticked off, each one step written into the page;  its card counts them", async () => {
    await page.locator(".SiteEditorPage .TileCard", { hasText: "/films · " }).click()
    const stories = page.locator(".SitePageStories")
    await stories.locator("li").first().waitFor({ timeout: 10_000 })
    expect(await stories.locator("li").count()).toBe(3)
    await stories.locator("ui-button", { hasText: "Add a story" }).click()
    await page.waitForTimeout(SETTLE_MS)
    expect(await text()).toContain("\t\t- [x] open a film's page from its row\n\t\t- [ ] \n\t</>")
    await stories.locator("li").last().locator('input[type="checkbox"]').check()
    await page.waitForTimeout(SETTLE_MS)
    expect(await text()).toContain("\t\t- [x] \n")
    expect(await page.locator(".SiteEditorPage .TileCard", { hasText: "/films · 3 of 4 stories" }).count()).toBe(1)
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
