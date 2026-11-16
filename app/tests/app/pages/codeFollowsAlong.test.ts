import path from "node:path"

import { chromium, type BrowserContext, type Page } from "playwright"
import { afterAll, afterEach, beforeEach, describe, expect, test } from "vite-plus/test"

import { builtInProjectsNow, CodeEditor, EDITOR, SERVING } from "./runningEditor"

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

const SHOTS = process.env.SHOTS

/** A browser context whose saves go nowhere near the disk. */
async function contextWithNoSaving(context: BrowserContext): Promise<void> {
  await context.route(/\/api\/projects\/file\/|\.(spell)(\?.*)?$/, (route) =>
    route.request().method() === "GET"
      ? route.continue()
      : route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  )
}

/** Open `project`, code showing, with the Inspector open. */
async function open(page: Page, project: string): Promise<void> {
  await page.goto(`${EDITOR}edit/@spell/examples/${project}`, { timeout: 60_000 })
  await new CodeEditor(page).shown()
  await page.waitForTimeout(4000)
  await page.locator(".InspectorToggle ui-icon").first().click({ force: true })
  await page.waitForTimeout(1000)
}

/** The top bar's compiled-code button (epic `editor` T76). */
function compiledCodeButton(page: Page) {
  return page.locator(".ModeTabs .CompiledCodeToggle [part~=item]").first()
}

/** Show the compiled code with the top bar's button, if it isn't showing, then click its tab `words`. */
async function chooseOutput(page: Page, words: string): Promise<void> {
  if (!(await page.locator(".CodeOutputPane").count())) {
    await compiledCodeButton(page).click()
    await page.waitForTimeout(1500)
  }
  await page.locator(".CodeOutputPane ui-item", { hasText: words }).first().click()
  await page.waitForTimeout(1500)
}

/** The page's debug globals, what's used of them. */
type DebugGlobals = {
  editor: {
    followed?: { path: string; line: number; from: string }
    file?: { file: string }
    project: { spellFiles: { path: string }[] }
    showEditor(path: string): void
  }
  Inspector: { allSelected: { element: Element }[]; dismissHelp(): void }
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
  await new CodeEditor(page).clickLine(line + 1, 3)
  await page.waitForTimeout(600)
}

/** Where the code's caret is, its line and column from 0, and its line's text. */
async function caretAndLine(page: Page): Promise<{ line: number; column: number; text: string }> {
  const code = new CodeEditor(page)
  const { lineNumber, column } = await code.caret()
  return { line: lineNumber - 1, column: column - 1, text: (await code.line(lineNumber)).trim() }
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
async function following(page: Page) {
  const codeHasFocus = await new CodeEditor(page).hasFocus()
  const shows = await page.evaluate(() => {
    const { editor, Inspector } = window as unknown as DebugGlobals
    const output = document.querySelector(".CodeOutputCode")
    return {
      followed: editor.followed,
      file: editor.file?.file,
      selected: Inspector.allSelected.map(({ element }) => element.localName),
      codeMarks: document.querySelectorAll(".InputEditor .FollowedLine").length,
      outputMarks: output?.querySelectorAll(".FollowedLine").length ?? 0,
      outputShows: !!output,
      treeSelected: document.querySelectorAll("ui-tree-item[selected]:not([selected='false'])").length
    }
  })
  return { ...shows, codeHasFocus }
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
  let builtInProjectsBefore: string
  beforeEach(() => {
    builtInProjectsBefore = builtInProjectsNow()
  })
  afterEach(() => {
    expect(builtInProjectsNow()).toBe(builtInProjectsBefore)
  })

  test("no compiled code unless asked for, then remembered, with its language", { timeout: 150_000 }, async () => {
    const page = await context.newPage()
    await open(page, "Solitaire")
    expect((await following(page)).outputShows).toBe(false)

    await chooseOutput(page, "TypeScript")
    expect((await following(page)).outputShows).toBe(true)
    expect(await page.locator(".CodeOutputCode .cm-line").first().textContent()).toBeTruthy()

    await page.reload()
    await page.waitForSelector(".CodeOutputCode .cm-line", { timeout: 60_000 })
    await expect
      .poll(() => page.locator(".CodeOutputPane ui-item[selected]").textContent(), { timeout: 8000 })
      .toContain("TypeScript")

    // the top bar's button names it, pressed;  a click hides it
    const button = page.locator(".ModeTabs .CompiledCodeToggle").first()
    expect(await button.getAttribute("title")).toBe("Compiled TypeScript")
    expect(await button.getAttribute("aria-pressed")).toBe("true")
    await compiledCodeButton(page).click()
    await page.waitForTimeout(1000)
    expect((await following(page)).outputShows).toBe(false)
    expect(await button.getAttribute("aria-pressed")).toBe("false")
  })

  test("a click on a line of code:  compiled code, the screen and the tree follow", { timeout: 150_000 }, async () => {
    const page = await context.newPage()
    await open(page, "Solitaire")
    await chooseOutput(page, "JavaScript")
    const place = await writtenPlace(page, "ui-text", "Score")
    expect(place.file).toBe("Solitaire.spell")

    await showFile(page, "Solitaire.spell")
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
    const box = await page.locator(".CodeOutputCode .cm-line").nth(12).boundingBox()
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

  test(
    "inspect, then a click on an action's button:  its tag is selected, the code's caret on it",
    { timeout: 150_000 },
    async () => {
      const page = await context.newPage()
      await open(page, "Solitaire")
      await showFile(page, "Solitaire.spell")
      await page.waitForTimeout(1500)
      // opening the Inspector inspects already;  else Inspect app
      if (!(await page.locator(".InspectAppButton.inspecting").count())) {
        await page.locator(".InspectAppButton [part~=item]").first().click({ force: true })
        await page.waitForTimeout(1000)
      }
      // Inspect app's help covers the header at this width
      await page.evaluate(() => (window as unknown as DebugGlobals).Inspector.dismissHelp())
      await page.waitForTimeout(300)
      // `<action "cheat" />` is drawn as its shadow root's button:  the host itself is `display: contents`
      const cheat = await page.evaluate(() => {
        const action = [...document.querySelectorAll(".AppPaneBody ui-toolbar > ui-action")].find(
          (each) => each.shadowRoot?.textContent?.trim() === "Cheat"
        )!
        const box = action.shadowRoot!.querySelector("button")!.getBoundingClientRect()
        const [, line, column] = /:(\d+):(\d+)$/.exec(action.getAttribute("data-spell-at")!)!
        return { x: box.x + box.width / 2, y: box.y + box.height / 2, line: Number(line), column: Number(column) }
      })
      await page.mouse.click(cheat.x, cheat.y)
      await page.waitForTimeout(1500)
      const state = await following(page)
      expect(state.selected, "the action's button, not the header around it (I158)").toEqual(["ui-action"])
      expect(state.followed).toMatchObject({ line: cheat.line, from: "parts" })
      const caret = await caretAndLine(page)
      expect(caret).toEqual({ line: cheat.line, column: cheat.column, text: '<action "cheat"/>' })
      expect(state.codeHasFocus, "following never takes the keyboard").toBe(false)
    }
  )

  test(
    "inspect, then a click in the gap a toolbar's spacer makes:  the spacer is selected, the code's caret on it",
    { timeout: 150_000 },
    async () => {
      const page = await context.newPage()
      await open(page, "Solitaire")
      await showFile(page, "Solitaire.spell")
      await page.waitForTimeout(1500)
      if (!(await page.locator(".InspectAppButton.inspecting").count())) {
        await page.locator(".InspectAppButton [part~=item]").first().click({ force: true })
        await page.waitForTimeout(1000)
      }
      await page.evaluate(() => (window as unknown as DebugGlobals).Inspector.dismissHelp())
      await page.waitForTimeout(300)
      // `<spacer/>` between Restart and Undo is 0px wide:  the gap between their buttons is what it makes (I169)
      const gap = await page.evaluate(() => {
        const spacer = document.querySelector(".AppPaneBody ui-toolbar > spacer")!
        const button = (element: Element | null) =>
          element!.shadowRoot!.querySelector("button")!.getBoundingClientRect()
        const [before, after] = [button(spacer.previousElementSibling), button(spacer.nextElementSibling)]
        const [, line, column] = /:(\d+):(\d+)$/.exec(spacer.getAttribute("data-spell-at")!)!
        return {
          x: (before.right + after.left) / 2,
          y: before.top + before.height / 2,
          width: after.left - before.right,
          spacerWidth: spacer.getBoundingClientRect().width,
          line: Number(line),
          column: Number(column)
        }
      })
      expect(gap.spacerWidth, "the spacer has no width of its own").toBe(0)
      expect(gap.width).toBeGreaterThan(4)
      await page.mouse.move(gap.x, gap.y)
      await page.waitForTimeout(400)
      const hover = await page.evaluate(() => {
        const box = document.querySelector<HTMLElement>(".InspectorHover")
        return box && !box.hidden ? box.getBoundingClientRect().width : 0
      })
      expect(hover, "the hover outline is the gap's").toBeCloseTo(gap.width, -1)
      await page.mouse.click(gap.x, gap.y)
      await page.waitForTimeout(1500)
      const state = await following(page)
      expect(state.selected).toEqual(["spacer"])
      expect(state.followed).toMatchObject({ line: gap.line, from: "parts" })
      const caret = await caretAndLine(page)
      expect(caret).toEqual({ line: gap.line, column: gap.column, text: "<spacer/>" })
    }
  )

  test("someone typing isn't moved", { timeout: 150_000 }, async () => {
    const page = await context.newPage()
    await open(page, "Solitaire")
    await clickCodeLine(page, 2)
    await page.keyboard.type("x")
    const code = new CodeEditor(page)
    const before = await code.scrollTop()
    await page.evaluate(() => {
      ;(window as unknown as DebugGlobals).editor.followed = { path: "Deck.spell", line: 1, from: "parts" }
    })
    await page.waitForTimeout(800)
    const moved = {
      before,
      after: await code.scrollTop(),
      file: await page.evaluate(() => (window as unknown as DebugGlobals).editor.file?.file),
      focused: await code.hasFocus()
    }
    expect(moved.after).toBe(moved.before)
    expect(moved.focused).toBe(true)
    expect(moved.file).not.toBe("Deck.spell")
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
      await new CodeEditor(page).shown()
      await page.waitForTimeout(4000)
      await page.locator(".InspectorToggle ui-icon").first().click({ force: true })
      await page.waitForTimeout(800)
      await chooseOutput(page, "JavaScript")
      const seen = await page.evaluate(() => document.documentElement.dataset.spellTheme)
      const place = await writtenPlace(page, "ui-text", "Score")
      await showFile(page, place.file)
      await page.waitForTimeout(1500)
      await clickCodeLine(page, place.line)
      await page.waitForTimeout(800)
      await page.screenshot({ path: path.join(SHOTS!, `p17-${theme}-${colorScheme}.png`) })
      expect(seen).toBe(theme)
      await looks.close()
    }
  })
})
