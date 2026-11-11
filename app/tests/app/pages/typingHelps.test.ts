import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"
import { createTestProject, type TestProject } from "./testProject"

/**
 * Typing Spell in the code editor (epic `language` P50, `SpellTyping`):  the caret snaps into the body a blank line is
 * drawn in, a blank line inside a body takes its indent, and `group ` opens a name's quotes, the caret between;
 * and a group's member is drawn past its rail, the caret still beside its letters (`SpellBubbly`).
 * - On a project of its own in your space, made and removed by `createTestProject()`.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** Its one file. */
const FILE = "/Card.spell"
/** A card whose blank lines (4 and 6) are drawn inside bodies:  its symbol's, and its own. */
const CARD = [
  `a "card" is a view`,
  `\tits "symbol" is`,
  `\t\t"♥" if it is a heart`,
  ``,
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
  /** Put the caret on line `line` (1-based), by the arrow keys:  at its start, or past its indent if it snaps. */
  const caretToLine = async (line: number) => {
    await page.locator(".InputEditor .monaco-editor .view-lines").first().click()
    await page.keyboard.press("Meta+ArrowUp")
    await page.keyboard.press("Control+Home")
    for (let at = 1; at < line; at++) await page.keyboard.press("ArrowDown")
  }
  /** Line `line` (1-based) of the file. */
  const lineOf = async (line: number) => (await contents()).split("\n")[line - 1]
  /** Where the caret is. */
  const caret = () =>
    page.evaluate(() => {
      const code = (window as unknown as CodeGlobals).editor.shownCodeEditor
      const { lineNumber, column } = code.getPosition()
      return { line: lineNumber, column }
    })
  const undo = () => page.keyboard.press(process.platform === "darwin" ? "Meta+z" : "Control+z")

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

  test("the caret snaps into the body a blank line is drawn in;  left without typing, the line is blank again", async () => {
    await caretToLine(4)
    expect(await lineOf(4)).toBe(`\t\t`)
    expect(await caret()).toEqual({ line: 4, column: 3 })
    await page.keyboard.press("ArrowDown")
    expect(await lineOf(4)).toBe(``)
    await page.keyboard.press("ArrowUp")
    expect(await lineOf(4)).toBe(`\t\t`)
    await page.keyboard.press("ArrowUp")
    expect(await lineOf(4)).toBe(``)
  })

  test("Backspace takes the caret out a level, and it doesn't snap back in till it leaves the line", async () => {
    await caretToLine(4)
    await page.keyboard.press("Backspace")
    expect(await lineOf(4)).toBe(`\t`)
    expect(await caret()).toEqual({ line: 4, column: 2 })
    await page.keyboard.press("End")
    await page.keyboard.press("ArrowLeft")
    await page.keyboard.press("End")
    expect(await lineOf(4)).toBe(`\t`)
    await page.keyboard.press("ArrowDown")
    expect(await lineOf(4)).toBe(``)
  })

  test("the snap is no undo step of its own:  one undo takes back the letter typed, the indent stays", async () => {
    await caretToLine(4)
    await page.keyboard.type("x")
    expect(await lineOf(4)).toBe(`\t\tx`)
    await undo()
    expect(await lineOf(4)).toBe(`\t\t`)
    await page.keyboard.press("Backspace")
    await page.keyboard.press("Backspace")
    await page.keyboard.press("ArrowDown")
    expect(await lineOf(4)).toBe(``)
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
    /** Where the caret is drawn, across, once it's drawn. */
    const caretX = async () => {
      await page.waitForTimeout(150)
      return page.evaluate(() =>
        document.querySelector(".InputEditor .cursors-layer .cursor")!.getBoundingClientRect().x
      )
    }
    for (const x of [at.wordsX + 1, at.wordsX - 4, at.wordsX - 14]) {
      await page.mouse.click(x, at.y)
      const isBeforeTab = x < at.wordsX - 10
      expect(await caret()).toEqual({ line: at.line, column: isBeforeTab ? 1 : 2 })
      if (!isBeforeTab) expect(Math.abs((await caretX()) - at.wordsX)).toBeLessThan(2)
    }
    await page.keyboard.press("End")
    await page.keyboard.press("Home")
    expect(await caret()).toEqual({ line: at.line, column: 2 })
    expect(Math.abs((await caretX()) - at.wordsX)).toBeLessThan(2)
    await page.keyboard.press("Shift+End")
    const selected = await page.evaluate(() =>
      document.querySelector(".InputEditor .selected-text")!.getBoundingClientRect().x
    )
    expect(Math.abs(selected - at.wordsX)).toBeLessThan(2)
  })

  test("a letter on the blank line inside the card's body takes its indent;  `group ` opens quotes", async () => {
    await caretToLine(6)
    await page.keyboard.type("group ")
    expect(await lineOf(6)).toBe(`\tgroup ""`)
    await page.keyboard.type('Suit"')
    expect(await lineOf(6)).toBe(`\tgroup "Suit"`)
  })

  test("one undo takes back the quotes, leaving the word and its space", async () => {
    await page.keyboard.press("End")
    await page.keyboard.press("Enter")
    await page.keyboard.type("its ")
    expect(await lineOf(7)).toBe(`\tits ""`)
    await undo()
    expect(await lineOf(7)).toBe(`\tits `)
  })

  test("Enter keeps a body's indent", async () => {
    await page.keyboard.press("End")
    for (const _ of "its ") await page.keyboard.press("Backspace")
    await page.keyboard.type("x")
    await page.keyboard.press("Enter")
    await page.keyboard.type("y")
    const lines = (await contents()).split("\n")
    expect(lines.slice(6, 8)).toEqual([`\tx`, `\ty`])
  })
  test('typed quickly on a new line, a `"` after the name steps over the closing one', async () => {
    await page.keyboard.press("End")
    await page.keyboard.press("Enter")
    await page.keyboard.type('its rank"')
    expect(await lineOf(9)).toBe(`\tits "rank"`)
  })
})
