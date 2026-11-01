import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { chromium, type Browser, type BrowserContext, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

/**
 * A drop, a move and a side-bar edit leave the running app alone (epic `editor`, Edit Without Redraw).
 * - Solitaire, a few moves in:  the same card elements, the same things, the same score, before and after.
 * - NOTHING reaches the disk:  every save is answered here, so the built-in examples can't change.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
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

/** What a compile and redraw takes, at most. */
const SETTLE_MS = 4000

/** How the page saw itself keep what it had. */
type Kept = {
  cards: number
  sameCards: number
  sameThings: number
  sameApp: boolean
  score: number
  moves: number
  piles: string
  scoreBefore: number
  movesBefore: number
  pilesBefore: string
}

describe.skipIf(!SERVING)("editing without redrawing", { timeout: 240_000 }, () => {
  let browser: Browser
  let context: BrowserContext
  let page: Page
  /** What a save sent, by file:  a save never reaches the disk, and a read answers it. */
  const saved = new Map<string, string>()

  /** Note the page's cards and things as they are now. */
  const noteTheGame = () =>
    page.evaluate(() => {
      const area = document.querySelector(".AppPaneBody")!
      const app = area.querySelector("solitaire-app") as HTMLElement & { thing: Record<string, unknown> }
      const cards = [...area.querySelectorAll("solitaire-card")] as (HTMLElement & { thing: object })[]
      const piles = [
        ...area.querySelectorAll(
          "solitaire-pile, solitaire-stock-pile, solitaire-discard-pile, solitaire-foundation, solitaire-tableau"
        )
      ]
      const state = () =>
        piles.map((pile) => `${pile.localName}:${pile.querySelectorAll("solitaire-card").length}`).join(" ")
      ;(window as unknown as { noted: unknown }).noted = {
        app,
        cards,
        things: cards.map((card) => card.thing),
        score: app.thing.score,
        moves: app.thing.moves,
        piles: state()
      }
    })

  /** What's the same as `noteTheGame()` saw. */
  const whatsKept = () =>
    page.evaluate((): Kept => {
      const noted = (window as unknown as { noted: Record<string, never> }).noted as unknown as {
        app: HTMLElement & { thing: Record<string, unknown> }
        cards: HTMLElement[]
        things: object[]
        score: number
        moves: number
        piles: string
      }
      const area = document.querySelector(".AppPaneBody")!
      const app = area.querySelector("solitaire-app") as HTMLElement & { thing: Record<string, unknown> }
      const cards = [...area.querySelectorAll("solitaire-card")] as (HTMLElement & { thing: object })[]
      const piles = [
        ...area.querySelectorAll(
          "solitaire-pile, solitaire-stock-pile, solitaire-discard-pile, solitaire-foundation, solitaire-tableau"
        )
      ]
      return {
        cards: cards.length,
        sameCards: cards.filter((card) => noted.cards.includes(card)).length,
        sameThings: cards.filter((card) => noted.things.includes(card.thing)).length,
        sameApp: app === noted.app && app.thing === (noted.app as unknown as { thing: unknown }).thing,
        score: app.thing.score as number,
        moves: app.thing.moves as number,
        piles: piles.map((pile) => `${pile.localName}:${pile.querySelectorAll("solitaire-card").length}`).join(" "),
        scoreBefore: noted.score,
        movesBefore: noted.moves,
        pilesBefore: noted.piles
      }
    })

  /** The tags written in the file `name`, the program's real text. */
  const textOf = (name: string) =>
    page.evaluate((file) => {
      const { project } = window as unknown as { project: { spellFiles: { path: string; contents: string }[] } }
      return project.spellFiles.find((each) => each.path.endsWith(`/${file}`))!.contents
    }, name)

  /** The game's cards, piles and app are the same objects, holding the same game. */
  const expectGameKept = async () => {
    const kept = await whatsKept()
    expect(kept.cards).toBe(52)
    expect(kept.sameCards).toBe(52)
    expect(kept.sameThings).toBe(52)
    expect(kept.sameApp).toBe(true)
    expect(kept.score).toBe(kept.scoreBefore)
    expect(kept.moves).toBe(kept.movesBefore)
    expect(kept.piles).toBe(kept.pilesBefore)
  }

  /** Change file `name`'s text as typing would, and compile it. */
  async function edit(name: string, from: string | RegExp, to: string): Promise<void> {
    await page.evaluate(
      async ({ file, pattern, flags, text, replacement }) => {
        const { project, editor } = window as unknown as {
          project: { spellFiles: { path: string; contents: string }[] }
          editor: {
            compileApp(): Promise<void>
            history: { change(change: object, step: { title: string }): void }
          }
        }
        const found = project.spellFiles.find((each) => each.path.endsWith(`/${file}`))!
        const before = found.contents
        const after = pattern
          ? before.replace(new RegExp(pattern, flags), () => replacement)
          : before.replace(text!, () => replacement)
        editor.history.change({ file: found, at: 0, before, after }, { title: "Typed" })
        await editor.compileApp()
      },
      {
        file: name,
        pattern: from instanceof RegExp ? from.source : undefined,
        flags: from instanceof RegExp ? from.flags : undefined,
        text: typeof from === "string" ? from : undefined,
        replacement: to
      }
    )
    await page.waitForTimeout(500)
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

  beforeAll(async () => {
    browser = await chromium.launch()
    context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    // the one route:  a save never reaches the disk
    await context.route(/\/api\/projects\/file\/|\.(spellml|spell)(\?.*)?$/, (route) => {
      const request = route.request()
      if (request.isNavigationRequest()) return route.continue()
      const file = new URL(request.url()).pathname.split("/").at(-1)!
      if (request.method() !== "GET") {
        saved.set(file, request.postData() ?? "")
        return route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
      }
      const text = saved.get(file)
      return text === undefined ? route.continue() : route.fulfill({ contentType: "text/plain", body: text })
    })
    page = await context.newPage()
    await page.goto(`${EDITOR}edit/@spell/examples/Solitaire`, { timeout: 60_000 })
    await page.waitForSelector(".AppPaneBody solitaire-card", { timeout: 60_000, state: "attached" })
    // the deal's own pauses, all 28 cards and the first turn
    await page.waitForTimeout(8000)
    // a few moves:  the stock's card turned over, three times
    for (let turn = 0; turn < 3; turn++) {
      const stock = await page.locator(".AppPaneBody solitaire-stock-pile").first().boundingBox()
      await page.mouse.click(stock!.x + stock!.width / 2, stock!.y + stock!.height / 2)
      await page.waitForTimeout(700)
    }
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
  })

  test("a part dropped in leaves the game as it was", async () => {
    await page.locator(".InspectAppButton").first().click()
    await page.waitForTimeout(500)
    await noteTheGame()
    const before = await textOf("Solitaire.spellml")
    await page.locator("#AddPartButton").click()
    await page.waitForTimeout(800)
    const row = await page.locator('.PalettePopup ui-tree-item[label="Button"]').first().boundingBox()
    // just above the board's first pile
    const stock = await page.locator(".AppPaneBody solitaire-stock-pile").first().boundingBox()
    await drag(row!.x + 40, row!.y + 10, stock!.x + 40, stock!.y - 4)
    const after = await textOf("Solitaire.spellml")
    expect(after).not.toBe(before)
    await expectGameKept()
    expect(await page.locator(".AppPaneBody ui-button").count()).toBeGreaterThan(0)
  })

  test("the game plays on, on the same cards", async () => {
    await page.locator(".InspectAppButton").first().click()
    await page.waitForTimeout(300)
    const facts = await page.evaluate(() => {
      const card = document.querySelector(".AppPaneBody solitaire-tableau solitaire-card") as HTMLElement & {
        thing: Record<string, unknown>
      }
      const pile = card.parentElement as HTMLElement & { thing: object }
      const app = document.querySelector(".AppPaneBody solitaire-app") as HTMLElement & {
        thing: Record<string, unknown>
      }
      app.thing.score = 7
      return { holdsIt: card.thing.pile === pile.thing, stock: !!app.thing.stock, type: card.thing.constructor.name }
    })
    expect(facts).toEqual({ holdsIt: true, stock: true, type: "Card" })
    const discards = () => page.locator(".AppPaneBody solitaire-discard-pile solitaire-card").count()
    const before = await discards()
    const stock = await page.locator(".AppPaneBody solitaire-stock-pile").first().boundingBox()
    await page.mouse.click(stock!.x + stock!.width / 2, stock!.y + stock!.height / 2)
    await page.waitForTimeout(800)
    expect(await discards()).toBe(before + 1)
    await page.waitForTimeout(500)
  })

  test("a drawing changed in the code draws again, on the same elements", async () => {
    await noteTheGame()
    await edit("Card.spellml", '<text color="blue">', '<text color="red">')
    await expectGameKept()
    const backs = await page.evaluate(() => {
      const card = document.querySelector(".AppPaneBody solitaire-stock-pile solitaire-card")!
      const shadow = card.shadowRoot!
      return {
        red: shadow.querySelectorAll('[color="red"]').length,
        blue: shadow.querySelectorAll('[color="blue"]').length
      }
    })
    expect(backs.blue).toBe(0)
    expect(backs.red).toBeGreaterThan(0)
  })

  test("a method's body changed draws nothing, and is used next time", async () => {
    await noteTheGame()
    await page.evaluate(() => {
      const card = document.querySelector(".AppPaneBody solitaire-stock-pile solitaire-card")!
      ;(window as unknown as { inner: unknown }).inner = card.shadowRoot!.querySelector("[color]")
    })
    await edit("Solitaire.spellml", "pause for 300 msec", "pause for 200 msec")
    await expectGameKept()
    const isSame = await page.evaluate(() => {
      const card = document.querySelector(".AppPaneBody solitaire-stock-pile solitaire-card")!
      return (window as unknown as { inner: unknown }).inner === card.shadowRoot!.querySelector("[color]")
    })
    expect(isSame).toBe(true)
    const code = await page.evaluate(() => {
      const app = document.querySelector(".AppPaneBody solitaire-app") as HTMLElement & {
        thing: { playFromTheStock(): void }
      }
      return String(app.thing.playFromTheStock)
    })
    expect(code).toContain("200")
  })

  test("a new type says it takes effect on restart, and the game goes on until then", async () => {
    await noteTheGame()
    const before = await textOf("Pile.spellml")
    await edit("Pile.spellml", /$/, '\n<spell-view "extra part"></spell-view>\n')
    await page.waitForSelector(".RestartNeeded ui-message", { timeout: 10_000 })
    await expectGameKept()
    // taken back:  nothing's waiting
    await edit("Pile.spellml", /[^]*/, before)
    expect(await page.locator(".RestartNeeded ui-message").count()).toBe(0)
    await expectGameKept()
    await edit("Pile.spellml", /$/, '\n<spell-view "extra part"></spell-view>\n')
    await page.locator(".RestartNeeded ui-button").click()
    await page.waitForTimeout(SETTLE_MS)
    expect(await page.locator(".RestartNeeded ui-message").count()).toBe(0)
    expect((await whatsKept()).sameCards).toBe(0)
  })

  test("real typing in a drawing keeps the page:  Counter", async () => {
    const counting = await context.newPage()
    await counting.goto(`${EDITOR}edit/@spell/examples/Counter`, { timeout: 60_000 })
    await counting.waitForSelector(".InputEditor .monaco-editor .view-line", { timeout: 60_000 })
    await counting.waitForTimeout(3000)
    const button = counting.locator(".AppPaneBody ui-button").first()
    for (let click = 0; click < 3; click++) await button.click()
    await counting.waitForTimeout(300)
    await counting.evaluate(() => {
      const shown = document.querySelector(".AppPaneBody")!
      const view = [...shown.querySelectorAll("*")].find((element) => element.shadowRoot?.querySelector("ui-button"))!
      ;(window as unknown as { view: Element }).view = view
    })
    const line = counting.locator('.InputEditor .view-line:has-text("Clicked")').first()
    await line.click()
    await counting.evaluate(() => {
      const code = (
        window as unknown as {
          editor: {
            shownCodeEditor: { getValue(): string; setPosition(place: { lineNumber: number; column: number }): void }
          }
        }
      ).editor.shownCodeEditor
      const lines = code.getValue().split("\n")
      const at = lines.findIndex((each) => each.includes(" times</ui-button>"))
      code.setPosition({ lineNumber: at + 1, column: lines[at]!.indexOf("</ui-button>") + 1 })
    })
    await counting.keyboard.type(" now")
    // compiled at once, rather than ten seconds after typing stops
    await counting.keyboard.press("ControlOrMeta+Enter")
    await counting.waitForTimeout(SETTLE_MS)
    const shown = await counting.evaluate(() => {
      const { view } = window as unknown as { view: Element & { thing: { count: number } } }
      return {
        isConnected: view.isConnected,
        count: view.thing.count,
        label: view.shadowRoot!.querySelector("ui-button")!.textContent
      }
    })
    expect(shown).toEqual({ isConnected: true, count: 3, label: "Clicked 3 times now" })
    await counting.close()
  })
})
