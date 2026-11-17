import { chromium, type Browser, type BrowserContext, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { CodeEditor, EDITOR, SERVING } from "./runningEditor"

/**
 * Renaming an action by its name in the Inspector's Code card, on Solitaire (epic `editor` I111):
 * a click on `cheat` makes it a field, and leaving the field renames it everywhere it's named.
 * - NOTHING reaches the disk:  every save is answered here, and a file read back is what was "saved",
 *   so the built-in examples can't change.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** What a compile and redraw takes, at most. */
const SETTLE_MS = 2500

describe.skipIf(!SERVING)("Renaming an action in the Inspector", { timeout: 180_000 }, () => {
  let browser: Browser
  let context: BrowserContext
  let page: Page

  /** Every spell file of Solitaire, as the editor holds them now, one after another. */
  const allFiles = () =>
    page.evaluate(() =>
      (window as unknown as { project: { spellFiles: { contents: string }[] } }).project.spellFiles
        .map((file) => file.contents)
        .join("\n")
    )

  /** How many times `words` is in `text`. */
  const count = (text: string, words: string) => text.split(words).length - 1

  /** The field for the action called `words`, opened by a click on its name. */
  const openField = async (words: string) => {
    const name = page.locator(".InspectorActionName").filter({ hasText: new RegExp(`^${words}$`) })
    await name.scrollIntoViewIfNeeded()
    await name.click()
    const field = page.locator(".InspectorActionNameField")
    await expect.poll(() => field.count()).toBe(1)
    // its words chosen, to type over
    await page.waitForTimeout(300)
    return field
  }

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
    await page.goto(`${EDITOR}edit/@spell/examples/Solitaire`, { timeout: 60_000 })
    await new CodeEditor(page).shown()
    await page.waitForTimeout(3000)
    if (!(await page.evaluate(() => !!document.querySelector(".InspectAppButton.inspecting")))) {
      await page.locator(".InspectAppButton [part~=item]").first().click({ force: true })
    }
    await page.waitForTimeout(1500)
    // the game's top bar, then the app itself, from the Views card
    const bar = (await page.locator("solitaire-app").first().boundingBox())!
    await page.mouse.click(bar.x + bar.width / 2, bar.y + 36)
    await page.waitForTimeout(SETTLE_MS)
    await page.locator(".InspectorViews").getByText("Solitaire", { exact: true }).first().click({ force: true })
    await page.waitForTimeout(SETTLE_MS)
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
  })

  test("Esc leaves it as it was", async () => {
    const before = await allFiles()
    await openField("cheat")
    await page.keyboard.type("nope")
    await page.keyboard.press("Escape")
    await expect.poll(() => page.locator(".InspectorActionNameField").count()).toBe(0)
    expect(await allFiles()).toBe(before)
  })

  test("a name another member has is refused at the field, in words, and nothing is renamed", async () => {
    const before = await allFiles()
    const field = await openField("cheat")
    const row = page.locator("ui-section.InspectorEvent.action").filter({ has: field })
    // a property of the app's
    await page.keyboard.type("score")
    await page.keyboard.press("Enter")
    const error = page.locator(".InspectorActionNameError")
    await expect.poll(() => error.count()).toBe(1)
    // what has the name, then the link back (I139)
    expect(await error.innerText()).toBe('There is already a property named "score."\nRestore "cheat"')
    expect(await field.getAttribute("state")).toBe("error")
    expect(await allFiles()).toBe(before)
    // another action's, and leaving by Tab
    await page.keyboard.press("ControlOrMeta+a")
    await page.keyboard.type("auto play")
    // a Space typed never folds the row around the field
    expect(await row.getAttribute("open")).not.toBe("false")
    await page.keyboard.press("Tab")
    await expect.poll(() => error.innerText()).toBe('There is already an action named "auto play."\nRestore "cheat"')
    expect(await allFiles()).toBe(before)
    // the Tab brings the focus back to the field, never on to the row's run button, ringed
    expect(await page.evaluate(() => document.activeElement?.className)).toContain("InspectorActionNameField")
    // never the error banner
    expect(await page.evaluate(() => !!(window as unknown as { editor: { error?: unknown } }).editor.error)).toBe(false)
    await page.keyboard.press("Escape")
    await expect.poll(() => field.count()).toBe(0)
  })

  test("Restore puts the old name back and closes the field", async () => {
    const before = await allFiles()
    const field = await openField("cheat")
    await page.keyboard.type("score")
    await page.keyboard.press("Enter")
    const restore = page.locator(".InspectorActionNameRestoreLink")
    await expect.poll(() => restore.count()).toBe(1)
    await restore.click()
    await expect.poll(() => field.count()).toBe(0)
    expect(
      await page
        .locator(".InspectorActionName")
        .filter({ hasText: /^cheat$/ })
        .count()
    ).toBe(1)
    await page.waitForTimeout(500)
    expect(await allFiles()).toBe(before)
    expect(await page.evaluate(() => !!(window as unknown as { editor: { error?: unknown } }).editor.error)).toBe(false)
  })

  test("Restore still restores when the press is let go a few pixels off the link", async () => {
    const before = await allFiles()
    const field = await openField("restart the game")
    await page.keyboard.type("cheat")
    await page.keyboard.press("Enter")
    const restore = page.locator(".InspectorActionNameRestoreLink")
    await expect.poll(() => restore.count()).toBe(1)
    // a person's press:  down on the word, let go just under it (the link is 12px tall)
    const box = (await restore.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height + 4, { steps: 3 })
    await page.mouse.up()
    await expect.poll(() => field.count()).toBe(0)
    expect(
      await page
        .locator(".InspectorActionName")
        .filter({ hasText: /^restart the game$/ })
        .count()
    ).toBe(1)
    await page.waitForTimeout(500)
    expect(await allFiles()).toBe(before)
  })

  test("renamed, the row shows the new name at once with a spinner, and its code keeps its lines (I168)", async () => {
    const before = await allFiles()
    await openField("restart the game")
    await page.keyboard.type("start over")
    // the row's name and its code's first line, at every frame and change, from the Enter on
    await page.evaluate(() => {
      const seen: string[] = []
      ;(window as unknown as { renameFrames: string[] }).renameFrames = seen
      const started = performance.now()
      const note = () => {
        for (const row of document.querySelectorAll(".InspectorCodeCard ui-section.InspectorEvent.action")) {
          const name = row.querySelector(".InspectorActionName")?.textContent ?? ""
          if (!/restart the game|start over/.test(name)) continue
          // CodeMirror draws its lines in order:  the first drawn is the first
          const first = row.querySelector(".cm-line")
          const spinner = row.querySelector(".InspectorActionNameSpinner") ? " +spinner" : ""
          seen.push(`${name}${spinner} | ${first?.textContent?.replace(/\s+/g, " ").trim() ?? ""}`)
        }
      }
      const frame = () => {
        note()
        if (performance.now() - started < 5000) requestAnimationFrame(frame)
      }
      requestAnimationFrame(frame)
      new MutationObserver(note).observe(document.querySelector(".InspectorCodeCard")!, {
        subtree: true,
        childList: true,
        characterData: true
      })
    })
    await page.keyboard.press("Enter")
    await expect.poll(allFiles, { timeout: 10_000 }).toContain('to "start over" with shortcut "R"')
    await page.waitForTimeout(5000)
    const frames = await page.evaluate(() => (window as unknown as { renameFrames: string[] }).renameFrames)
    // never the old name, never a line of its code out of place
    expect(frames.filter((frame) => frame.startsWith("restart the game"))).toEqual([])
    expect(frames.filter((frame) => !/\| (clear the score)?$/.test(frame))).toEqual([])
    // the spinner first, gone at the end
    expect(frames.some((frame) => frame.startsWith("start over +spinner"))).toBe(true)
    expect(frames.at(-1)).toBe("start over | clear the score")
    await page.keyboard.press("ControlOrMeta+z")
    await expect.poll(allFiles, { timeout: 10_000 }).toBe(before)
    await page.waitForTimeout(SETTLE_MS)
  })

  test("leaving the field renames it everywhere it's named, as one undo", async () => {
    const before = await allFiles()
    const buttons = count(before, '<action "cheat"/>')
    expect(buttons).toBeGreaterThan(0)
    await openField("cheat")
    await page.keyboard.type("peek at a card")
    // a click away
    await page.locator(".InspectorViews").getByText("Solitaire", { exact: true }).first().click({ force: true })
    await expect.poll(allFiles, { timeout: 10_000 }).toContain('to "peek at a card" with shortcut "C", icon "eye"')
    await page.waitForTimeout(SETTLE_MS)
    const after = await allFiles()
    expect(count(after, '"cheat"')).toBe(0)
    expect(count(after, '<action "peek at a card"/>')).toBe(buttons)
    // one undo takes the head and every button back
    await page.keyboard.press("ControlOrMeta+z")
    await expect.poll(allFiles, { timeout: 10_000 }).toBe(before)
  })

  test("a press away that keeps the focus in the field still renames, as Enter does;  Esc still cancels (I234)", async () => {
    const before = await allFiles()
    // somewhere the page keeps the focus from, as a Spell UI menu's items do:  the field's `focusout` never comes
    await page.evaluate(() => {
      const spot = document.createElement("div")
      spot.className = "keepsFocus"
      spot.style.cssText = "position: fixed; left: 0; bottom: 0; width: 40px; height: 40px; z-index: 99999"
      spot.addEventListener("mousedown", (event) => event.preventDefault())
      document.body.append(spot)
    })
    const away = page.locator(".keepsFocus")
    // Esc first:  typed, then Esc, then a press away writes nothing
    await openField("cheat")
    await page.keyboard.type("nope")
    await page.keyboard.press("Escape")
    await away.click()
    await page.waitForTimeout(SETTLE_MS)
    expect(await allFiles()).toBe(before)
    // unchanged:  it just closes, nothing written
    const field = await openField("cheat")
    await away.click()
    await expect.poll(() => field.count()).toBe(0)
    expect(await allFiles()).toBe(before)
    // a new name, and a press away:  renamed
    await openField("cheat")
    await page.keyboard.type("take a peek")
    await away.click()
    await expect.poll(allFiles, { timeout: 10_000 }).toContain('to "take a peek" with shortcut "C", icon "eye"')
    await page.waitForTimeout(SETTLE_MS)
    expect(await page.locator(".InspectorActionNameField").count()).toBe(0)
    await page.evaluate(() => document.querySelector(".keepsFocus")?.remove())
    await page.keyboard.press("ControlOrMeta+z")
    await expect.poll(allFiles, { timeout: 10_000 }).toBe(before)
    await page.waitForTimeout(SETTLE_MS)
  })
})
