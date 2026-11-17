import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { CodeEditor, EDITOR, SERVING } from "./runningEditor"

/**
 * Peek Definition (⌥F12) and Peek References (⇧⌥F12) in the code editor, on Solitaire's Pile.spell
 * (epic `codemirror` I5):  from a declaration's own name, from a use, and from a word nothing declares.
 * - Asked the moment the file shows, before its parse is in:  it waits for the parse, never "No uses found"
 *   of a name used everywhere (Owen's I5 note:  "Coming up empty for me").
 * - Reads only:  nothing is typed, nothing saved.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** Pile.spell's first line, declaring the pile's type:  `a "pile" is a viewable, droppable list of cards`. */
const DECLARATION = 'a "pile" is'
/** A use of the pile's type, in its test:  `set the stock to a new pile with id "stock"`. */
const USE = "set the stock to a new pile"
/** A line whose first word, `set`, is a step's word:  nothing declares it. */
const STEP = "set summary to its id"

describe.skipIf(!SERVING)("Peek Definition and Peek References", { timeout: 180_000 }, () => {
  let browser: Browser
  let page: Page
  let code: CodeEditor
  /** The uses Peek References lists from the declaration's name, for the next test to compare. */
  let declarationUses: string[] = []

  /** Put the caret on `word` in the first line holding `line`, and give the code the keyboard. */
  const caretOn = async (line: string, word: string) => {
    const lineNumber = await code.lineOf(line)
    const text = await code.line(lineNumber)
    await code.setCaret(lineNumber, text.indexOf(word) + 2)
    await code.focus()
  }

  /** The box's head:  the place, then its kind (`17 uses`, `Definition`);  the rows of uses listed. */
  const box = async () => {
    const peek = page.locator(".InputEditor .cm-peek")
    await expect.poll(() => peek.count(), { timeout: 15_000 }).toBe(1)
    return {
      title: await peek.locator(".cm-peek-title").innerText(),
      kind: await peek.locator(".cm-peek-kind").innerText(),
      rows: await peek.locator(".cm-peek-row").allInnerTexts(),
      height: (await peek.boundingBox())!.height
    }
  }

  /** What Find All References lists from the caret:  the service's answer, as its menu shows it. */
  const allReferences = () =>
    page.evaluate(async () => {
      type Shown = { view: { state: { selection: { main: { head: number } } } }; language: unknown }
      const shown = (window as unknown as { editor: { shownCodeEditor: Shown } }).editor.shownCodeEditor
      const language = shown.language as { referencesAt(view: unknown, pos: number): Promise<unknown[]> }
      return (await language.referencesAt(shown.view, shown.view.state.selection.main.head)).length
    })

  beforeAll(async () => {
    browser = await chromium.launch()
    page = await (await browser.newContext({ viewport: { width: 1500, height: 950 } })).newPage()
    code = new CodeEditor(page)
  }, 60_000)

  afterAll(async () => {
    await browser?.close()
  })

  test("Peek References from a declaration's own name, asked as the file shows:  every use, as Find All References", async () => {
    await page.goto(`${EDITOR}edit/@spell/examples/Solitaire/Pile.spell`, { timeout: 60_000 })
    await code.shown()
    // at once:  the project's parse may not be in yet
    await caretOn(DECLARATION, "pile")
    await page.keyboard.press("Shift+Alt+F12")
    const { title, kind, rows } = await box()

    expect(title).toBe("Pile.spell:1")
    // the pile's type is used in every spell file of Solitaire
    expect(rows.length).toBeGreaterThan(5)
    expect(kind).toBe(`${rows.length} uses`)
    expect(rows.some((row) => row.startsWith("Solitaire.spell:"))).toBe(true)
    expect(await allReferences()).toBe(rows.length)
    declarationUses = rows
    await page.keyboard.press("Escape")
  })

  test("Peek Definition from a use:  the declaration's line;  Peek References there lists the same uses", async () => {
    await caretOn(USE, "pile")
    await page.keyboard.press("Alt+F12")
    const definition = await box()
    expect(definition.title).toBe("Pile.spell:1")
    expect(definition.kind).toBe("Definition")
    expect(definition.rows).toEqual([])
    await page.keyboard.press("Escape")

    await caretOn(USE, "pile")
    await page.keyboard.press("Shift+Alt+F12")
    const { rows } = await box()
    expect(rows).toEqual(declarationUses)
    await page.keyboard.press("Escape")
  })

  test("Peek References from a word nothing declares:  a short box saying so", async () => {
    await caretOn(STEP, "set")
    await page.keyboard.press("Shift+Alt+F12")
    const { kind, rows, height } = await box()
    expect(kind).toBe("0 uses")
    expect(rows).toEqual([])
    // its head and one row of message:  the box with uses is 268px
    expect(height).toBeLessThan(80)
    await page.keyboard.press("Escape")
  })
})
