/**
 * A compiled program writing to a CSV file with a server in front, in a real page (epic `data` P14).
 * - The program is the frozen test project, `@spell/test/recipe-box`, with only its first lines changed:  no new word.
 * - Each change shows in the file as the one line it changed.
 * - Headless Chromium through Playwright, on the page's real `<spell-viewer>`, from `yarn build:element`:
 *   skips itself when that's not built.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"

import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { fixturePath } from "spell/app/spaces/test"
import { ELEMENT_DIR, startLiveRoomPages, type LiveRoomPages } from "spell/app/spaces/test/liveRoomPages"

/** How long a change may take to reach the file. */
const WAITING = { timeout: 8_000 }

/** The lines a program starts with, up to its first type. */
const PLACE_LINES = /^[\s\S]*?(?=^(?:a|una) ")/m

describe.skipIf(!existsSync(join(ELEMENT_DIR, "spell-runtime.js")))("a sheet with a server in front", () => {
  let browser: Browser
  let demo: LiveRoomPages
  let folder: string

  /** The file's text. */
  const fileNow = () => readFileSync(demo.servers.box.file, "utf8")

  /** The titles the page shows, in order. */
  const titlesOn = (page: Page) =>
    page
      .locator("ui-form.recipe input")
      .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value))

  beforeAll(async () => {
    folder = mkdtempSync(join(tmpdir(), "spell-sheet-writes-test-"))
    demo = await startLiveRoomPages({ port: 0, folder })
    browser = await chromium.launch()
  }, 60_000)

  afterAll(async () => {
    await browser?.close()
    await demo?.servers.close()
    if (folder) {
      rmSync(folder, { recursive: true, force: true })
      rmSync(`${folder}-room`, { recursive: true, force: true })
    }
  })

  test("a program's add, edit and remove each change their own line of the file", { timeout: 60_000 }, async () => {
    const lines = `family cookbook is a sheet at "${demo.servers.url}/api/places/recipes-csv":
	- its ids are in "id"
	- it is checked every 5 seconds`
    const program = readFileSync(fixturePath("recipe-box", "RecipeBox.spell"), "utf8").replace(
      PLACE_LINES,
      `${lines}\n\n`
    )
    const page = await browser.newPage()
    const problems: string[] = []
    page.on("pageerror", (error) => problems.push(error.message))
    await page.goto(demo.serve("sheet-writes", program))
    await page.locator("ui-form.recipe").first().waitFor(WAITING)
    const first = fileNow()

    // add:  every line that was there stays
    await page.locator("ui-input.draft input").fill("A new stew")
    await page.locator("ui-button.add").click()
    await expect.poll(fileNow, WAITING).toContain("A new stew")
    const added = fileNow()
      .split("\n")
      .find((line) => line.includes("A new stew"))!
    expect(fileNow().replace(`${added}\n`, "")).toBe(first)

    // edit:  that line alone
    const stew = page.locator("ui-form.recipe").first()
    await expect.poll(() => titlesOn(page), WAITING).toContain("A new stew")
    await stew.locator("input").click()
    await stew.locator("input").press("End")
    await stew.locator("input").pressSequentially(" again")
    await expect.poll(fileNow, WAITING).toContain("A new stew again")
    expect(fileNow().replace(`${added.replace("A new stew", "A new stew again")}\n`, "")).toBe(first)

    // remove:  it's as it was, byte for byte
    await stew.locator("ui-button.remove").click()
    await expect.poll(fileNow, WAITING).toBe(first)
    expect(problems).toEqual([])
    await page.close()
  })
})
