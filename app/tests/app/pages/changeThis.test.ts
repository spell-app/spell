import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { chromium, type Browser, type BrowserContext, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

/**
 * Select something, say what should change, and the result lands with the app left running (epic `editor`, Change This).
 * - Counter, clicked three times:  the count stays, the words change.
 * - NOTHING reaches the disk or the inbox:  the routes are answered here, as a session would change the file.
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

/** The file, as the session leaves it, is the text there with `OLD_WORD` changed. */
const OLD_WORD = "Clicked {its count}"
const NEW_WORD = "Pressed {its count}"

describe.skipIf(!SERVING)("change this", { timeout: 240_000 }, () => {
  let browser: Browser
  let context: BrowserContext
  let page: Page
  /** The request as the server would answer it, and the file on disk. */
  let request: Record<string, unknown> | undefined
  let onDisk: string | undefined
  /** What the editor asked for. */
  let asked: Record<string, unknown> | undefined

  const button = () => page.locator(".AppPaneBody ui-button").first()

  /** Select the button:  Inspect app on first, since a plain click on a part stops inspecting (P11). */
  async function selectButton(): Promise<void> {
    if ((await page.locator(".InspectAppButton").first().getAttribute("aria-pressed")) !== "true") {
      await page.locator(".InspectAppButton [part~=item]").first().click()
      await page.waitForTimeout(400)
    }
    await button().click({ force: true })
    await page.waitForTimeout(400)
  }

  beforeAll(async () => {
    browser = await chromium.launch()
    context = await browser.newContext({ viewport: { width: 1280, height: 760 } })
    await context.route(/\/api\/changes/, (route) => {
      if (route.request().method() === "POST") {
        asked = route.request().postDataJSON() as Record<string, unknown>
        request = { ...asked, id: "c1", status: "waiting", listening: false }
      }
      return route.fulfill({ json: request })
    })
    await context.route(/\/spaces\/.*Counter\.spell/, async (route) => {
      if (route.request().method() !== "GET" || onDisk === undefined) return route.fallback()
      return route.fulfill({ contentType: "text/plain", body: onDisk })
    })
    await context.route(/\/api\/projects\/file\//, (route) => route.fulfill({ status: 200, body: "{}" }))
    page = await context.newPage()
    await page.goto(`${EDITOR}edit/@spell/examples/Counter`, { timeout: 60_000 })
    await page.waitForSelector(".AppPaneBody ui-button", { timeout: 60_000 })
    await page.waitForTimeout(3000)
    for (let clicks = 0; clicks < 3; clicks++) await button().click()
    await selectButton()
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
  })

  test("the key opens a box on what's selected, with the cursor in it", async () => {
    await page.keyboard.press("Meta+k")
    await page.waitForSelector(".ChangeThisBox")
    const focused = await page.evaluate(() => {
      let active = document.activeElement
      while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement
      return active?.localName
    })
    expect(focused).toBe("textarea")
  })

  test("Enter asks, with the place, and says when no session is listening", async () => {
    await page.keyboard.type("say Pressed")
    await page.keyboard.press("Enter")
    await page.waitForFunction(() => document.querySelector(".ChangeThisBox ui-code"))
    expect(asked).toMatchObject({
      projectId: "@spell/examples/Counter",
      filePath: "/Counter.spell",
      kind: "ui-button",
      text: "say Pressed"
    })
    expect(asked!.excerpt).toContain(OLD_WORD)
    expect(await page.locator(".ChangeThisBox ui-code").textContent()).toContain("spell app changes wait")
  })

  test("a session taking it says so", async () => {
    request = { ...request, status: "taken", listening: true }
    await page.waitForSelector(".ChangeThisWorking", { timeout: 5000 })
    expect(await page.locator(".ChangeThisBox ui-code").count()).toBe(0)
  })

  test("what the session did lands:  new words, the same count, what changed selected", async () => {
    const before = await page.evaluate(
      () => (window as unknown as { project: { spellFiles: { contents: string }[] } }).project.spellFiles[0]!.contents
    )
    onDisk = before.replace(OLD_WORD, NEW_WORD)
    request = { ...request, status: "done", summary: "the button says Pressed" }
    await expect.poll(() => button().innerText(), { timeout: 15_000 }).toBe("Pressed 3 times")
    expect(await page.locator(".ChangeThisBox").count()).toBe(0)
    const seen = await page.evaluate(() => {
      const { Inspector, editor } = window as unknown as {
        Inspector: { allSelected: { element: HTMLElement }[] }
        editor: { notice: string }
      }
      const selected = Inspector.allSelected[0]?.element
      return { connected: selected?.isConnected, words: selected?.innerText, notice: editor.notice }
    })
    expect(seen).toEqual({ connected: true, words: "Pressed 3 times", notice: "the button says Pressed" })
  })

  test("one undo takes it back", async () => {
    await page.locator(".AppPaneBody").click({ position: { x: 5, y: 300 }, force: true })
    await page.keyboard.press("Meta+z")
    await expect.poll(() => button().innerText(), { timeout: 15_000 }).toBe("Clicked 3 times")
  })

  test("a session that couldn't says why, and nothing changes", async () => {
    onDisk = undefined
    await selectButton()
    await page.keyboard.press("Meta+k")
    await page.waitForSelector(".ChangeThisBox")
    await page.keyboard.type("do something impossible")
    await page.keyboard.press("Enter")
    await page.waitForSelector(".ChangeThisBox ui-code")
    request = { ...request, status: "failed", summary: "no such thing" }
    await page.waitForFunction(() => !document.querySelector(".ChangeThisBox"))
    const error = await page.evaluate(() => String((window as unknown as { editor: { error?: unknown } }).editor.error))
    expect(error).toContain("no such thing")
    expect(await button().innerText()).toBe("Clicked 3 times")
  })
})
