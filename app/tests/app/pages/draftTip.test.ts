import { chromium, type Browser, type BrowserContext, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { CodeEditor, EDITOR, SERVING } from "./runningEditor"

/**
 * A drafted file's tab, its pen's tip (epic `editor` I92), in the running editor:
 * - hovered, the pen shows "Updated in your draft." and a link, Discard changes
 * - the link discards THAT file's draft, though another file is showing, and shows nothing else
 * - the old "Your draft" + Discard line under the tabs is gone
 * - NOTHING reaches the disk:  Solitaire's `Deck.spell` is drafted only in the drafts the server is asked for,
 *   and every save, discard and preference written is answered here.
 * - Needs this checkout's editor running:  `spell server start all`.  Skips itself when it isn't, as in CI.
 * - Headless Playwright, never a real browser window.
 */

/** The drafted file. */
const DRAFTED = "/Deck.spell"
/** Where its screenshots go:  the epic's tests folder, in the epic repo. */
const SHOTS = "/Users/owen/www/spell/spell.epics/epics/editor/tests"

describe.skipIf(!SERVING)("a drafted tab's pen's tip", { timeout: 180_000 }, () => {
  let browser: Browser
  let context: BrowserContext
  let page: Page
  /** The files discarded, as each discard asked. */
  const discarded: string[] = []

  beforeAll(async () => {
    browser = await chromium.launch()
    context = await browser.newContext({ viewport: { width: 1400, height: 900 } })
    await answerHere(context, discarded)
    page = await context.newPage()
    await page.goto(`${EDITOR}edit/@spell/examples/Solitaire`, { timeout: 60_000 })
    await new CodeEditor(page).shown()
    await page.waitForTimeout(4000)
    await page.evaluate(`(() => {
      const { editor } = window
      editor.showEditor(editor.project.spellFiles.find((each) => !each.path.endsWith("${DRAFTED}")).path)
    })()`)
    await page.waitForTimeout(1500)
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
  })

  test("no 'Your draft' line under the tabs", async () => {
    expect(await page.locator(".YourDraft").count()).toBe(0)
  })

  test("hovering the pen shows the tip, and its link discards that file's draft", async () => {
    const pen = page.locator(".Drafted:visible")
    await pen.waitFor({ timeout: 10_000 })
    expect(await pen.count()).toBe(1)
    const showing = (await page.evaluate(`window.editor.file.path`)) as string
    expect(showing).not.toMatch(/Deck\.spell$/)
    // the deck's text changed in the page only:  what discarding takes away
    const published = (await page.evaluate(`(() => {
      const deck = window.editor.project.spellFiles.find((each) => each.path.endsWith("${DRAFTED}"))
      const was = deck.contents
      deck.contents = was + "\\n// a change in my draft\\n"
      return was
    })()`)) as string

    await pen.hover()
    const tip = page.locator("ui-popup.DraftTip:visible")
    await tip.waitFor({ timeout: 5000 })
    expect(await tip.innerText()).toContain("Updated in your draft.")
    const link = tip.locator("ui-button", { hasText: "Discard changes" })
    expect(await link.count()).toBe(1)
    await page.waitForTimeout(600) // its fade in
    await page.screenshot({ path: `${SHOTS}/i92-tip.png`, clip: { x: 0, y: 0, width: 1000, height: 220 } })

    await link.click()
    // back to what's published, once the deck's published text is read
    await page.waitForFunction(
      `!window.editor.project.spellFiles.find((each) => each.path.endsWith("${DRAFTED}")).contents.includes("my draft")`,
      undefined,
      { timeout: 10_000 }
    )
    expect(discarded).toEqual([DRAFTED])
    expect(
      await page.evaluate(`window.editor.project.spellFiles.find((each) => each.path.endsWith("${DRAFTED}")).contents`)
    ).toBe(published)
    expect(await page.locator(".Drafted:visible").count()).toBe(0)
    // the file showing stays:  the tip's click isn't the tab's
    expect(await page.evaluate(`window.editor.file.path`)).toBe(showing)
    expect(await chosenTab(page)).toBe(showing.split("/").pop())
    await page.mouse.move(700, 600)
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${SHOTS}/i92-discarded.png`, clip: { x: 0, y: 0, width: 1000, height: 220 } })
  })
})

/** The label of the file tab that's chosen. */
function chosenTab(page: Page): Promise<string | undefined> {
  return page.evaluate(`(() => {
    const tabs = []
    const walk = (root) => {
      for (const each of root.querySelectorAll("*")) {
        if (each.localName === "ui-item" && each.closest("ui-toolbar[tabs]")) tabs.push(each)
        if (each.shadowRoot) walk(each.shadowRoot)
      }
    }
    walk(document)
    return tabs.find((tab) => tab.selected)?.getAttribute("label") ?? undefined
  })()`)
}

/**
 * Answer `context`'s writes here, so nothing reaches the disk, and draft `DRAFTED` until it's discarded:
 * - the drafts asked for:  the server's answer, with `DRAFTED` your draft, and yours to publish
 * - a discard:  noted in `discarded`, and the draft gone from the next answer
 * - a file saved, a preference written:  answered, never sent
 */
async function answerHere(context: BrowserContext, discarded: string[]): Promise<void> {
  await context.route(/\/api\/projects\/drafts\//, async (route) => {
    const drafts = discarded.includes(DRAFTED) ? [] : [{ filePath: DRAFTED, person: "owen", day: "2026-11-14" }]
    try {
      const answer = await (await route.fetch()).json()
      await route.fulfill({ json: { ...answer, drafts, mayPublish: true } })
    } catch {
      // the page closed while it asked
    }
  })
  await context.route(/\/api\/projects\/discard/, async (route) => {
    discarded.push(JSON.parse(route.request().postData() ?? "{}").filePath)
    await route.fulfill({ json: {} })
  })
  const answer = (route: Parameters<Parameters<BrowserContext["route"]>[1]>[0]) =>
    route.request().method() === "GET" ? route.continue() : route.fulfill({ json: {} })
  await context.route(/\/api\/projects\/file\//, answer)
  await context.route(/\/api\/prefs/, answer)
  await context.route(/\.spell(\?.*)?$/, answer)
}
