import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"

import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { CodeEditor, EDITOR, KIT, SERVING } from "./runningEditor"

/**
 * The editor in itself (epic `editor` P22, P29):  its own Spell is ONE project of the group `@spell/editor`,
 * `spell-editor`, one file, `SpellEditor.spell`.
 * - It opens in the editor like any project.
 * - A published change to it shows in the running editor.
 * - Spell that stops compiling can't lock you out:  the editor runs its last good compile, and says why.
 * - Its project shows a zone per view of its Spell, from your drafts (T63):  the editor you're using never runs a draft.
 * - Writes the editor's file and a draft of it, and ALWAYS puts them back (`afterAll`, and on exit).
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** The editor's own Spell, the file this test changes. */
const BAR = path.join(KIT, "app/spaces/@spell/editor/spell-editor/SpellEditor.spell")

/** Today's draft of it, as the server names one:  `__draft/SpellEditor.owen-2026-11-03.spell` (P24, Q24). */
const BAR_DRAFTS = path.join(path.dirname(BAR), "__draft")

describe.skipIf(!SERVING)("the editor in itself", { timeout: 180_000 }, () => {
  let browser: Browser
  let page: Page
  const original = readFileSync(BAR, "utf8")
  const putBack = () => {
    writeFileSync(BAR, original)
    rmSync(BAR_DRAFTS, { recursive: true, force: true })
  }

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

  test("the editor's Spell opens as a project:  its code shows", async () => {
    await page.goto(`${EDITOR}edit/@spell/editor/spell-editor`, { timeout: 60_000 })
    await new CodeEditor(page).shown()
    expect(
      await until(() => /spell\seditor/.test(document.querySelector(".InputEditor .cm-content")?.textContent ?? ""))
    ).toBe(true)
  })

  test("its project shows a zone per view, from your drafts:  a draft of the bar shows in its zone, never outside (T63)", async () => {
    const now = new Date()
    const day = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
      .map((it) => String(it).padStart(2, "0"))
      .join("-")
    mkdirSync(BAR_DRAFTS, { recursive: true })
    writeFileSync(
      path.join(BAR_DRAFTS, `SpellEditor.owen-${day}.spell`),
      original.replace(`class="AppMenu tight EditorBar"`, `class="AppMenu tight EditorBar DraftProbe"`)
    )
    await page.goto(`${EDITOR}edit/@spell/editor/spell-editor`, { timeout: 60_000 })
    await page.locator(".EditorZones .EditorZone .EditorBar.DraftProbe").first().waitFor({ timeout: 90_000 })
    // a zone each, headed by its view's name;  the bar the editor itself runs never takes the draft
    expect(await page.locator(".EditorZones .EditorZoneTitle").allTextContents()).toContain("editor bar")
    expect(
      await page.evaluate(
        () => [...document.querySelectorAll(".DraftProbe")].filter((it) => !it.closest(".EditorZones")).length
      )
    ).toBe(0)
    rmSync(BAR_DRAFTS, { recursive: true, force: true })
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

  test("Spell that stops compiling falls back to its last good one, and says why", async () => {
    writeFileSync(BAR, original.replace("spell editor is an app", "spell editor is an app\n\t<draw>"))
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
