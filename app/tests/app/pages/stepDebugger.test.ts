import type { EditorView } from "@codemirror/view"
import { chromium, type Browser, type BrowserContext, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { CodeEditor, EDITOR, SERVING } from "./runningEditor"

/**
 * The step debugger (epic `editor` P33), on Solitaire in the running editor:
 * a breakpoint in the code's margin, a click on the stock's card stops the game there, and it's stepped through.
 * - Every click is a real mouse's.
 * - NOTHING reaches the disk:  every save is answered here, so the built-in examples can't change.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** `SHOTS=<folder>` keeps a picture of the stopped game. */
const SHOTS = process.env.SHOTS

/** What a compile and redraw takes, at most. */
const SETTLE_MS = 4000

/** The page's debug globals, what's used of them. */
type DebugGlobals = {
  editor: {
    file?: { path: string }
    project: { spellFiles: { path: string }[] }
    showEditor(path: string): void
  }
  debugging: {
    isOn: boolean
    stopped?: { path: string; line: number; frame: { declaredAt: number; stack: unknown[]; values: object } }
    stop(): void
  }
}

describe.skipIf(!SERVING)("the step debugger", { timeout: 240_000 }, () => {
  let browser: Browser
  let context: BrowserContext
  let page: Page
  const errors: string[] = []
  const consoleLines: string[] = []

  /** Where the game's stopped:  its file's name, its line from 0, the line it's declared on, how deep. */
  const stoppedAt = () =>
    page.evaluate(() => {
      const { stopped } = (window as unknown as DebugGlobals).debugging
      return (
        stopped && {
          file: stopped.path.split("/").at(-1)!,
          line: stopped.line,
          declaredAt: stopped.frame.declaredAt,
          depth: stopped.frame.stack.length
        }
      )
    })

  /** The lines lit as stopped in the code pane, from 0. */
  const litLines = () =>
    page.evaluate(() => {
      const lines = [...document.querySelectorAll(".InputEditor .cm-line")]
      return lines.flatMap((line, index) => (line.classList.contains("cm-debugStopped") ? [index] : []))
    })

  /** The line lit as stopped in the code pane, from 0;  `-1`:  none drawn. */
  const litLine = () =>
    page.evaluate(() => {
      const { view } = (window as unknown as { editor: { shownCodeEditor: { view: EditorView } } }).editor
        .shownCodeEditor
      const lit = view.dom.querySelector(".cm-debugStopped")
      return lit ? view.state.doc.lineAt(view.posAtDOM(lit)).number - 1 : -1
    })

  /** Wait until the game's stopped somewhere new. */
  const waitForStop = async (previous?: { line: number; file: string }) => {
    await page.waitForFunction(
      (before) => {
        const { stopped } = (window as unknown as DebugGlobals).debugging
        if (!stopped) return false
        return !before || stopped.line !== before.line || !stopped.path.endsWith(`/${before.file}`)
      },
      previous,
      { timeout: 10_000 }
    )
    await page.waitForTimeout(500)
  }

  /** Show the file named `name` in the code pane. */
  const showFile = async (name: string) => {
    await page.evaluate((file) => {
      const { editor } = window as unknown as DebugGlobals
      editor.showEditor(editor.project.spellFiles.find((each) => each.path.endsWith(`/${file}`))!.path)
    }, name)
    await page.waitForTimeout(1000)
  }

  /** Click the code's left margin beside line `lineNumber`, from 1, as a person puts a breakpoint there. */
  const clickMargin = async (lineNumber: number) => {
    const at = await page.evaluate(async (number) => {
      const { view } = (window as unknown as { editor: { shownCodeEditor: { view: EditorView } } }).editor
        .shownCodeEditor
      const line = view.state.doc.line(number)
      const scrollTo = (view.constructor as typeof EditorView).scrollIntoView
      view.dispatch({ effects: scrollTo(line.from, { y: "center" }) })
      // CodeMirror scrolls when it next measures, in a frame
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      const box = view.coordsAtPos(line.from)!
      const gutter = view.dom.querySelector(".cm-breakpointGutter")!.getBoundingClientRect()
      return { x: gutter.left + gutter.width / 2, y: (box.top + box.bottom) / 2 }
    }, lineNumber)
    await page.mouse.click(at.x, at.y)
    await page.waitForTimeout(300)
  }

  beforeAll(async () => {
    browser = await chromium.launch()
    context = await browser.newContext({ viewport: { width: 1920, height: 1000 } })
    await context.route(/\/api\/projects\/file\/|\.(spell)(\?.*)?$/, (route) =>
      route.request().method() === "GET"
        ? route.continue()
        : route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
    )
    page = await context.newPage()
    page.on("pageerror", (error) => errors.push(error.message))
    // Solid's warnings and the page's errors:  the editor's console stays clean (epic `editor` I98)
    page.on("console", (message) => {
      if (message.type() === "warning" || message.type() === "error") consoleLines.push(message.text())
    })
    await page.goto(`${EDITOR}edit/@spell/examples/Solitaire`, { timeout: 60_000 })
    await new CodeEditor(page).shown()
    await page.waitForSelector(".AppPaneBody solitaire-card", { timeout: 60_000 })
    // the deal's done:  the stock's cards are still
    await page.waitForTimeout(SETTLE_MS)
  }, 120_000)

  afterAll(async () => {
    await page?.evaluate(() => (window as unknown as DebugGlobals).debugging.stop()).catch(() => undefined)
    await browser?.close()
  })

  test("a breakpoint in the margin starts debugging:  a dot shows, and the game plays on until it gets there", async () => {
    await showFile("Solitaire.spell")
    const code = new CodeEditor(page)
    const clickLine = await code.lineOf("if it is face up or its pile is solitaire's stock")
    expect(clickLine).toBeGreaterThan(0)
    await clickMargin(clickLine)
    expect(await page.locator(".InputEditor .cm-breakpoint").count()).toBe(1)
    await page.waitForFunction(() => (window as unknown as DebugGlobals).debugging.isOn)
    await page.waitForTimeout(SETTLE_MS)
    expect(await page.locator(".Debugger").count()).toBe(1)
    expect(await stoppedAt()).toBeUndefined()
    // the game in progress is still there:  its cards drawn
    expect(await page.locator(".AppPaneBody solitaire-card").count()).toBe(52)
  })

  test("a click on the stock's card stops the game on that line, lit, with the card beside the code", async () => {
    const stockCards = await page.locator(".AppPaneBody solitaire-stock-pile solitaire-card").count()
    expect(stockCards).toBeGreaterThan(0)
    await page.locator(".AppPaneBody solitaire-stock-pile solitaire-card").last().click({ force: true })
    await waitForStop()
    const at = await stoppedAt()
    const code = new CodeEditor(page)
    expect(at?.file).toBe("Solitaire.spell")
    expect(at?.line).toBe((await code.lineOf("if it is face up or its pile is solitaire's stock")) - 1)
    expect(await litLines()).toHaveLength(1)
    // what it's working on:  the card, with its properties
    const values = await page.locator(".DebuggerValues").innerText()
    expect(values).toMatch(/rank/)
    // held:  the stock still has the card
    expect(await page.locator(".AppPaneBody solitaire-stock-pile solitaire-card").count()).toBe(stockCards)
  })

  test("while it's stopped, the editor answers:  another file opens, and comes back to the stopped line", async () => {
    await showFile("Card.spell")
    expect(
      await page.evaluate(() => (window as unknown as DebugGlobals).editor.file?.path.endsWith("/Card.spell"))
    ).toBe(true)
    await showFile("Solitaire.spell")
    // as it was left, scrolled where it was:  the stopped line still lit, once it's in view
    const { line } = (await stoppedAt())!
    await page.evaluate(async (number) => {
      const { view } = (window as unknown as { editor: { shownCodeEditor: { view: EditorView } } }).editor
        .shownCodeEditor
      const scrollTo = (view.constructor as typeof EditorView).scrollIntoView
      view.dispatch({ effects: scrollTo(view.state.doc.line(number + 1).from, { y: "center" }) })
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    }, line)
    expect(await litLines()).toHaveLength(1)
  })

  test("Step Into goes into the actions the line calls;  Step Over goes a line at a time, its values set", async () => {
    const before = await stoppedAt()
    await page.keyboard.press("F11")
    await waitForStop(before)
    const play = await stoppedAt()
    // into `play a card`:  deeper, its first line
    expect(play!.depth).toBe(before!.depth + 1)
    expect(await new CodeEditor(page).line(play!.declaredAt + 1)).toMatch(/play a card/)

    await page.keyboard.press("F11")
    await waitForStop(play)
    const turn = await stoppedAt()
    expect(turn!.depth).toBe(play!.depth + 1)
    expect(await new CodeEditor(page).line(turn!.declaredAt + 1)).toMatch(/turn over the next card/)
    // the actions that called it, this one first
    expect(await page.locator(".DebuggerStack li").count()).toBe(turn!.depth)

    // a line at a time, past the stock's being empty
    const code = new CodeEditor(page)
    const setLine = (await code.lineOf("set the next card to the top card of the stock")) - 1
    while ((await stoppedAt())!.line < setLine) {
      const at = await stoppedAt()
      await page.keyboard.press("F10")
      await waitForStop(at)
    }
    expect((await stoppedAt())!.line).toBe(setLine)
    await page.keyboard.press("F10")
    await waitForStop({ file: "Solitaire.spell", line: setLine })
    expect(await page.locator(".DebuggerValues").innerText()).toMatch(/next card/)
    // the lit line follows each step, and so does the stack's first row
    expect(await litLine()).toBe(setLine + 1)
    expect(await page.locator(".DebuggerStack li").first().innerText()).toContain(`:${setLine + 2}`)
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/step-debugger-stopped.png` })
  })

  test("Step Out runs the rest, and with nothing left to come back to, the move plays on", async () => {
    const stockCards = await page.locator(".AppPaneBody solitaire-stock-pile solitaire-card").count()
    await page.keyboard.press("Shift+F11")
    await page.waitForFunction(() => !(window as unknown as DebugGlobals).debugging.stopped, undefined, {
      timeout: 10_000
    })
    await page.waitForTimeout(1500)
    // the move happened:  the stock's next card turned over, onto the discard pile
    expect(await page.locator(".AppPaneBody solitaire-stock-pile solitaire-card").count()).toBe(stockCards - 1)
    expect(await litLines()).toHaveLength(0)
  })

  test("Continue runs on to the breakpoint again", async () => {
    await page.locator(".AppPaneBody solitaire-stock-pile solitaire-card").last().click({ force: true })
    await waitForStop()
    await page.locator(".Debugger ui-button[icon='play']").click()
    await page.waitForFunction(() => !(window as unknown as DebugGlobals).debugging.stopped, undefined, {
      timeout: 10_000
    })
    await page.waitForTimeout(1500)
  })

  test("Stop Debugging runs the shipped build again, the game still in progress", async () => {
    const discards = await page.locator(".AppPaneBody solitaire-discard-pile solitaire-card").count()
    await page.locator(".Debugger ui-button[icon='stop']").click()
    await page.waitForTimeout(SETTLE_MS)
    expect(await page.evaluate(() => (window as unknown as DebugGlobals).debugging.isOn)).toBe(false)
    expect(await page.locator(".Debugger").count()).toBe(0)
    expect(await page.locator(".AppPaneBody solitaire-discard-pile solitaire-card").count()).toBe(discards)
    expect(errors).toEqual([])
    expect(consoleLines.filter((line) => /solid|reactiv|debug/i.test(line))).toEqual([])
  })
})
