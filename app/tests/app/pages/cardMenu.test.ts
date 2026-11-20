import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { chromium, type Browser, type BrowserContext, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"
import { createTestProject, type TestProject } from "./testProject"

/**
 * The "..." menu on each of your own projects' cards on the home page (epic `mockup` T47):
 * every item, on a project of its own in your space, which `createTestProject()` makes and removes.
 * - The copy Duplicate makes is named as a test project too (`cardmenu2-test-<pid>`), so a killed run's goes too;
 *   Rename then renames it, and Delete deletes it, through the menu.
 * - Update App Snapshot takes its picture with the browser's screen capture, which headless Chromium shares without
 *   asking (`CAPTURE_FLAGS`).
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** Its one file:  the Calculator example's, so its app draws something to picture. */
const FILE = "/Calculator.spell"
const CONTENTS = readFileSync(
  path.join(import.meta.dirname, "../../../spaces/@spell/examples/calculator/Calculator.spell"),
  "utf8"
)

/** Whose space the test projects are in:  `createTestProject()`'s. */
const OWNER = "owen@spell"

/** Headless Chromium's switches that share this tab when a page asks, with no question. */
const CAPTURE_FLAGS = ["--auto-accept-this-tab-capture", "--use-fake-ui-for-media-stream"]

/** The items, in order, a divider as `-`. */
const ITEMS = [
  "Run App in a New Tab",
  "-",
  "Rename Project…",
  "Duplicate Project…",
  "Versions…",
  "Export as .zip",
  "Update App Snapshot…",
  "-",
  "Delete Project…"
]

describe.skipIf(!SERVING)('a home page card\'s "..." menu', { timeout: 240_000 }, () => {
  let browser: Browser
  let context: BrowserContext
  let page: Page
  /** The project this test makes, in your space. */
  let project: TestProject
  /** The copy Duplicate makes, then Rename renames:  its folder name now. */
  let copy = `cardmenu2-test-${process.pid}`

  /** The card of project `folderName` in your space, by its link. */
  const cardOf = (folderName: string) =>
    page
      .locator("#projects .TileCardHolder")
      .filter({ has: page.locator(`a[href="${OWNER}/${folderName}"]`) })
      .first()
  /** Open `folderName`'s card's menu, and choose `item`. */
  const choose = async (folderName: string, item: string) => {
    await cardOf(folderName).locator("ui-dropdown.CardMenu").click()
    await page.getByText(item, { exact: true }).filter({ visible: true }).click()
  }
  /** Answer the editor's dialog showing (its `prompt()` or `confirm()`):  type `text` into it, if it asks, then OK. */
  const answer = async (text?: string) => {
    const dialog = page.locator("ui-modal:not(.AppSnapshot)").last()
    await dialog.locator("ui-button.approve").waitFor({ timeout: 10_000 })
    if (text !== undefined) await dialog.locator("input").fill(text)
    await dialog.locator("ui-button.approve").click()
  }
  /** The home page, still:  nothing in the menu opens the project. */
  const stillHome = () => expect(new URL(page.url()).pathname).toBe("/")
  /** The project's folder's name:  `cardmenu-test-82913`. */
  const title = () => project.projectId.split("/").at(-1)!
  /** The folder of `folderName` in your space. */
  const folderOf = (folderName: string) => path.join(path.dirname(project.folder), folderName)

  beforeAll(async () => {
    browser = await chromium.launch({ args: CAPTURE_FLAGS })
    context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 })
    page = await context.newPage()
    project = await createTestProject(EDITOR!, { name: "cardmenu", filePath: FILE, contents: CONTENTS })
    await page.goto(EDITOR!, { timeout: 60_000 })
    await cardOf(title()).waitFor({ timeout: 60_000 })
    await page.waitForTimeout(1500)
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
    await project?.remove()
  })

  test("on your own projects' cards alone, in the card's bottom right corner, named, its items in order", async () => {
    const menu = cardOf(title()).locator("ui-dropdown.CardMenu")
    expect(await menu.getAttribute("aria-label")).toBe("Project actions")
    // T56:  13px in from the card's right and bottom edges (12px, and 1px for its border);  the dots' ink centred in the circle
    const place = await cardOf(title()).evaluate((holder) => {
      const button = holder.querySelector("ui-dropdown.CardMenu")!.getBoundingClientRect()
      const card = holder.querySelector(".TileCard")!.getBoundingClientRect()
      const dots = holder
        .querySelector("ui-dropdown.CardMenu ui-icon")!
        .shadowRoot!.querySelector<SVGGraphicsElement>("svg path")!
      const ink = dots.getBBox()
      const matrix = dots.getScreenCTM()!
      const inkStart = new DOMPoint(ink.x, ink.y).matrixTransform(matrix)
      const inkEnd = new DOMPoint(ink.x + ink.width, ink.y + ink.height).matrixTransform(matrix)
      const middle = (start: number, end: number) => (start + end) / 2
      return {
        size: [button.width, button.height],
        inFromCorner: [card.right - button.right, card.bottom - button.bottom],
        inkOff: [
          middle(inkStart.x, inkEnd.x) - middle(button.left, button.right),
          middle(inkStart.y, inkEnd.y) - middle(button.top, button.bottom)
        ]
      }
    })
    expect(place.size).toEqual([24, 24])
    for (const off of place.inFromCorner) expect(Math.abs(off - 13)).toBeLessThan(0.5)
    for (const off of place.inkOff) expect(Math.abs(off)).toBeLessThan(0.5)
    expect(await page.locator("#examples ui-dropdown.CardMenu, #guides ui-dropdown.CardMenu").count()).toBe(0)
    const items = await menu.evaluate((dropdown) =>
      [...dropdown.querySelectorAll("ui-item")].map((item) =>
        item.getAttribute("kind") === "divider" ? "-" : (item.textContent?.trim() ?? "")
      )
    )
    expect(items).toEqual(ITEMS)
  })

  test("Run App in a New Tab:  the runner in a new tab;  this page stays home", async () => {
    const [tab] = await Promise.all([context.waitForEvent("page"), choose(title(), "Run App in a New Tab")])
    expect(tab.url()).toContain(`/run/${project.projectId}`)
    await tab.close()
    stillHome()
  })

  test("Export as .zip:  a download of the project", async () => {
    const [download] = await Promise.all([page.waitForEvent("download"), choose(title(), "Export as .zip")])
    expect(download.suggestedFilename()).toMatch(/\.zip$/)
    stillHome()
  })

  test("Versions…:  the project's versions box, closed with Cancel", async () => {
    await choose(title(), "Versions…")
    await page.waitForSelector("ui-modal[visible]", { timeout: 15_000 })
    await page.locator("ui-modal[visible] ui-button.cancel").click()
    await page.waitForSelector("ui-modal[visible]", { state: "detached", timeout: 10_000 })
    stillHome()
  })

  test("Update App Snapshot…:  the app in a phone, a snapshot cropped, saved as its picture, 780 by 439", async () => {
    await choose(title(), "Update App Snapshot…")
    await page.waitForSelector(".AppSnapshot iframe", { timeout: 15_000 })
    /** The phone's screen's size on the page, in CSS pixels. */
    const screenSize = () =>
      page
        .locator(".AppSnapshotScreen")
        .evaluate((screen) => [(screen as HTMLElement).offsetWidth, (screen as HTMLElement).offsetHeight])
    expect((await screenSize())[0]).toBe(390)
    // its app drawn:  a cold editor compiles it first
    const app = page.frameLocator(".AppSnapshot iframe")
    await app.locator("#spell-app-root > *").first().waitFor({ timeout: 90_000 })
    // what to do, over the phone
    await page.locator(".AppSnapshotHint").waitFor()
    // Change theme:  the app in Merlot, dark, at once;  only the app in the phone
    const editorTheme = await page.locator("html").getAttribute("data-spell-theme")
    for (const look of ["Merlot", "Dark"]) {
      await page.locator(".AppSnapshotTheme").click()
      await page.getByRole("option", { name: look }).click()
    }
    await expect.poll(() => app.locator("html").getAttribute("data-spell-theme")).toBe("merlot")
    await expect.poll(() => app.locator("html").getAttribute("class")).toContain("ui-dark")
    expect(await page.locator("html").getAttribute("data-spell-theme")).toBe(editorTheme)
    // Rotate:  on its side, the app as wide as a phone is long
    // the device's own Rotate, in its bottom edge
    await page.locator('.AppSnapshot [part~="rotate"]').click()
    await expect.poll(screenSize).toEqual([844, 390])
    await page.locator(".AppSnapshotGo").click()
    await page.waitForSelector(".AppSnapshotFrame", { timeout: 20_000 })
    // the crop step's own message, at once
    await expect.poll(() => page.locator(".AppSnapshotHint").textContent()).toContain("Drag a corner")
    const frame = page.locator(".AppSnapshotFrame")
    const width = async () => Number(await frame.getAttribute("data-width"))
    // as big as fits:  the screen's height, in the card's shape
    expect(await width()).toBe(Math.floor(390 / (9 / 16)))
    // `-` makes it smaller, then stops:  where the picture would be blown up too far (past 2/3 of its pixels;
    // where that is depends on the capture's pixels)
    await frame.focus()
    for (let i = 0; i < 30; i++) await page.keyboard.press("-")
    const smallest = await width()
    expect(smallest).toBeLessThan(693)
    await page.keyboard.press("-")
    expect(await width()).toBe(smallest)
    // a corner dragged makes it bigger again
    const corner = (await page.locator(".AppSnapshotCorner.bottom-right").boundingBox())!
    await page.mouse.move(corner.x + 8, corner.y + 8)
    await page.mouse.down()
    await page.mouse.move(corner.x + 108, corner.y + 8, { steps: 5 })
    await page.mouse.up()
    expect(await width()).toBeGreaterThan(smallest)
    // the arrow keys move it
    await page.keyboard.press("Home")
    await page.keyboard.press("Shift+ArrowDown")
    expect(await frame.getAttribute("aria-valuenow")).toBe("40")
    await page.locator(".AppSnapshotGo").click()
    await page.waitForSelector(".AppSnapshot", { state: "detached", timeout: 15_000 })
    const picture = readFileSync(path.join(project.folder, "__thumbnail.png"))
    // a PNG's size, from its header
    expect([picture.readUInt32BE(16), picture.readUInt32BE(20)]).toEqual([780, 439])
    // its card shows it at once
    await cardOf(title()).locator("img.picture").waitFor({ timeout: 10_000 })
    stillHome()
  })

  test("Duplicate Project…:  asks a name, its copy's card beside it", async () => {
    await choose(title(), "Duplicate Project…")
    await answer(copy)
    await cardOf(copy).waitFor({ timeout: 15_000 })
    expect(existsSync(folderOf(copy))).toBe(true)
    stillHome()
  })

  test("Rename Project…:  asks a name, the card renamed in place", async () => {
    const renamed = `cardmenu3-test-${process.pid}`
    await choose(copy, "Rename Project…")
    await answer(renamed)
    await cardOf(renamed).waitFor({ timeout: 15_000 })
    expect(existsSync(folderOf(copy))).toBe(false)
    expect(existsSync(folderOf(renamed))).toBe(true)
    copy = renamed
    stillHome()
  })

  test("Delete Project…:  asks first, then the card goes", async () => {
    await choose(copy, "Delete Project…")
    await answer()
    await cardOf(copy).waitFor({ state: "detached", timeout: 15_000 })
    expect(existsSync(folderOf(copy))).toBe(false)
    stillHome()
  })
})
