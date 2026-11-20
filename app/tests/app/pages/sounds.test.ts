import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { builtInProjectsNow, CodeEditor, EDITOR, KIT, SERVING } from "./runningEditor"

/**
 * Spell's built-in sounds really play (epic `mockup` P28), in the three places a program's sounds are heard:
 * - the editor:  the sound picker's ▶, in `play "|"`
 * - a running app:  Counter's button, in the editor's app pane (`play "click"`)
 * - a built page:  the built `<spell-viewer>` (`yarn build:element`), on a page of its own and on a docs page
 * - "Plays" means the browser STARTED playing it:  `play()`'s promise resolved, so the file was found and decoded.
 *   A file not found, or one it can't decode, rejects it.
 * - Needs this checkout's editor and page server running:  `spell server start all`.
 *   Skips itself when they aren't, as in CI;  the built page's tests skip without a `dist-element/`.
 */

/** A small app with one sound:  its button plays `click`. */
const COUNTER = "@spell/examples/Counter"

/** The page server's address, from its note at the kit's root;  `undefined`:  none noted. */
const PAGE_SERVER = (() => {
  const note = path.join(KIT, ".spell-server.json")
  if (!existsSync(note)) return undefined
  return `http://127.0.0.1:${(JSON.parse(readFileSync(note, "utf8")) as { port: number }).port}`
})()

/** Is `<spell-viewer>` built, for the built page's tests? */
const BUILT = existsSync(path.join(KIT, "app/app/dist-element/spell-viewer.js"))

/** A sound the page asked to play, and whether it started:  `window.soundsPlayed`. */
type SoundPlayed = { src: string; started: boolean; error?: string }

/**
 * Note every sound the page plays (`window.soundsPlayed`), before any of its scripts run.
 * - Wraps `HTMLMediaElement.prototype.play()`:  every `Audio` (core's `play`, the picker's ▶) goes through it.
 */
function noteSoundsPlayed(): void {
  const played: SoundPlayed[] = []
  ;(window as unknown as { soundsPlayed: SoundPlayed[] }).soundsPlayed = played
  const play = HTMLMediaElement.prototype.play
  HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
    const started = play.call(this)
    started.then(
      () => played.push({ src: this.src, started: true }),
      (error: unknown) => played.push({ src: this.src, started: false, error: String(error) })
    )
    return started
  }
}

/** The sounds `page` has played so far. */
const soundsPlayed = (page: Page) =>
  page.evaluate(() => (window as unknown as { soundsPlayed: SoundPlayed[] }).soundsPlayed)

/** Wait until `page` has played a sound whose file is `file` (`click.ogg`), and say how it went. */
async function playedFile(page: Page, file: string): Promise<SoundPlayed | undefined> {
  await page
    .waitForFunction(
      (name) =>
        (window as unknown as { soundsPlayed: SoundPlayed[] }).soundsPlayed.some((sound) => sound.src.endsWith(name)),
      `/${file}`,
      { timeout: 20_000 }
    )
    .catch(() => undefined)
  return (await soundsPlayed(page)).find((sound) => sound.src.endsWith(`/${file}`))
}

describe.skipIf(!SERVING)("the built-in sounds play", { timeout: 240_000 }, () => {
  let browser: Browser

  beforeAll(async () => {
    browser = await chromium.launch()
  })
  afterAll(async () => {
    await browser?.close()
  })

  /** A new page that notes the sounds it plays. */
  async function newPage(): Promise<Page> {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
    await page.addInitScript(noteSoundsPlayed)
    return page
  }

  ////////////////
  // ## The editor
  ////////////////

  describe("in the editor", () => {
    let page: Page
    const before = builtInProjectsNow()

    beforeAll(async () => {
      page = await newPage()
      await page.goto(`${EDITOR}edit/${COUNTER}`, { timeout: 60_000 })
      await page.waitForFunction(() => !!(window as { editor?: unknown }).editor, undefined, { timeout: 60_000 })
    })
    afterAll(async () => {
      await page?.close()
    })

    test("a running app's sound plays:  Counter's button plays `click`, once", async () => {
      const button = page.locator("counter-app ui-button, counter-app button").first()
      await button.waitFor({ timeout: 60_000 })
      // never on load
      expect(await soundsPlayed(page)).toEqual([])
      await button.click()
      expect(await playedFile(page, "click.ogg")).toMatchObject({ started: true })
      expect((await soundsPlayed(page)).length).toBe(1)
    })

    test("the sound picker's ▶ plays the sound it's beside", async () => {
      const code = new CodeEditor(page)
      await code.shown()
      const line = await code.lineOf('play "click"')
      expect(line).toBeGreaterThan(0)
      // the caret just inside the quotes, then the suggestion list:  its first row opens the picker
      const column = (await code.line(line)).indexOf('"click"') + 2
      await code.setCaret(line, column)
      await code.press("Control+Space")
      await page.getByText("Pick a sound…").first().click()
      const listen = page.getByRole("button", { name: "Hear “coins”" })
      await listen.waitFor({ timeout: 10_000 })
      await listen.click()
      expect(await playedFile(page, "coins.ogg")).toMatchObject({ started: true })
      await page.keyboard.press("Escape")
      // nothing picked:  the code is as it was
      expect(await code.line(line)).toContain('play "click"')
      expect(builtInProjectsNow()).toBe(before)
    })
  })

  ////////////////
  // ## A built page
  ////////////////

  describe.skipIf(!BUILT || !PAGE_SERVER)("on a built page", () => {
    test("a page of its own, with the built `<spell-viewer>` alone:  Counter's button plays `click`", async () => {
      const page = await newPage()
      try {
        const address = `${PAGE_SERVER}/sounds-check.html`
        await page.route(address, (route) =>
          route.fulfill({
            contentType: "text/html",
            body:
              '<!doctype html><meta charset="utf-8"><script type="module" src="/element/spell-viewer.js"></script>' +
              `<spell-viewer project="${COUNTER}"></spell-viewer>`
          })
        )
        await page.goto(address, { timeout: 60_000 })
        const button = page.locator("counter-app button, counter-app ui-button").first()
        await button.waitFor({ timeout: 60_000 })
        expect(await soundsPlayed(page)).toEqual([])
        await button.click()
        expect(await playedFile(page, "click.ogg")).toMatchObject({ started: true })
      } finally {
        await page.close()
      }
    })

    // retried:  about one load in four, the calculator here draws nothing at all, sounds or not
    // (the suspected-bugs log, "## app", 2026-11-18)
    test("a docs page, whose Spell UI is its own:  the calculator's keys play `tap`", { retry: 2 }, async () => {
      const page = await newPage()
      try {
        // its example's section starts folded:  its address opens it
        await page.goto(`${PAGE_SERVER}/components/app/spell-viewer.html#1-example`, { timeout: 60_000 })
        const key = page
          .locator("spell-viewer[project='@spell/examples/calculator'] ui-button")
          .filter({ hasText: "7" })
          .first()
        await key.waitFor({ timeout: 30_000 })
        await key.click()
        expect(await playedFile(page, "tap.ogg")).toMatchObject({ started: true })
      } finally {
        await page.close()
      }
    })
  })
})
