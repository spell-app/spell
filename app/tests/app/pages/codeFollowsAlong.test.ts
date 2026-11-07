import { execSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { chromium, type BrowserContext, type Page } from "playwright"
import { afterAll, afterEach, beforeEach, describe, expect, test } from "vite-plus/test"

/**
 * Click a line of the code, a line of compiled code, a row of the tree or a thing on the screen, and the others follow
 * (epic `editor`, Code Follows Along), in the running editor.
 * - Every click is a real mouse's.
 * - NOTHING reaches the disk:  every save is answered here, so the built-in examples can't change.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - `SHOTS=<folder>` keeps pictures of it, in Glass and Fruity, light and dark.
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
const SHOTS = process.env.SHOTS

/** A browser context whose saves go nowhere near the disk. */
async function contextWithNoSaving(context: BrowserContext): Promise<void> {
  await context.route(/\/api\/projects\/file\/|\.(spellml|spell)(\?.*)?$/, (route) =>
    route.request().method() === "GET"
      ? route.continue()
      : route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  )
}

/** Open `project`, code showing, with the Inspector open. */
async function open(page: Page, project: string): Promise<void> {
  await page.goto(`${EDITOR}edit/@spell/examples/${project}`, { timeout: 60_000 })
  await page.waitForSelector(".InputEditor .monaco-editor .view-line", { timeout: 60_000 })
  await page.waitForTimeout(4000)
  await page.locator(".InspectorToggle ui-icon").first().click({ force: true })
  await page.waitForTimeout(1000)
}

/** Open the code pane's ⋯, and choose the row `words`. */
async function chooseOutput(page: Page, words: string): Promise<void> {
  await page.locator(".CodeMoreMenu").click()
  await page.waitForTimeout(300)
  await page.locator(".CodeMoreMenu").getByRole("option", { name: words }).click()
  await page.waitForTimeout(1500)
}

/** The page's debug globals, what's used of them. */
type DebugGlobals = {
  editor: {
    shownCodeEditor?: CodeEditorLike
    followed?: { path: string; line: number; from: string }
    file?: { file: string }
    project: { spellFiles: { path: string }[] }
    showEditor(path: string): void
  }
  Inspector: { allSelected: { element: Element }[] }
}

/** What's used of a code editor. */
type CodeEditorLike = {
  hasTextFocus(): boolean
  getScrollTop(): number
  revealLine(line: number): void
  getScrolledVisiblePosition(position: { lineNumber: number; column: number }): { top: number; left: number } | null
  getDomNode(): HTMLElement
}

/** Show the file named `name`. */
function showFile(page: Page, name: string) {
  return page.evaluate((file) => {
    const { editor } = window as unknown as DebugGlobals
    editor.showEditor(editor.project.spellFiles.find((each) => each.path.endsWith(`/${file}`))!.path)
  }, name)
}

/** Click line `line`, from 0, of the code editor showing, with a real mouse. */
async function clickCodeLine(page: Page, line: number): Promise<void> {
  const at = await page.evaluate((number) => {
    const code = (window as unknown as DebugGlobals).editor.shownCodeEditor!
    code.revealLine(number + 1)
    const place = code.getScrolledVisiblePosition({ lineNumber: number + 1, column: 3 })!
    const box = code.getDomNode().getBoundingClientRect()
    return { x: box.x + place.left + 20, y: box.y + place.top + 8 }
  }, line)
  await page.waitForTimeout(200)
  await page.mouse.click(at.x, at.y)
  await page.waitForTimeout(600)
}

/** Where the first drawn `tag` is written, from its stamp:  its file, and line from 0. */
function writtenPlace(page: Page, tag: string, words?: string) {
  return page.evaluate(
    ([name, text]) => {
      const element = [...document.querySelectorAll(`.AppPaneBody ${name}[data-spell-at]`)].find(
        (each) => !text || each.textContent?.includes(text)
      )!
      const [, file, line] = /^(.+):(\d+):\d+$/.exec(element.getAttribute("data-spell-at")!)!
      return { file: file!, line: Number(line) }
    },
    [tag, words]
  )
}

/** What's in focus, and what shows of it. */
function following(page: Page) {
  return page.evaluate(() => {
    const { editor, Inspector } = window as unknown as DebugGlobals
    const output = document.querySelector(".CodeOutputCode")
    return {
      followed: editor.followed,
      file: editor.file?.file,
      selected: Inspector.allSelected.map(({ element }) => element.localName),
      codeHasFocus: editor.shownCodeEditor?.hasTextFocus() ?? false,
      codeMarks: document.querySelectorAll(".InputEditor .FollowedLine").length,
      outputMarks: output?.querySelectorAll(".FollowedLine").length ?? 0,
      outputShows: !!output,
      treeSelected: document.querySelectorAll("ui-tree-item[selected]:not([selected='false'])").length
    }
  })
}

describe.skipIf(!SERVING)("code follows along", () => {
  let context: BrowserContext
  const browser = chromium.launch()

  beforeEach(async () => {
    context = await (await browser).newContext({ viewport: { width: 1440, height: 800 }, colorScheme: "dark" })
    await contextWithNoSaving(context)
  })
  afterEach(() => context.close())
  afterAll(async () => (await browser).close())

  // what this test is for:  the built-in examples stay as they are
  afterEach(() => {
    expect(execSync("git status --short spaces", { cwd: path.join(KIT, "app") }).toString()).toBe("")
  })

  test("no compiled code unless asked for, then remembered, with its language", { timeout: 150_000 }, async () => {
    const page = await context.newPage()
    await open(page, "Solitaire")
    expect((await following(page)).outputShows).toBe(false)

    await chooseOutput(page, "TypeScript")
    expect((await following(page)).outputShows).toBe(true)
    expect(await page.locator(".CodeOutputCode .view-line").first().textContent()).toBeTruthy()

    await page.reload()
    await page.waitForSelector(".CodeOutputCode .view-line", { timeout: 60_000 })
    await expect
      .poll(() => page.locator(".CodeOutputPane ui-item[selected]").textContent(), { timeout: 8000 })
      .toContain("TypeScript")

    await chooseOutput(page, "Hide it")
    expect((await following(page)).outputShows).toBe(false)
  })

  test("a click on a line of code:  compiled code, the screen and the tree follow", { timeout: 150_000 }, async () => {
    const page = await context.newPage()
    await open(page, "Solitaire")
    await chooseOutput(page, "JavaScript")
    const place = await writtenPlace(page, "ui-text", "Moves")
    expect(place.file).toBe("Solitaire.spellml")

    await showFile(page, "Solitaire.spellml")
    await page.waitForTimeout(1500)
    await clickCodeLine(page, place.line)
    const state = await following(page)
    expect(state.followed).toMatchObject({ path: place.file, line: place.line, from: "code" })
    expect(state.selected).toEqual(["ui-text"])
    expect(state.treeSelected).toBeGreaterThan(0)
    expect(state.outputMarks, "compiled code marks its line").toBeGreaterThan(0)
    expect(state.codeMarks, "the code doesn't follow itself").toBe(0)
    expect(state.codeHasFocus, "a click in the code keeps it").toBe(true)
  })

  test("a click on a line of compiled code:  the code follows, in its own file", { timeout: 150_000 }, async () => {
    const page = await context.newPage()
    await open(page, "Solitaire")
    await chooseOutput(page, "JavaScript")
    // a line far enough in to be written by Card:  the code's on another file, or the same
    const box = await page.locator(".CodeOutputCode .view-line").nth(12).boundingBox()
    await page.mouse.click(box!.x + 60, box!.y + 8)
    await page.waitForTimeout(1500)
    const state = await following(page)
    expect(state.followed?.from).toBe("output")
    expect(state.file).toBe(state.followed?.path)
    expect(state.codeHasFocus, "following never takes the keyboard").toBe(false)
    expect(state.codeMarks).toBeGreaterThan(0)
  })

  test(
    "a click on a thing, and on its row:  the code and compiled code follow, quietly",
    { timeout: 150_000 },
    async () => {
      const page = await context.newPage()
      await open(page, "Solitaire")
      await chooseOutput(page, "Python")
      const at = await page.evaluate(() => {
        const box = document.querySelector(".AppPaneBody solitaire-foundation")!.getBoundingClientRect()
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
      })
      await page.mouse.click(at.x, at.y)
      await page.waitForTimeout(2000)
      const clicked = await following(page)
      expect(clicked.followed?.from).toBe("parts")
      expect(clicked.file).toBe(clicked.followed?.path)
      expect(clicked.codeHasFocus).toBe(false)
      expect(clicked.codeMarks).toBeGreaterThan(0)
      expect(clicked.outputMarks, "Python's map too").toBeGreaterThan(0)

      await page
        .locator("ui-tree-item[selected]")
        .first()
        .locator("xpath=..")
        .locator("ui-tree-item")
        .first()
        .click({ force: true })
      await page.waitForTimeout(1000)
      expect((await following(page)).codeHasFocus).toBe(false)
    }
  )

  test("someone typing isn't moved", { timeout: 150_000 }, async () => {
    const page = await context.newPage()
    await open(page, "Solitaire")
    await clickCodeLine(page, 2)
    await page.keyboard.type("x")
    const moved = await page.evaluate(async () => {
      const { editor } = window as unknown as DebugGlobals
      const code = editor.shownCodeEditor!
      const before = code.getScrollTop()
      editor.followed = { path: "Deck.spellml", line: 1, from: "parts" }
      await new Promise((resolve) => setTimeout(resolve, 800))
      return { before, after: code.getScrollTop(), file: editor.file?.file, focused: code.hasTextFocus() }
    })
    expect(moved.after).toBe(moved.before)
    expect(moved.focused).toBe(true)
    expect(moved.file).not.toBe("Deck.spellml")
  })

  test("in Spanish, too", { timeout: 150_000 }, async () => {
    const page = await context.newPage()
    await open(page, "Solitario")
    await chooseOutput(page, "JavaScript")
    const at = await page.evaluate(() => {
      const box = [...document.querySelectorAll(".AppPaneBody [data-spell-at]")]
        .map((element) => element.getBoundingClientRect())
        .find((each) => each.width > 0)!
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    })
    await page.mouse.click(at.x, at.y)
    await page.waitForTimeout(2000)
    const state = await following(page)
    expect(state.followed?.path).toMatch(/\.es\.|Solitario|Carta|Mazo|Pila/)
    expect(state.file).toBe(state.followed?.path)
    expect(state.outputMarks).toBeGreaterThan(0)
  })

  test.runIf(SHOTS)("pictures", { timeout: 200_000 }, async () => {
    for (const [theme, colorScheme] of [
      ["glass", "dark"],
      ["glass", "light"],
      ["fruity", "dark"],
      ["fruity", "light"]
    ] as const) {
      const looks = await (await browser).newContext({ viewport: { width: 1440, height: 800 }, colorScheme })
      await contextWithNoSaving(looks)
      await looks.route(/spell-site/, (route) =>
        route.request().method() === "GET"
          ? route.fulfill({ contentType: "text/plain", body: JSON.stringify({ theme, scheme: colorScheme }) })
          : route.fulfill({ status: 200, body: "{}" })
      )
      await looks.addInitScript(
        ([name, scheme]) => {
          localStorage.setItem("spell-site:theme", name)
          localStorage.setItem("spell-site:scheme", scheme)
        },
        [theme, colorScheme]
      )
      const page = await looks.newPage()
      await page.goto(`${EDITOR}edit/@spell/examples/Solitaire`, { timeout: 60_000 })
      await page.waitForSelector(".InputEditor .monaco-editor .view-line", { timeout: 60_000 })
      await page.waitForTimeout(4000)
      await page.locator(".InspectorToggle ui-icon").first().click({ force: true })
      await page.waitForTimeout(800)
      await chooseOutput(page, "JavaScript")
      const seen = await page.evaluate(() => document.documentElement.dataset.spellTheme)
      const place = await writtenPlace(page, "ui-text", "Moves")
      await showFile(page, place.file)
      await page.waitForTimeout(1500)
      await clickCodeLine(page, place.line)
      await page.waitForTimeout(800)
      await page.screenshot({ path: path.join(SHOTS!, `p17-${theme}-${colorScheme}.png`) })
      await page.locator(".CodeMoreMenu").click()
      await page.waitForTimeout(400)
      await page.screenshot({ path: path.join(SHOTS!, `p17-${theme}-${colorScheme}-menu.png`) })
      expect(seen).toBe(theme)
      await looks.close()
    }
  })
})
