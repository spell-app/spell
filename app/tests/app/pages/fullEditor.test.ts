import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

/**
 * The editor in itself (epic `editor` P22):  its own Spell pieces are projects of the group `@spell/editor`.
 * - A piece opens in the editor like any project.
 * - A published change to a piece shows in the running editor.
 * - A piece that stops compiling can't lock you out:  the editor runs its last good compile, and says why.
 * - Writes the editor bar's file, and ALWAYS puts it back (`afterAll`, and on exit).
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** The kit's root, where the page server leaves its note of the editor's address. */
const KIT = path.resolve(import.meta.dirname, "../../../..")

/** The editor bar's piece, the file this test changes. */
const BAR = path.join(KIT, "app/spaces/@spell/editor/editor-bar/EditorBar.spellml")

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

describe.skipIf(!SERVING)("the editor in itself", { timeout: 180_000 }, () => {
  let browser: Browser
  let page: Page
  const original = readFileSync(BAR, "utf8")
  const putBack = () => writeFileSync(BAR, original)

  /**
   * Wait until `check` is true on the page, up to `ms`.
   * - A changed piece may reload the page:  a check made as it goes counts as not yet, and it tries again.
   */
  async function until(check: () => boolean, ms = 30_000): Promise<boolean> {
    for (const stop = Date.now() + ms; Date.now() < stop; await page.waitForTimeout(300)) {
      if (await page.evaluate(check).catch(() => false)) return true
    }
    return false
  }

  beforeAll(async () => {
    process.on("exit", putBack)
    browser = await chromium.launch()
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  })

  afterAll(async () => {
    putBack()
    await browser?.close()
  })

  test("a piece opens as a project:  the editor layout's code shows", async () => {
    await page.goto(`${EDITOR}edit/@spell/editor/editor-layout`, { timeout: 60_000 })
    await page.waitForSelector(".InputEditor .monaco-editor .view-line", { timeout: 60_000 })
    expect(
      await until(() => /editor\slayout/.test(document.querySelector(".InputEditor .view-lines")?.textContent ?? ""))
    ).toBe(true)
  })

  test("a published change to the bar shows in the running editor", async () => {
    await page.goto(`${EDITOR}edit/@spell/examples/Counter`, { timeout: 60_000 })
    await page.waitForSelector(".EditorBar", { timeout: 60_000 })
    writeFileSync(
      BAR,
      original.replace(`class="AppMenu tight EditorBar"`, `class="AppMenu tight EditorBar FullEditorProbe"`)
    )
    expect(await until(() => !!document.querySelector(".FullEditorProbe"))).toBe(true)
  })

  test("a bar that stops compiling falls back to its last good one, and says why", async () => {
    writeFileSync(BAR, original.replace("</draw>", "<draw>"))
    expect(
      await until(() =>
        /doesn't compile/.test(String((window as { editor?: { error?: Error } }).editor?.error?.message))
      )
    ).toBe(true)
    expect(await page.evaluate(() => !!document.querySelector(".EditorBar.FullEditorProbe"))).toBe(true)
    putBack()
    expect(
      await until(() => !!document.querySelector(".EditorBar") && !document.querySelector(".FullEditorProbe"))
    ).toBe(true)
  })
})
