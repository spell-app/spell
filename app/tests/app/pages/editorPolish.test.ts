import { chromium, type BrowserContext, type Page, type Route } from "playwright"
import { afterAll, afterEach, beforeEach, describe, expect, test } from "vite-plus/test"

import { builtInProjectsNow, CodeEditor, EDITOR, SERVING } from "./runningEditor"

/**
 * The code pane's rough edges, smoothed (epic `editor` P28, Editor Polish), in the running editor:
 * - I50:  the selection's ants never draw over the loading screen
 * - I51, I52:  the outline follows the code's cursor, by click or arrow keys;  a line in a tag selects what the tag
 *   draws, inside a drawn thing's own drawing too;  a line that draws nothing selects nothing
 * - I69:  the arrow keys' follow waits for the cursor to rest, one follow for a run of presses
 * - I87:  once an edit typed or pasted in the code is drawn, the outline follows the cursor's line, once;
 *   a line that draws nothing keeps what's selected
 * - I88:  loading, following and editing log no Solid warning about a signal read where it isn't followed
 * - I53, I59:  a paste takes the indent where it lands, markup as a tree;  Shift+Tab takes a tag's children along
 * - I54, I55:  the suggestions show by themselves where they help, each row saying what it is
 * - NOTHING reaches the disk:  every save is answered here, and a later read of the file gets what was saved.
 * - Needs this checkout's editor running:  `spell server start all`.  Skips itself when it isn't, as in CI.
 * - Headless Playwright, never a real browser window.
 */

/**
 * A browser context whose saves go nowhere near the disk:  a read of a saved file gets the saved text.
 * - Its preferences too (`/api/prefs`).
 * - A file is saved through the API and read again from where it's served (`/spaces/...`):
 *   both reads get the saved text, or a save would seem to be undone.
 */
async function contextWithNoSaving(context: BrowserContext): Promise<void> {
  const saved = new Map<string, string>()
  // a file by where it's served:  `/api/projects/file/@spell/...` is `/spaces/@spell/...`
  const keyOf = (url: string) => new URL(url).pathname.replace(/^\/api\/projects\/file\//, "/spaces/")
  const answer = (route: Route) => {
    const request = route.request()
    const key = keyOf(request.url())
    if (request.method() !== "GET") {
      saved.set(key, request.postData() ?? "")
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
    }
    const text = saved.get(key)
    return text === undefined ? route.continue() : route.fulfill({ status: 200, contentType: "text/plain", body: text })
  }
  await context.route(/\/api\/(projects\/file|prefs)\//, answer)
  await context.route(/\/api\/prefs(\?.*)?$/, answer)
  await context.route(/\.spell(\?.*)?$/, answer)
}

/** Open example `project`, showing its file `file`. */
async function open(page: Page, project: string, file: string): Promise<void> {
  await page.goto(`${EDITOR}edit/@spell/examples/${project}`, { timeout: 60_000 })
  await new CodeEditor(page).shown()
  await page.waitForTimeout(4000)
  await page.evaluate(`(() => {
    const { editor } = window
    editor.showEditor(editor.project.spellFiles.find((each) => each.path.endsWith("/${file}")).path)
  })()`)
  await page.waitForTimeout(2000)
}

/** The number, from 1, of the first line of the code showing that holds `words`. */
function lineOf(page: Page, words: string): Promise<number> {
  return new CodeEditor(page).lineOf(words)
}

/** Click line `lineNumber`, from 1, at its first word (or at `column`), with a real mouse. */
async function clickLine(page: Page, lineNumber: number, column?: number): Promise<void> {
  await new CodeEditor(page).clickLine(lineNumber, column)
  await page.waitForTimeout(800)
}

/** What's selected:  each element's tag. */
function selected(page: Page): Promise<string[]> {
  return page.evaluate(`window.Inspector.allSelected.map(({ element }) => element.localName)`)
}

/** What's selected:  where each element is written, `Solitaire.spell:18:4` (its line from 0). */
function selectedPlaces(page: Page): Promise<string[]> {
  return page.evaluate(`window.Inspector.allSelected.map(({ element }) => element.dataset.spellAt)`)
}

/** Lines `lineNumber` (from 1) on, `count` of them, of the code showing. */
function linesFrom(page: Page, lineNumber: number, count: number): Promise<string[]> {
  return new CodeEditor(page).linesFrom(lineNumber, count)
}

/**
 * The suggestion list:  is it showing, and its rows' text.
 * - A row's parts (its label, what it is) joined by a space:  CodeMirror draws them as spans side by side.
 */
function suggestions(page: Page): Promise<{ isShowing: boolean; rows: string[] }> {
  return page.evaluate(`(() => {
    const box = document.querySelector(".InputEditor .cm-tooltip-autocomplete")
    const rows = [...(box?.querySelectorAll("li") ?? [])].map((row) =>
      [...row.children].map((part) => part.textContent.replace(/\\s+/g, " ").trim()).filter(Boolean).join(" ")
    )
    return { isShowing: !!box, rows }
  })()`)
}

/** Type `text`, a key at a time, on a new line after line `lineNumber`. */
async function typeAfter(page: Page, lineNumber: number, text: string): Promise<void> {
  const code = new CodeEditor(page)
  await code.setCaret(lineNumber, "end")
  await code.press("Enter")
  await code.type(text, 60)
  await page.waitForTimeout(1200)
}

/** Paste `text` at the caret, as Cmd+V's paste event would bring it. */
function paste(page: Page, text: string): Promise<void> {
  return new CodeEditor(page).paste(text)
}

describe.skipIf(!SERVING)("editor polish (epic `editor` P28)", () => {
  let context: BrowserContext
  const browser = chromium.launch()

  beforeEach(async () => {
    context = await (
      await browser
    ).newContext({
      viewport: { width: 1440, height: 860 },
      colorScheme: "dark",
      // Cmd+X and Cmd+V, as a person cuts and pastes (I87)
      permissions: ["clipboard-read", "clipboard-write"]
    })
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
    await new CodeEditor(page).shown()
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
      await clickLine(page, await lineOf(page, `<stock-pile "stock"/>`))
      expect(await selected(page)).toEqual(["solitaire-stock-pile"])
      // the discards, the spacer, then three foundations:  as quick as a held key
      for (let press = 0; press < 5; press++) {
        await page.keyboard.press("ArrowDown")
        await page.waitForTimeout(30)
      }
      // the cursor's already there;  the selection waits for it to rest
      expect(await selected(page)).toEqual(["solitaire-stock-pile"])
      await page.waitForTimeout(800)
      expect(await page.evaluate(`window.editor.followed.line + 1`)).toBe(await lineOf(page, `<foundation "hearts"`))
      expect(await selected(page)).toEqual(["solitaire-foundation"])
    }
  )

  test(
    "I87:  two actions swapped by cut and paste:  once it's drawn, the action on the cursor's line is selected",
    { timeout: 150_000 },
    async () => {
      const page = await context.newPage()
      await open(page, "Solitaire", "Solitaire.spell")
      const cheat = await lineOf(page, `<action "cheat"/>`)
      const code = new CodeEditor(page)
      await code.focus()
      await code.setCaret(cheat, 7)
      // the real keys:  no range selected, so Cmd+X takes the whole line, and Cmd+V puts it back as a line
      await page.keyboard.press("Meta+x")
      await page.waitForTimeout(3500)
      // up onto `auto play`, then nothing selected, so only the paste's drawing can select it
      await page.keyboard.press("ArrowUp")
      await page.waitForTimeout(800)
      await page.evaluate(`window.Inspector.letGo()`)
      await page.keyboard.press("Meta+v")
      await page.waitForTimeout(300)
      expect(await linesFrom(page, cheat - 1, 2).then((lines) => lines.map((line) => line.trim()))).toEqual([
        `<action "cheat"/>`,
        `<action "auto play"/>`
      ])
      // typing never moves the selection:  nothing yet, until the app has taken the edit and drawn it
      expect(await selected(page)).toEqual([])
      // the compile waits for typing to pause, then runs:  however long that takes here
      await page.waitForFunction(`window.Inspector.allSelected.length > 0`, null, { timeout: 20_000 }).catch(() => {})
      const cursorLine = (await code.caret()).lineNumber
      expect(cursorLine).toBe(cheat)
      expect(await selectedPlaces(page)).toEqual([`Solitaire.spell:${cursorLine - 1}:4`])
    }
  )

  test("I87:  an edit on a line that draws nothing keeps what's selected", { timeout: 150_000 }, async () => {
    const page = await context.newPage()
    await open(page, "Solitaire", "Solitaire.spell")
    await clickLine(page, await lineOf(page, `<stock-pile "stock"/>`))
    expect(await selected(page)).toEqual(["solitaire-stock-pile"])
    await typeAfter(page, await lineOf(page, "// Deal seven columns"), "// a note")
    await page.waitForTimeout(4500)
    expect(await selected(page)).toEqual(["solitaire-stock-pile"])
  })

  test(
    "I88:  loading, following and editing Solitaire log no warning about a signal read unfollowed",
    { timeout: 150_000 },
    async () => {
      const page = await context.newPage()
      const warnings: string[] = []
      page.on("console", (message) => {
        if (message.text().includes("STRICT_READ_UNTRACKED")) warnings.push(message.text())
      })
      await open(page, "Solitaire", "Solitaire.spell")
      await page.locator(".InspectorToggle ui-icon").first().click({ force: true })
      await page.waitForTimeout(1000)
      await clickLine(page, await lineOf(page, `<action "cheat"/>`))
      expect(await selected(page)).toEqual(["ui-action"])
      await typeAfter(page, await lineOf(page, "// Deal seven columns"), "// a note")
      await page.waitForTimeout(4500)
      expect(warnings).toEqual([])
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
      await new CodeEditor(page).setCaret(content, indent.length + 1)
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
