import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { chromium, type Browser, type BrowserContext, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

/**
 * The Inspector's Code band, on Solitaire (epic `editor`, Events In Code):  each event's, ability's and action's code
 * is the code editor on its lines of the file, so typing there is typing in the file.
 * - NOTHING reaches the disk:  every save is answered here, so the built-in examples can't change.
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

/** What a compile and redraw takes, at most. */
const SETTLE_MS = 2500

describe.skipIf(!SERVING)("The Inspector's Code band", { timeout: 180_000 }, () => {
  let browser: Browser
  let context: BrowserContext
  let page: Page

  /** Solitaire's main file, as the editor holds it now. */
  const mainFile = () =>
    page.evaluate(
      () =>
        (
          window as unknown as { project: { spellFiles: { path: string; contents: string }[] } }
        ).project.spellFiles.find((file) => file.path.endsWith("/Solitaire.spellml"))!.contents
    )

  /** The Code band's row starting with `words`. */
  const row = (words: string) => page.locator(".InspectorEvent").filter({ hasText: words }).first()

  beforeAll(async () => {
    browser = await chromium.launch()
    context = await browser.newContext({ viewport: { width: 1500, height: 950 } })
    await context.route(/\/api\/projects\/file\//, (route) =>
      route.request().method() === "GET"
        ? route.continue()
        : route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
    )
    page = await context.newPage()
    await page.goto(`${EDITOR}edit/@spell/examples/Solitaire`, { timeout: 60_000 })
    await page.waitForSelector(".InputEditor .monaco-editor .view-line", { timeout: 60_000 })
    await page.waitForTimeout(3000)
    if (!(await page.evaluate(() => !!document.querySelector(".InspectAppButton.inspecting")))) {
      await page.locator(".InspectAppButton").first().click({ force: true })
    }
    await page.waitForTimeout(1500)
    // the lowest card on screen:  face up
    const at = await page.evaluate(() => {
      const cards: Element[] = []
      const walk = (root: ParentNode) => {
        for (const element of root.querySelectorAll("*")) {
          if (element.localName === "solitaire-card") cards.push(element)
          if (element.shadowRoot) walk(element.shadowRoot)
        }
      }
      walk(document)
      const box = cards
        .map((card) => card.getBoundingClientRect())
        .filter((box) => box.width > 10)
        .sort((a, b) => b.bottom - a.bottom)[0]!
      return [box.x + box.width / 2, box.bottom - 8]
    })
    await page.mouse.click(at[0]!, at[1]!)
    await page.waitForTimeout(SETTLE_MS)
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
  })

  test("a card's events and actions show their lines of the file, in the code editor", async () => {
    expect(await page.locator("ui-property-group.InspectorEvents").getAttribute("label")).toBe("Code")
    await expect
      .poll(async () =>
        (await row("on click").locator(".CodeSlice .view-line").allInnerTexts()).map((line) =>
          line.replace(/\s+/g, " ").trim()
        )
      )
      .toEqual(["- on click play it"])
    // an action:  its run button, then its code
    const action = page.locator(".InspectorEvent.action").filter({ hasText: "play it" }).first()
    expect((await action.locator(".CodeSlice .view-line").first().innerText()).replace(/\s+/g, " ")).toContain(
      "if the pile of the card"
    )
  })

  test("typing in one is typing in the file:  the app keeps running, and undo takes it back", async () => {
    const before = await mainFile()
    await page.evaluate(() => {
      ;(window as unknown as { app: Element | null }).app = document.querySelector("solitaire-app")
    })
    const line = row("on drag cancelled").locator(".CodeSlice .view-line").last()
    await line.click()
    await page.keyboard.press("End")
    await page.keyboard.press("ArrowLeft")
    await page.keyboard.type(", really")
    await page.keyboard.press("ControlOrMeta+Enter")
    await page.waitForTimeout(SETTLE_MS)
    expect(await mainFile()).toContain('" -- Not there, really"')
    // the same app, not drawn again (Edit Without Redraw)
    expect(
      await page.evaluate(() => {
        const kept = (window as unknown as { app: Element | null }).app
        return !!kept && kept.isConnected && kept === document.querySelector("solitaire-app")
      })
    ).toBe(true)
    // undo, from the same editor
    for (let step = 0; step < 8 && (await mainFile()) !== before; step++) {
      await page.keyboard.press("ControlOrMeta+Z")
      await page.waitForTimeout(150)
    }
    expect(await mainFile()).toBe(before)
  })

  test("the band's + writes an empty handler in its place, which takes the cursor", async () => {
    const before = await mainFile()
    // its pick, as the dropdown tells it:  the dropdown itself is Spell UI's, tested there
    await page.evaluate(() =>
      document
        .querySelector("ui-dropdown.InspectorAddEvent")!
        .dispatchEvent(new CustomEvent("ui-changed", { detail: { value: "dblclick" } }))
    )
    await page.waitForTimeout(SETTLE_MS)
    const after = await mainFile()
    expect(after).toContain(
      '- on drag cancelled set the hint of the solitaire to " -- Not there"\n\t\t- on double click:'
    )
    expect(await row("on double click").locator(".CodeSlice").count()).toBe(1)
    expect(await page.evaluate(() => !!document.activeElement?.closest(".CodeSlice"))).toBe(true)
    // put it back, as the editor's own undo would
    await page.evaluate(() => (window as unknown as { editor: { history: { undo(): void } } }).editor.history.undo())
    await page.waitForTimeout(800)
    expect(await mainFile()).toBe(before)
  })
})
