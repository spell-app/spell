import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"
import { createTestProject, type TestProject } from "./testProject"

/**
 * Typing Spell in the code editor (epic `language` P50, `SpellTyping`):  a blank line inside a body takes its indent,
 * and `group ` opens a name's quotes, the caret between.
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
