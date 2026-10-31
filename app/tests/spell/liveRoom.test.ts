/**
 * Two people on a live room, in two real pages (epic `data` P13):  who's here, and what the other one changed.
 * - The program is the frozen test project, `@spell/test/live-room`, and its Spanish twin, `sala-en-vivo`:  `liveRoomPages`.
 * - Headless Chromium through Playwright, in two contexts, on the page's real `<spell-viewer>`, from `yarn build:element`:
 *   skips itself when that's not built.
 */
import { existsSync, mkdtempSync, rmSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"

import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import {
  ELEMENT_DIR,
  LIVE_ROOM_PROGRAMS,
  startLiveRoomPages,
  type LiveRoomPages
} from "spell/app/spaces/test/liveRoomPages"

/** How long something done in one page may take to show in another. */
const WAITING = { timeout: 10_000 }

describe.skipIf(!existsSync(join(ELEMENT_DIR, "spell-runtime.js")))("two people, in two pages", () => {
  let browser: Browser
  let demo: LiveRoomPages
  let folder: string

  beforeAll(async () => {
    folder = mkdtempSync(join(tmpdir(), "spell-live-room-test-"))
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

  /** `person`, in a browser context of their own, at `address`:  whose errors are the test's. */
  async function personOn(address: string, person: string): Promise<{ page: Page; problems: string[] }> {
    const context = await browser.newContext()
    const page = await context.newPage()
    const problems: string[] = []
    page.on("pageerror", (error) => problems.push(`${error.message}`))
    page.on("console", (message) => {
      if (message.type() === "error" && !/404|Failed to load resource/.test(message.text()))
        problems.push(message.text())
    })
    await page.goto(`${address}?person=${person}`)
    return { page, problems }
  }

  /** Who `page` says is here. */
  const hereOn = (page: Page) => page.locator("ui-label.here").allTextContents()

  /** What `page` shows in the element of this class. */
  const textOn = (page: Page, name: string) => page.locator(`ui-text.${name}`).first().textContent()

  for (const [name, { news, added }] of Object.entries(LIVE_ROOM_PROGRAMS)) {
    test(`in ${name}:  each sees the other, and hears only the other's change`, { timeout: 90_000 }, async () => {
      const address = demo.serve(name)
      const ana = await personOn(address, "Ana")
      const bo = await personOn(address, "Bo")

      // who's here:  `my name`, `the people here`
      await expect.poll(() => textOn(ana.page, "me"), WAITING).toBe("Ana")
      await expect.poll(() => textOn(bo.page, "me"), WAITING).toBe("Bo")
      await expect.poll(() => hereOn(ana.page), WAITING).toEqual(["Ana", "Bo"])
      await expect.poll(() => hereOn(bo.page), WAITING).toEqual(["Ana", "Bo"])

      // Bo adds one:  it joins Ana's list by itself, drawn by a read written straight in the drawing (I18)
      const titlesOn = (page: Page) =>
        page
          .locator("ui-form.recipe input")
          .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value))
      await bo.page.locator("ui-button.add").click()
      await expect.poll(() => titlesOn(ana.page), WAITING).toContain(added)
      await expect.poll(() => textOn(ana.page, "news"), WAITING).toBe(`${news}${added}`)
      expect(await textOn(bo.page, "news")).toBe("")
      const title = `Stew by Bo in ${name}`

      // Bo changes it:  Ana's `when someone else changes it:` runs, and Bo's doesn't;  `when a recipe changes:` runs for both
      const fillAdded = async (page: Page, from: string, to: string) => {
        const titles = await titlesOn(page)
        await page.locator("ui-form.recipe input").nth(titles.indexOf(from)).fill(to)
      }
      await fillAdded(bo.page, added, title)
      await expect.poll(() => titlesOn(ana.page), WAITING).toContain(title)
      await expect.poll(() => textOn(ana.page, "news"), WAITING).toBe(`${news}${title}`)
      await expect.poll(async () => Number(await textOn(bo.page, "changes")), WAITING).toBeGreaterThan(0)
      await expect.poll(async () => Number(await textOn(ana.page, "changes")), WAITING).toBeGreaterThan(0)
      await bo.page.waitForTimeout(1_000)
      expect(await textOn(bo.page, "news")).toBe("")

      // and back:  Ana changes it, and now only Bo hears
      const other = `Stew by Ana in ${name}`
      await fillAdded(ana.page, title, other)
      await expect.poll(() => textOn(bo.page, "news"), WAITING).toBe(`${news}${other}`)
      await ana.page.waitForTimeout(1_000)
      expect(await textOn(ana.page, "news")).toBe(`${news}${title}`)

      // Bo goes:  Ana's alone
      await bo.page.context().close()
      await expect.poll(() => hereOn(ana.page), WAITING).toEqual(["Ana"])

      expect(ana.problems).toEqual([])
      expect(bo.problems).toEqual([])
      await ana.page.context().close()
    })
  }

  test(
    "a place that can't announce:  `it is checked every 1 seconds` finds someone else's change by itself",
    { timeout: 60_000 },
    async () => {
      const { source } = LIVE_ROOM_PROGRAMS.english
      const { servers } = demo
      const lines = `family cookbook is a web service at "${servers.url}":
	- a recipe's title is called "name"
	- its versions are in "version"
	- it is checked every 1 seconds`
      const address = demo.serve("polled", source.replace(/^family cookbook is .*$/m, lines))
      const { page, problems } = await personOn(address, "Ana")
      await page.locator("ui-form.recipe input").first().waitFor(WAITING)
      await expect.poll(() => hereOn(page), WAITING).toEqual(["Ana"])
      const [first] = [...servers.box.recipes.values()]
      const seen = await page
        .locator("ui-form.recipe input")
        .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value))
      expect(seen).toContain(first!.name)
      servers.box.change(first!.id, { name: "Changed behind its back" })
      await expect.poll(() => textOn(page, "news"), WAITING).toBe("Someone else changed Changed behind its back")
      expect(problems).toEqual([])
      await page.context().close()
    }
  )
})
