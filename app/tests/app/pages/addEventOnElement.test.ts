import { chromium, type Browser, type BrowserContext, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"

/**
 * Adding an event to a Spell UI element in the Inspector's Code card, on Solitaire's title (epic `editor` I141):
 * the + writes `onClick={}` on its tag, and the card shows only the handler's code, empty, with the cursor in it.
 * - NOTHING reaches the disk:  every save is answered here, and a file read back is what was "saved",
 *   so the built-in examples can't change.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** What a compile and redraw takes, at most. */
const SETTLE_MS = 3000

describe.skipIf(!SERVING)("Adding an event to a Spell UI element", { timeout: 180_000 }, () => {
  let browser: Browser
  let context: BrowserContext
  let page: Page
  const printed: string[] = []

  /** The line of Solitaire's drawing with its title on it, as the editor holds it now. */
  const titleLine = () =>
    page.evaluate(() =>
      (window as unknown as { project: { spellFiles: { contents: string }[] } }).project.spellFiles
        .flatMap((file) => file.contents.split("\n"))
        .find((line) => line.includes(">Spell Solitaire<"))
    )

  /** Is the cursor in the Code card's slice? */
  const isTypingInSlice = () => page.evaluate(() => !!document.activeElement?.closest(".InspectorCodeCard .CodeSlice"))

  /** The words its slice shows:  its lines, without what it hides. */
  const shownInSlice = () =>
    page
      .locator(".InspectorCodeCard .CodeSlice")
      .first()
      .evaluate((slice) =>
        [...slice.querySelectorAll(".view-line")]
          .filter((line) => line.getBoundingClientRect().height > 0)
          .map((line) =>
            [...line.querySelectorAll("span span")]
              .filter((piece) => !piece.closest(".CodeSliceHidden"))
              .map((piece) => piece.textContent)
              .join("")
              // Monaco draws a space as a no-break space
              .replace(/\u00a0/g, " ")
          )
      )

  beforeAll(async () => {
    browser = await chromium.launch()
    context = await browser.newContext({ viewport: { width: 1500, height: 950 } })
    // saves answered here;  a file the editor reads back after saving is what it saved
    const saved = new Map<string, string>()
    await context.route(/\/api\/(projects\/file|prefs)\//, (route) => {
      const request = route.request()
      if (request.method() === "GET") return route.continue()
      const at = request.url().match(/\/api\/projects\/file\/(.*?)(\?|$)/)?.[1]
      if (at) {
        let body = request.postData() ?? ""
        try {
          const json = JSON.parse(body) as { contents?: unknown }
          if (typeof json.contents === "string") body = json.contents
        } catch {
          // a body that isn't JSON is the file's text
        }
        saved.set(decodeURIComponent(at), body)
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
    })
    await context.route(/\/spaces\/.*\.spell(\?|$)/, (route) => {
      const at = decodeURIComponent(
        route
          .request()
          .url()
          .match(/\/spaces\/(.*?)(\?|$)/)![1]!
      )
      const text = saved.get(at)
      return text === undefined
        ? route.continue()
        : route.fulfill({ status: 200, contentType: "text/plain", body: text })
    })
    page = await context.newPage()
    page.on("console", (message) => printed.push(message.text()))
    await page.goto(`${EDITOR}edit/@spell/examples/Solitaire`, { timeout: 60_000 })
    await page.waitForSelector(".InputEditor .monaco-editor .view-line", { timeout: 60_000 })
    await page.waitForTimeout(3000)
    if (!(await page.evaluate(() => !!document.querySelector(".InspectAppButton.inspecting")))) {
      await page.locator(".InspectAppButton [part~=item]").first().click({ force: true })
    }
    // the title, from the Views card:  it draws as text, with no box of its own to click
    await page.locator(".InspectorViews").first().waitFor({ timeout: 15_000 })
    const title = page.locator(".InspectorViews").getByText("Spell Solitaire", { exact: true }).first()
    for (let tries = 0; tries < 5 && !(await page.locator("ui-dropdown.InspectorAddEvent").count()); tries++) {
      await title.click({ force: true })
      await page.waitForTimeout(1500)
    }
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
  })

  test("the + writes an empty handler on its tag;  the card shows it empty, never the tag, the cursor in it", async () => {
    expect(await titleLine()).not.toContain("onClick")
    // its pick, as the dropdown tells it:  the dropdown itself is Spell UI's, tested there
    await page.evaluate(() =>
      document
        .querySelector("ui-dropdown.InspectorAddEvent")!
        .dispatchEvent(new CustomEvent("ui-changed", { detail: { value: "click" } }))
    )
    await page.waitForTimeout(SETTLE_MS)
    expect(await titleLine()).toContain("heavy onClick={}>Spell Solitaire</>")
    expect(await page.locator(".InspectorEvent").filter({ hasText: "on click" }).count()).toBe(1)
    expect(await shownInSlice()).toEqual([""])
    // still there after the compile, which draws the title again, and the card with it
    expect(await isTypingInSlice()).toBe(true)
  })

  test("typing goes in its braces, through each compile;  a click on the title then runs it", async () => {
    await page.keyboard.type("print ")
    await page.waitForTimeout(SETTLE_MS)
    expect(await isTypingInSlice()).toBe(true)
    await page.keyboard.type('"title clicked"')
    await page.waitForTimeout(SETTLE_MS)
    expect(await titleLine()).toContain('onClick={print "title clicked"}>Spell Solitaire</>')
    expect(await shownInSlice()).toEqual(['print "title clicked"'])
    // done inspecting:  a click on the title is the app's
    await page.locator(".InspectAppButton [part~=item]").first().click({ force: true })
    await page.waitForTimeout(1500)
    const app = (await page.locator("solitaire-app").first().boundingBox())!
    await page.mouse.click(app.x + 60, app.y + 36)
    await expect.poll(() => printed.filter((line) => line === "title clicked").length).toBe(1)
  })
})
