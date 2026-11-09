import { chromium, type Browser, type BrowserContext, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"

/**
 * The Inspector's Code band, on Solitaire (epic `editor`, Events In Code):  each event's, ability's and action's code
 * is the code editor on its lines of the file, so typing there is typing in the file.
 * - NOTHING reaches the disk:  every save is answered here, so the built-in examples can't change.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

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
      await page.locator(".InspectAppButton [part~=item]").first().click({ force: true })
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
      // its words are its row's header:  the field holds only its code
      .toEqual(["play it"])
    // an action:  its signature, its types in badges, then its code
    const action = page
      .locator(".InspectorEvent.action")
      .filter({ has: page.locator(".InspectorActionSignature", { hasText: /to\s*play/ }) })
      .first()
    const signature = action.locator(".InspectorActionSignature")
    expect((await signature.innerText()).replace(/\s+/g, " ").trim()).toBe("to play a card")
    expect(await signature.locator("ui-label").allInnerTexts()).toEqual(["a card"])
    // it takes nothing else:  a run button for the card selected
    expect(await signature.locator("ui-button.InspectorActionButton").count()).toBe(1)
    // one that needs a pile:  its type a badge, and no select or button, as it can't run from here
    const putOn = page.locator(".InspectorActionSignature").filter({ hasText: /put/ }).first()
    expect(await putOn.locator("ui-label").allInnerTexts()).toEqual(["a card", "a pile"])
    expect(await putOn.locator("ui-button, ui-select, ui-input").count()).toBe(0)
    expect((await action.locator(".CodeSlice .view-line").first().innerText()).replace(/\s+/g, " ")).toContain(
      "if the card's pile is the solitaire's stock"
    )
    // found where the compiler says it's declared, not by its words:  one whose words name another type (J58)
    const points = page
      .locator(".InspectorEvent.action")
      .filter({ has: page.locator(".InspectorActionSignature", { hasText: /count/ }) })
      .first()
    await expect
      .poll(async () => (await points.locator(".CodeSlice .view-line").first().innerText()).replace(/\s+/g, " "))
      .toContain("if pile is a foundation return 10")
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

  test("a one-line row's field starts after its words, and typing at its start lands there", async () => {
    const before = await mainFile()
    const field = row("clickable when").locator(".CodeSlice")
    await expect
      .poll(async () => (await field.locator(".view-lines").innerText()).replace(/\s+/g, " ").trim())
      .toMatch(/^it is face up or its pile is the solitaire's stock/)
    await field.locator(".view-line").first().click()
    await page.keyboard.press("Home")
    await page.keyboard.type("really ")
    await page.waitForTimeout(300)
    expect(await mainFile()).toContain("- clickable when really it is face up")
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
    expect(after).toContain(`- on drag cancelled set the solitaire's hint to " -- Not there"\n\t\t- on double click:`)
    expect(await row("on double click").locator(".CodeSlice").count()).toBe(1)
    expect(await page.evaluate(() => !!document.activeElement?.closest(".CodeSlice"))).toBe(true)
    // put it back, as the editor's own undo would
    await page.evaluate(() => (window as unknown as { editor: { history: { undo(): void } } }).editor.history.undo())
    await page.waitForTimeout(800)
    expect(await mainFile()).toBe(before)
  })
})
