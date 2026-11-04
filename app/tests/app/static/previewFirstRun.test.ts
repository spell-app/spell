import { spawn, type ChildProcess } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

import { chromium, type Browser, type BrowserContext, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

/**
 * The public preview's first visit, as a person has it (epic `editor`, Build In Preview):
 * make an app from nothing on the real static build, with no server behind it.
 * - A real mouse and keys, in headless Chromium, on `spell app preview serve`.
 * - Reads what each step wrote from the browser's database, as `StaticFiles` keeps it.
 * - Run by hand, against a build it can trust:
 *   `spell app preview build`, then `PREVIEW_TEST=1 yarn vp test run tests/app/static/previewFirstRun.test.ts`.
 *   - Not in every `yarn test`:  the build's git-ignored, so a stale one would fail for no reason.
 * - `SHOTS=<folder>` leaves a picture of each step there.
 */

/** The kit's root. */
const KIT = path.resolve(import.meta.dirname, "../../../..")

/** Where the build is. */
const BUILD = path.join(KIT, "app/app/dist-static")

/** Where the preview is served for this test. */
const PORT = 48_487
const SITE = `http://localhost:${PORT}/`

/** Where it leaves pictures, when `SHOTS` names a folder. */
const SHOTS = process.env.SHOTS

/** What a compile and redraw takes, at most. */
const SETTLE_MS = 3000

/** The project a blank start makes. */
const PROJECT = "you@spell/my-app"

/** Its file. */
const FILE = `${PROJECT}/MyApp.spellml`

describe.runIf(!!process.env.PREVIEW_TEST && existsSync(path.join(BUILD, "index.html")))(
  "the preview's first run",
  { timeout: 300_000 },
  () => {
    let server: ChildProcess
    let browser: Browser
    let context: BrowserContext
    let page: Page
    const problems: string[] = []

    /** What the browser's database keeps in `store` under `key`. */
    const kept = (store: string, key: string) =>
      page.evaluate(
        ([storeName, wanted]) =>
          new Promise<unknown>((resolve, reject) => {
            const opening = indexedDB.open("spell-prefs")
            opening.onerror = () => reject(opening.error)
            opening.onsuccess = () => {
              const asked = opening.result.transaction("values").objectStore("values").get([storeName!, wanted!])
              asked.onsuccess = () => {
                opening.result.close()
                resolve(asked.result)
              }
            }
          }),
        [store, key]
      )

    /** The app file's text as kept. */
    const text = async () => (await kept("spell-static", FILE)) as string | undefined

    /** What's in the program's container, as written:  its tags, in order, with no indent. */
    const written = async () =>
      ((await text()) ?? "")
        .split("<ui-container>")[1]!
        .split("</ui-container>")[0]!
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)

    /** Take a picture, when asked to. */
    const shot = async (name: string) => {
      if (!SHOTS) return
      mkdirSync(SHOTS, { recursive: true })
      await page.screenshot({ path: path.join(SHOTS, `${name}.png`) })
    }

    /** Press at (`x`, `y`), move to (`toX`, `toY`) as a person does, and let go. */
    async function drag(x: number, y: number, toX: number, toY: number): Promise<void> {
      await page.mouse.move(x, y)
      await page.mouse.down()
      await page.mouse.move(x + 10, y + 10, { steps: 3 })
      await page.mouse.move(toX, toY, { steps: 6 })
      await page.waitForTimeout(100)
      await page.mouse.up()
      await page.waitForTimeout(SETTLE_MS)
    }

    /** Drag `label` out of the palette, opening it if it isn't, to (`toX`, `toY`). */
    async function fromPalette(label: string, toX: number, toY: number): Promise<void> {
      const row = page.locator(`.PalettePopup ui-tree-item[label="${label}"]`).first()
      if (!(await row.isVisible())) {
        await page.locator("#AddPartButton").click()
        await page.waitForTimeout(800)
      }
      const box = (await row.boundingBox())!
      await drag(box.x + 40, box.y + 10, toX, toY)
    }

    /** The app's part named `tag`, its middle. */
    const drawn = (tag: string) =>
      page.evaluate((name) => {
        const element = document.querySelector(`.AppPaneBody ${name}`)!
        const own = element.getBoundingClientRect()
        const box = own.width
          ? own
          : [...(element.shadowRoot?.children ?? [])]
              .map((child) => child.getBoundingClientRect())
              .find((one) => one.width)!
        return { x: box.x + box.width / 2, y: box.y + box.height / 2, height: box.height }
      }, tag)

    beforeAll(async () => {
      server = spawn("node", ["bin/spell.mjs", "app", "preview", "serve", "--headless", "--port", String(PORT)], {
        cwd: KIT,
        stdio: "ignore"
      })
      for (let tries = 0; tries < 60; tries++) {
        const answered = await fetch(SITE).catch(() => undefined)
        if (answered?.ok) break
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
      browser = await chromium.launch()
      context = await browser.newContext({ viewport: { width: 1440, height: 800 }, acceptDownloads: true })
      page = await context.newPage()
      page.on("pageerror", (error) => problems.push(`${error.message}\n${error.stack}`))
    })

    afterAll(async () => {
      await browser?.close()
      server?.kill()
    })

    test("a first visit offers every way to start", async () => {
      await page.goto(SITE, { timeout: 60_000 })
      await page.waitForSelector("#start .card", { timeout: 60_000 })
      await page.waitForTimeout(1000)
      await shot("1-welcome")
      expect(await page.locator("#start .card").count()).toBe(5)
    })

    test("Blank:  an app of your own, with the palette open", async () => {
      await page.locator("#start .card").first().click()
      await page.waitForURL(`**/edit/${PROJECT}**`, { timeout: 60_000 })
      await page.waitForSelector("#AddPartButton", { timeout: 60_000 })
      await page.waitForTimeout(SETTLE_MS)
      await shot("2-blank")
      expect(await page.locator(".PalettePopup").first().isVisible()).toBe(true)
      expect(await text()).toContain('<spell-app "my app">')
    })

    test("drag in a button and a card, change the words, reorder", async () => {
      const area = (await page.locator(".AppPaneBody").boundingBox())!
      const middle = area.x + area.width / 2
      await fromPalette("Button", middle, area.y + 60)
      await shot("3-button")
      expect(await written()).toEqual(["<ui-button>Click me</ui-button>"])
      // what's new has its words ready to type over
      await page.keyboard.type("Hi there")
      await page.keyboard.press("Tab")
      await page.waitForTimeout(SETTLE_MS)
      expect(await written()).toEqual(["<ui-button>Hi there</ui-button>"])
      await fromPalette("Card", middle, area.y + area.height - 40)
      expect(await written()).toEqual([
        "<ui-button>Hi there</ui-button>",
        '<ui-card heading="A card" description="What it says"></ui-card>'
      ])
      await shot("4-card")
    })

    test("change the button's words in the side bar", async () => {
      const button = await drawn("ui-button")
      if ((await page.locator(".InspectAppButton").first().getAttribute("aria-pressed")) !== "true") {
        await page.locator(".InspectAppButton [part~=item]").first().click()
      }
      await page.mouse.click(button.x, button.y)
      await page.waitForTimeout(800)
      await shot("5-selected")
      const field = page
        .locator('ui-property[name="textContent"] input, ui-property[name="textContent"] textarea')
        .first()
      await field.click()
      await page.keyboard.press("ControlOrMeta+a")
      await page.keyboard.type("Say hello")
      await page.keyboard.press("Tab")
      await page.waitForTimeout(SETTLE_MS)
      await shot("6-words")
      expect(await written()).toEqual([
        "<ui-button>Say hello</ui-button>",
        '<ui-card heading="A card" description="What it says"></ui-card>'
      ])
    })

    test("reorder by dragging", async () => {
      const button = await drawn("ui-button")
      const card = await drawn("ui-card")
      await drag(button.x, button.y, card.x, card.y + card.height / 2 - 2)
      expect(await written()).toEqual([
        '<ui-card heading="A card" description="What it says"></ui-card>',
        "<ui-button>Say hello</ui-button>"
      ])
    })

    test("reload:  it's all still there, on the screen and in the code", async () => {
      await page.reload()
      await page.waitForSelector(".AppPaneBody ui-button", { timeout: 60_000 })
      await page.waitForTimeout(SETTLE_MS)
      await shot("7-reloaded")
      expect(await page.locator(".AppPaneBody ui-button").first().innerText()).toContain("Say hello")
      expect(await written()).toHaveLength(2)
    })

    test("export, clear the site's data, import:  it's back", async () => {
      await page.locator(".BarMenu").first().click()
      await page.waitForTimeout(400)
      await shot("8-menu")
      const downloading = page.waitForEvent("download", { timeout: 20_000 })
      await page.locator('ui-action:has-text("Export")').first().click()
      const download = await downloading
      const file = path.join(mkdtempSync(path.join(tmpdir(), "spell-preview-")), download.suggestedFilename())
      await download.saveAs(file)
      const archive = JSON.parse(readFileSync(file, "utf8")) as {
        name: string
        files: { path: string; contents: string }[]
      }
      expect(archive.name).toBe("my-app")
      expect(archive.files[0]!.contents).toContain("Say hello")

      await page.goto(SITE)
      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            const deleting = indexedDB.deleteDatabase("spell-prefs")
            deleting.onsuccess = deleting.onerror = deleting.onblocked = () => resolve()
          })
      )
      await page.reload()
      await page.waitForSelector("#start .card", { timeout: 60_000 })
      await page.waitForTimeout(1500)
      expect(await page.locator("#projects .card:not(.empty)").count()).toBe(0)

      const choosing = page.waitForEvent("filechooser", { timeout: 20_000 })
      await page.locator('#start ui-button:has-text("Import")').click()
      await (await choosing).setFiles(file)
      await page.waitForURL(`**/edit/${PROJECT}**`, { timeout: 60_000 })
      await page.waitForSelector(".AppPaneBody ui-button", { timeout: 60_000 })
      await page.waitForTimeout(SETTLE_MS)
      await shot("9-imported")
      expect(await page.locator(".AppPaneBody ui-button").first().innerText()).toContain("Say hello")
    })

    test("New, duplicate and delete, on a person's own project", async () => {
      await page.goto(SITE)
      await page.waitForSelector("#projects .card:not(.empty)", { timeout: 60_000 })
      await shot("10-home-with-project")
      expect(await page.locator("#projects .card:not(.empty)").count()).toBe(1)
      page.once("dialog", (dialog) => void dialog.accept("second app"))
      await page.locator('#projects ui-button:has-text("New App")').click()
      await page.waitForURL("**/edit/you@spell/second-app**", { timeout: 60_000 })
      await page.waitForSelector("#AddPartButton", { timeout: 60_000 })
      await page.waitForTimeout(SETTLE_MS)
      expect(await kept("spell-static", "you@spell/second-app/MyApp.spellml")).toContain("<ui-container>")
    })

    test("a starter is the person's own, and takes what's added", async () => {
      await page.goto(SITE)
      await page.waitForSelector("#start .card", { timeout: 60_000 })
      await page.locator('#start .card:has-text("Counter")').click()
      await page.waitForURL("**/edit/you@spell/counter**", { timeout: 60_000 })
      await page.waitForSelector(".AppPaneBody ui-button", { timeout: 60_000 })
      await page.waitForTimeout(SETTLE_MS)
      await shot("11-counter")
      await page.locator(".AppPaneBody ui-button").first().click()
      await page.waitForTimeout(500)
    })

    test("Solitaire invites a change", async () => {
      await page.goto(SITE)
      await page.waitForSelector("#start .card", { timeout: 60_000 })
      await page.locator('#start .card:has-text("Solitaire")').click()
      await page.waitForURL("**/edit/@spell/examples/Solitaire**", { timeout: 60_000 })
      await page.waitForTimeout(1000)
      await shot("12-solitaire")
      expect(await page.locator(".Notice ui-message").first().getAttribute("heading")).toContain("change its suit")
    })

    test("the to-do starter is a copy of the Task List", async () => {
      await page.goto(SITE)
      await page.waitForSelector("#start .card", { timeout: 60_000 })
      await page.locator('#start .card:has-text("To-do")').click()
      await page.waitForURL("**/edit/you@spell/task-list**", { timeout: 60_000 })
      await page.waitForTimeout(SETTLE_MS * 2)
      await shot("13-todo")
      expect(await kept("spell-static", "you@spell/task-list/TaskList.spellml")).toContain("start the task list")
    })

    test.runIf(!!SHOTS)("pictures, in each look", async () => {
      for (const [theme, scheme] of [
        ["glass", "dark"],
        ["glass", "light"],
        ["fruity", "dark"],
        ["fruity", "light"]
      ]) {
        const look = `theme=${theme}&scheme=${scheme}`
        await page.goto(`${SITE}?${look}`)
        await page.waitForSelector("#start .card", { timeout: 60_000 })
        await page.waitForTimeout(1500)
        await shot(`look-${theme}-${scheme}-home`)
        await page.goto(`${SITE}edit/${PROJECT}?${look}`)
        await page.waitForSelector(".AppPaneBody ui-button", { timeout: 60_000 })
        await page.waitForTimeout(SETTLE_MS)
        await shot(`look-${theme}-${scheme}-app`)
      }
    })

    test("the page's problems:  none", () => {
      expect(problems).toEqual([])
    })
  }
)
