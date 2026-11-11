import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"
import { createTestProject, type TestProject } from "./testProject"

/**
 * Typing Spell in the code editor (epic `language` P50, `SpellTyping`):  a blank line inside a body takes its indent,
 * and `group ` opens a name's quotes, the caret between;
 * and a group's member is drawn past its rail, the caret still beside its letters (`SpellBubbly`).
 * - On a project of its own in your space, made and removed by `createTestProject()`.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** Its one file. */
const FILE = "/Card.spell"
/** A card whose blank line (line 5) is drawn inside its body. */
const CARD = [
  `a "card" is a view`,
  `\tits "symbol" is`,
  `\t\t"♥" if it is a heart`,
  `\t\t"♠" otherwise`,
  ``,
  `\tgroup "Names"`,
  `\tits "name" is its symbol`,
  ``
].join("\n")

/** What's used of the page's debug globals:  the code editor showing. */
type CodeGlobals = {
  editor: {
    shownCodeEditor: {
      getPosition(): { lineNumber: number; column: number }
      getModel(): { getLinesContent(): string[] }
      getDomNode(): HTMLElement
      getScrolledVisiblePosition(position: { lineNumber: number; column: number }): { top: number; left: number }
    }
  }
}

describe.skipIf(!SERVING)("typing Spell in the code editor", { timeout: 180_000 }, () => {
  let browser: Browser
  let page: Page
  /** The project this test makes, in your space. */
  let project: TestProject

  /** The file's text in the editor, once its edits are in. */
  const contents = async () => {
    await page.waitForTimeout(400)
    return page.evaluate(() => (window as unknown as { editor: { file: { contents: string } } }).editor.file.contents)
  }
  /** Put the caret at the start of line `line` (1-based). */
  const caretToLine = async (line: number) => {
    await page.locator(".InputEditor .monaco-editor .view-lines").first().click()
    await page.keyboard.press("Meta+ArrowUp")
    await page.keyboard.press("Control+Home")
    for (let at = 1; at < line; at++) await page.keyboard.press("ArrowDown")
    await page.keyboard.press("Home")
  }
  const undo = () => page.keyboard.press(process.platform === "darwin" ? "Meta+z" : "Control+z")
  /** Where the caret is. */
  const caret = () =>
    page.evaluate(() => {
      const { lineNumber, column } = (window as unknown as CodeGlobals).editor.shownCodeEditor.getPosition()
      return { line: lineNumber, column }
    })
  /**
   * Where the caret is drawn, across, every time it moves while `action` runs, and where it ends:
   * so a test sees a caret drawn in one place and then jumping to another.
   */
  const caretDrawn = async (action: () => Promise<void>) => {
    // every frame, where the caret is drawn, when that's not where it was
    await page.evaluate(() => {
      const record = window as unknown as { caretXs: number[]; caretX?: number; isRecording?: boolean }
      const caretX = () => document.querySelector(".InputEditor .cursors-layer .cursor")?.getBoundingClientRect().x
      record.caretXs = []
      record.caretX = caretX()
      if (record.isRecording) return
      record.isRecording = true
      const tick = () => {
        const x = caretX()
        if (x !== undefined && x !== record.caretX) record.caretXs.push((record.caretX = x))
        requestAnimationFrame(tick)
      }
      tick()
    })
    await action()
    await page.waitForTimeout(400)
    const moves = await page.evaluate(() => (window as unknown as { caretXs: number[] }).caretXs)
    await page.waitForSelector(".InputEditor .cursors-layer .cursor")
    const final = await page.evaluate(
      () => document.querySelector(".InputEditor .cursors-layer .cursor")!.getBoundingClientRect().x
    )
    return { moves, final }
  }

  beforeAll(async () => {
    browser = await chromium.launch()
    page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage()
    project = await createTestProject(EDITOR!, { name: "typing", filePath: FILE, contents: CARD })
    await page.goto(`${EDITOR}edit/${project.projectId}`, { timeout: 60_000 })
    await page.waitForSelector(".InputEditor .monaco-editor .view-line", { timeout: 60_000 })
    await page.waitForTimeout(1500)
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
    await project?.remove()
  })

  test("a group's member is drawn past its rail, its words pushed with it, the caret beside its letters", async () => {
    expect(await page.locator(".InputEditor .bubbly-room-push").count()).toBeGreaterThan(0)
    const at = await page.evaluate(() => {
      const code = (window as unknown as CodeGlobals).editor.shownCodeEditor
      const line = code.getModel().getLinesContent().indexOf(`\tits "name" is its symbol`) + 1
      const box = code.getDomNode().getBoundingClientRect()
      const top = box.y + code.getScrolledVisiblePosition({ lineNumber: line, column: 2 }).top
      const its = [...document.querySelectorAll(".InputEditor .view-line span.bubbly-piece")].find(
        (span) => span.textContent?.startsWith("its") && Math.abs(span.getBoundingClientRect().top - top) < 8
      )!
      const words = its.getBoundingClientRect()
      return { line, wordsX: words.x, y: words.y + words.height / 2 }
    })
    /** Do `action`:  the caret drawn once, `at` its letter (or `between` two places), never somewhere first. */
    const drawsOnce = async (action: () => Promise<void>, column: number, between = [at.wordsX, at.wordsX]) => {
      const { moves, final } = await caretDrawn(action)
      expect(moves.length).toBeLessThanOrEqual(1)
      expect(await caret()).toEqual({ line: at.line, column })
      expect(final).toBeGreaterThan(between[0]! - 2)
      expect(final).toBeLessThan(between[1]! + 2)
    }
    /** Somewhere else on the line, so a click there moves the caret. */
    const away = () => page.mouse.click(at.wordsX + 200, at.y)
    // on its first letter, and just left of it, in the room:  the caret by the letter
    for (const x of [at.wordsX + 1, at.wordsX - 4]) {
      await away()
      await drawsOnce(() => page.mouse.click(x, at.y), 2)
    }
    await page.keyboard.press("End")
    await drawsOnce(() => page.keyboard.press("Home"), 2)
    await drawsOnce(() => page.keyboard.press("ArrowRight"), 3, [at.wordsX + 2, at.wordsX + 12])
    await drawsOnce(() => page.keyboard.press("ArrowLeft"), 2)
    await page.keyboard.press("ArrowUp")
    await drawsOnce(() => page.keyboard.press("ArrowDown"), 2)
    await page.keyboard.press("Shift+End")
    await page.waitForSelector(".InputEditor .selected-text")
    const selected = await page.evaluate(
      () => document.querySelector(".InputEditor .selected-text")!.getBoundingClientRect().x
    )
    expect(Math.abs(selected - at.wordsX)).toBeLessThan(2)
    await drawsOnce(() => page.keyboard.press("Home"), 2)
    // a letter typed before the first:  drawn at once right after it, by the room;
    // `xits` is no member, so once it's laid out again the room goes, and the line with it
    const typed = await caretDrawn(() => page.keyboard.type("x"))
    expect(typed.moves[0]).toBeGreaterThan(at.wordsX + 2)
    expect(typed.moves[0]).toBeLessThan(at.wordsX + 12)
    const undone = await caretDrawn(undo)
    expect(Math.abs(undone.final - at.wordsX)).toBeLessThan(2)
    expect(await caret()).toEqual({ line: at.line, column: 2 })
  })

  test("a letter on the blank line inside the card's body takes its indent;  `group ` opens quotes", async () => {
    await caretToLine(5)
    await page.keyboard.type("group ")
    expect((await contents()).split("\n")[4]).toBe(`\tgroup ""`)
    await page.keyboard.type('Suit"')
    expect((await contents()).split("\n")[4]).toBe(`\tgroup "Suit"`)
  })

  test("one undo takes back the quotes, leaving the word and its space", async () => {
    await page.keyboard.press("End")
    await page.keyboard.press("Enter")
    await page.keyboard.type("its ")
    expect((await contents()).split("\n")[5]).toBe(`\tits ""`)
    await undo()
    expect((await contents()).split("\n")[5]).toBe(`\tits `)
  })

  test("Enter keeps a body's indent", async () => {
    await page.keyboard.press("End")
    for (const _ of "its ") await page.keyboard.press("Backspace")
    await page.keyboard.type("x")
    await page.keyboard.press("Enter")
    await page.keyboard.type("y")
    const lines = (await contents()).split("\n")
    expect(lines.slice(5, 7)).toEqual([`\tx`, `\ty`])
  })
  test('typed quickly on a new line, a `"` after the name steps over the closing one', async () => {
    await page.keyboard.press("End")
    await page.keyboard.press("Enter")
    await page.keyboard.type('its rank"')
    expect((await contents()).split("\n")[7]).toBe(`\tits "rank"`)
  })
})
