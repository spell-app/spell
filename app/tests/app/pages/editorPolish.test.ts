import { chromium, type BrowserContext, type Page } from "playwright"
import { afterAll, afterEach, beforeEach, describe, expect, test } from "vite-plus/test"

import { builtInProjectsNow, EDITOR, SERVING } from "./runningEditor"

/**
 * The code pane's rough edges, smoothed (epic `editor` P28, Editor Polish), in the running editor:
 * - I50:  the selection's ants never draw over the loading screen
 * - I51, I52:  the outline follows the code's cursor, by click or arrow keys;  a line in a tag selects what the tag
 *   draws, inside a drawn thing's own drawing too;  a line that draws nothing selects nothing
 * - I69:  the arrow keys' follow waits for the cursor to rest, one follow for a run of presses
 * - I53, I59:  a paste takes the indent where it lands, markup as a tree;  Shift+Tab takes a tag's children along
 * - I54, I55:  the suggestions show by themselves where they help, each row saying what it is
 * - NOTHING reaches the disk:  every save is answered here, and a later read of the file gets what was saved.
 * - Needs this checkout's editor running:  `spell server start all`.  Skips itself when it isn't, as in CI.
 * - Headless Playwright, never a real browser window.
 */

/** A browser context whose saves go nowhere near the disk:  a read of a saved file gets the saved text. */
async function contextWithNoSaving(context: BrowserContext): Promise<void> {
  const saved = new Map<string, string>()
  await context.route(/\/api\/projects\/file\//, (route) => {
    const request = route.request()
    const url = request.url().split("?")[0]!
    if (request.method() !== "GET") {
      saved.set(url, request.postData() ?? "")
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
    }
    const text = saved.get(url)
    return text === undefined ? route.continue() : route.fulfill({ status: 200, contentType: "text/plain", body: text })
  })
  await context.route(/\.spell(\?.*)?$/, (route) =>
    route.request().method() === "GET" ? route.continue() : route.fulfill({ status: 200, body: "{}" })
  )
}

/** Open example `project`, showing its file `file`. */
async function open(page: Page, project: string, file: string): Promise<void> {
  await page.goto(`${EDITOR}edit/@spell/examples/${project}`, { timeout: 60_000 })
  await page.waitForSelector(".InputEditor .monaco-editor .view-line", { timeout: 60_000 })
  await page.waitForTimeout(4000)
  await page.evaluate(`(() => {
    const { editor } = window
    editor.showEditor(editor.project.spellFiles.find((each) => each.path.endsWith("/${file}")).path)
  })()`)
  await page.waitForTimeout(2000)
}

/** The number, from 1, of the first line of the code showing that holds `words`. */
function lineOf(page: Page, words: string): Promise<number> {
  return page.evaluate(
    `window.editor.shownCodeEditor.getModel().getLinesContent().findIndex((line) => line.includes(${JSON.stringify(words)})) + 1`
  )
}

/** Click line `lineNumber`, from 1, at its first word (or at `column`), with a real mouse. */
async function clickLine(page: Page, lineNumber: number, column = 0): Promise<void> {
  const at = (await page.evaluate(`(() => {
    const code = window.editor.shownCodeEditor
    code.revealLineInCenter(${lineNumber})
    const text = code.getModel().getLineContent(${lineNumber})
    const place = code.getScrolledVisiblePosition({ lineNumber: ${lineNumber}, column: ${column} || text.search(/\\S/) + 2 })
    const box = code.getDomNode().getBoundingClientRect()
    return { x: box.x + place.left + 2, y: box.y + place.top + 8 }
  })()`)) as { x: number; y: number }
  await page.waitForTimeout(300)
  await page.mouse.click(at.x, at.y)
  await page.waitForTimeout(800)
}

/** What's selected:  each element's tag. */
function selected(page: Page): Promise<string[]> {
  return page.evaluate(`window.Inspector.allSelected.map(({ element }) => element.localName)`)
}

/** Lines `lineNumber` (from 1) on, `count` of them, of the code showing. */
function linesFrom(page: Page, lineNumber: number, count: number): Promise<string[]> {
  return page.evaluate(
    `Array.from({ length: ${count} }, (_, at) => window.editor.shownCodeEditor.getModel().getLineContent(${lineNumber} + at))`
  )
}

/** The suggestion list:  is it showing, and its rows' text. */
function suggestions(page: Page): Promise<{ isShowing: boolean; rows: string[] }> {
  return page.evaluate(`(() => {
    const box = document.querySelector(".InputEditor .suggest-widget")
    const isShowing = !!box && box.classList.contains("visible")
    const rows = [...(box?.querySelectorAll(".monaco-list-row") ?? [])].map((row) => row.textContent.replace(/\\s+/g, " ").trim())
    return { isShowing, rows }
  })()`)
}

/** Type `text`, a key at a time, on a new line after line `lineNumber`. */
async function typeAfter(page: Page, lineNumber: number, text: string): Promise<void> {
  await page.evaluate(`(() => {
    const code = window.editor.shownCodeEditor
    code.setPosition({ lineNumber: ${lineNumber}, column: code.getModel().getLineMaxColumn(${lineNumber}) })
    code.focus()
  })()`)
  await page.keyboard.press("Enter")
  await page.keyboard.type(text, { delay: 60 })
  await page.waitForTimeout(1200)
}

/** Paste `text` at the caret, as Cmd+V's paste event would bring it. */
function paste(page: Page, text: string): Promise<void> {
  return page.evaluate(`(() => {
    const data = new DataTransfer()
    data.setData("text/plain", ${JSON.stringify(text)})
    const area = window.editor.shownCodeEditor.getDomNode().querySelector("textarea")
    area.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }))
  })()`)
}

describe.skipIf(!SERVING)("editor polish (epic `editor` P28)", () => {
  let context: BrowserContext
  const browser = chromium.launch()

  beforeEach(async () => {
    context = await (await browser).newContext({ viewport: { width: 1440, height: 860 }, colorScheme: "dark" })
    await contextWithNoSaving(context)
  })
  afterEach(() => context.close())
  afterAll(async () => (await browser).close())

  // the built-in examples stay as they are
  let builtInProjectsBefore: string
  beforeEach(() => {
    builtInProjectsBefore = builtInProjectsNow()
  })
  afterEach(() => {
    expect(builtInProjectsNow()).toBe(builtInProjectsBefore)
  })

  test("I50:  a part selected while the loading screen is up draws no ants over it", { timeout: 150_000 }, async () => {
    const page = await context.newPage()
    // every frame:  select the New game button as soon as it's drawn, and count frames with ants over the hero
    await page.addInitScript(`
      window.__antsOverHero = 0
      const look = () => {
        const hero = document.getElementById("PageLoading")
        const ants = [...document.querySelectorAll(".InspectorSelected")].filter((box) => box.getBoundingClientRect().width > 0)
        if (hero && !hero.classList.contains("done") && ants.length) window.__antsOverHero++
        const button = [...document.querySelectorAll(".AppPaneBody ui-button")].find((it) => it.textContent.includes("New game"))
        if (hero && button && window.Inspector && !window.__selectedEarly) {
          window.__selectedEarly = true
          window.Inspector.select(button)
        }
        if (hero) requestAnimationFrame(look)
      }
      requestAnimationFrame(look)
    `)
    await page.goto(`${EDITOR}edit/@spell/examples/tic-tac-toe`, { timeout: 60_000 })
    await page.waitForSelector(".InputEditor .monaco-editor .view-line", { timeout: 60_000 })
    await page.waitForTimeout(2000)
    expect(await page.evaluate(`!!window.__selectedEarly`), "selected while the hero was up").toBe(true)
    expect(await page.evaluate(`window.__antsOverHero`)).toBe(0)
  })

  test(
    "I51, I52:  the outline follows the cursor;  a line in a tag selects what it draws",
    { timeout: 150_000 },
    async () => {
      const page = await context.newPage()
      await open(page, "tic-tac-toe", "TicTacToe.spell")
      await clickLine(page, await lineOf(page, "New game"))
      expect(await selected(page)).toEqual(["ui-button"])
      // the arrow keys too:  up onto `<content>`, then onto the first content's closing tag
      await page.keyboard.press("ArrowUp")
      await page.waitForTimeout(800)
      expect(await selected(page)).toEqual(["ui-content"])
      await page.keyboard.press("ArrowUp")
      await page.waitForTimeout(800)
      expect(await selected(page)).toEqual(["ui-content"])
      // a line that draws nothing:  nothing's selected
      await clickLine(page, await lineOf(page, "// The message, the board"))
      expect(await selected(page)).toEqual([])
      // a line inside the square's button, in each square's own drawing:  the nine buttons
      await clickLine(page, await lineOf(page, "{the label of the square}"))
      expect(await selected(page)).toEqual(Array(9).fill("ui-button"))
    }
  )

  test(
    "I69:  a run of arrow presses is one follow, on the line the cursor rests on",
    { timeout: 150_000 },
    async () => {
      const page = await context.newPage()
      await open(page, "Solitaire", "Solitaire.spell")
      await clickLine(page, await lineOf(page, `"stock" is a new stock pile`))
      expect(await selected(page)).toEqual(["solitaire-stock-pile"])
      // the stock, the discards, then four foundations:  as quick as a held key
      for (let press = 0; press < 5; press++) {
        await page.keyboard.press("ArrowDown")
        await page.waitForTimeout(30)
      }
      // the cursor's already there;  the selection waits for it to rest
      expect(await selected(page)).toEqual(["solitaire-stock-pile"])
      await page.waitForTimeout(800)
      expect(await page.evaluate(`window.editor.followed.line + 1`)).toBe(await lineOf(page, `"spades" is a new`))
      expect(await selected(page)).toEqual(["solitaire-foundation"])
    }
  )

  test(
    "I52:  in Solitaire, a foundation's placeholder line selects the four placeholders",
    { timeout: 150_000 },
    async () => {
      const page = await context.newPage()
      await open(page, "Solitaire", "Solitaire.spell")
      await clickLine(page, await lineOf(page, "{the picture of a new card whose rank is ace"), 10)
      expect(await selected(page)).toEqual(Array(4).fill("ui-text"))
    }
  )

  test(
    "I53, I59:  a paste takes its indent;  Shift+Tab takes a tag's children along",
    { timeout: 150_000 },
    async () => {
      const page = await context.newPage()
      await open(page, "tic-tac-toe", "TicTacToe.spell")
      const content = await lineOf(page, "<content>")
      const [contentLine] = await linesFrom(page, content, 1)
      await typeAfter(page, content, "")
      await paste(page, "<content>\n<button fluid>\n{its label}\n</button>\n</content>")
      const indent = /^\t*/.exec(contentLine!)![0]
      // Enter after `<content>` goes in a level (I65), so the paste starts there, a level under it
      expect(await linesFrom(page, content + 1, 5)).toEqual([
        `${indent}\t<content>`,
        `${indent}\t\t<button fluid>`,
        `${indent}\t\t\t{its label}`,
        `${indent}\t\t</button>`,
        `${indent}\t</content>`
      ])
      // one undo takes the paste back, the new line still there
      await page.keyboard.press("Meta+z")
      expect((await linesFrom(page, content + 1, 1))[0]!.trim()).toBe("")
      await page.keyboard.press("Meta+z")

      const before = await linesFrom(page, content, 4)
      await page.evaluate(
        `window.editor.shownCodeEditor.setPosition({ lineNumber: ${content}, column: ${indent.length + 1} })`
      )
      await page.keyboard.press("Shift+Tab")
      await page.waitForTimeout(300)
      expect(await linesFrom(page, content, 4)).toEqual(before.map((line) => line.slice(1)))
      await page.keyboard.press("Meta+z")
      expect(await linesFrom(page, content, 4)).toEqual(before)
    }
  )

  test(
    "I54, I55:  the suggestions show by themselves where they help, each saying what it is",
    { timeout: 150_000 },
    async () => {
      const page = await context.newPage()
      await open(page, "tic-tac-toe", "TicTacToe.spell")
      const newGame = await lineOf(page, "New game")
      await typeAfter(page, newGame, "<act")
      const tags = await suggestions(page)
      expect(tags.isShowing).toBe(true)
      expect(tags.rows[0]).toMatch(/^action/)
      await page.keyboard.press("Escape")

      await typeAfter(page, newGame, "<button col")
      const attributes = await suggestions(page)
      expect(attributes.rows[0]).toMatch(/^color\s+\S/)
      await page.keyboard.press("Escape")

      await typeAfter(page, await lineOf(page, 'set its turn to "X"'), "set its tu")
      expect((await suggestions(page)).rows[0]).toMatch(/^turn\s+Whose turn it is/)
      await page.keyboard.press("Escape")

      await typeAfter(page, await lineOf(page, 'set its turn to "X"'), "set x to 3")
      expect((await suggestions(page)).isShowing).toBe(false)
    }
  )
})
