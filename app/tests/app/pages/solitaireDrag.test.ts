import { chromium, devices, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"

/**
 * A card dragged onto a pile lands there, in the editor:  Solitaire's ace onto its empty foundation (epic `editor`, I20).
 * - The editor's layout runs on a copy of the runtime of its own, beside the program's:
 *   each copy's rule for what takes a drop must hold for its own elements (`Dragging.addDropRule()`).
 * - A real mouse drag, in Run and in Edit.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 */

/** How many deals to look through for a face-up ace on top of a pile:  about half have one. */
const MOST_DEALS = 15

/** Where a card or pile is on the page, and what it is. */
type Spot = { rank?: string; suit: string; count?: number; x: number; y: number }

describe.skipIf(!SERVING)("dragging a card in Solitaire", { timeout: 240_000 }, () => {
  let browser: Browser
  let page: Page

  beforeAll(async () => {
    browser = await chromium.launch()
    page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
  })
  afterAll(async () => {
    await browser?.close()
  })

  /** A face-up ace, last on a pile that isn't a foundation, and the foundations:  `undefined` if this deal has none. */
  const findAnAce = () =>
    page.evaluate(() => {
      // the thing each draws, as `SpellElement.thingOf()` reads it:  a pile drawn by its id alone (`<column "C1"/>`)
      // finds its pile by that id, and is never handed it, so its `thing` property is empty
      const thingOf = (element: Element): any => (element as Element & { component?: any }).component?.currentThing
      const elements: Element[] = []
      const walk = (root: Document | ShadowRoot) => {
        for (const element of root.querySelectorAll("*")) {
          elements.push(element)
          if (element.shadowRoot) walk(element.shadowRoot)
        }
      }
      walk(document)
      const spot = (element: Element) => {
        const box = element.getBoundingClientRect()
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
      }
      const ace = elements.find((element) => {
        const { tagName } = element
        const thing = thingOf(element)
        if (tagName !== "SOLITAIRE-CARD" || String(thing?.rank) !== "ace") return false
        const pile = thing.pile
        return (
          String(thing.shorthand).includes("↑") &&
          pile?.lastItem === thing &&
          !/Foundation|StockPile/.test(pile.constructor.name)
        )
      })
      const foundations = elements
        .filter(({ tagName }) => tagName === "SOLITAIRE-FOUNDATION")
        .map((element) => ({
          suit: String(thingOf(element)?.suit),
          count: thingOf(element)?.items.length,
          ...spot(element)
        }))
      return ace ? { ace: { rank: "ace", suit: String(thingOf(ace).suit), ...spot(ace) }, foundations } : undefined
    })

  /** Drag from `from` to `to` with the mouse, in steps, as a person would. */
  async function drag(from: Spot, to: Spot) {
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    for (let step = 1; step <= 20; step++) {
      await page.mouse.move(from.x + ((to.x - from.x) * step) / 20, from.y + ((to.y - from.y) * step) / 20)
      await page.waitForTimeout(20)
    }
    await page.mouse.up()
    await page.waitForTimeout(1200)
  }

  for (const mode of ["run", "edit"]) {
    test(`an ace dragged to its empty foundation lands there:  ${mode}`, async () => {
      let found: Awaited<ReturnType<typeof findAnAce>>
      for (let deal = 0; deal < MOST_DEALS && !found; deal++) {
        await page.goto(`${EDITOR}${mode}/@spell/examples/Solitaire`, { timeout: 60_000 })
        await page.waitForSelector("solitaire-card", { timeout: 60_000 })
        await page.waitForTimeout(deal ? 3000 : 6000)
        found = await findAnAce()
      }
      expect(found, `no face-up ace in ${MOST_DEALS} deals`).toBeDefined()
      const { ace, foundations } = found!
      const foundation = foundations.find(({ suit }) => suit === ace.suit)!
      expect(foundation.count).toBe(0)
      await drag(ace, foundation)
      const after = (await page.evaluate(() => {
        const counts: Record<string, number> = {}
        const thingOf = (element: Element): any => (element as Element & { component?: any }).component?.currentThing
        const walk = (root: Document | ShadowRoot) => {
          for (const element of root.querySelectorAll("*")) {
            if (element.tagName === "SOLITAIRE-FOUNDATION")
              counts[String(thingOf(element).suit)] = thingOf(element).items.length
            if (element.shadowRoot) walk(element.shadowRoot)
          }
        }
        walk(document)
        return counts
      })) as Record<string, number>
      expect(after[ace.suit]).toBe(1)
    })
  }
})

/**
 * A finger dragging a card on a phone moves the card, not the page (epic `language` T157):
 * the page is made long, as spell.app's is, so a finger could scroll it.
 * - Chrome loses the card's `touch-action: none` over its letter, slotted text in a `<ui-text>`:
 *   `Dragging` stops the browser's scrolling itself while a finger presses a draggable thing.
 * - And a finger on the felt still scrolls the page.
 * - Real touches, through the browser's own input (`Input.dispatchTouchEvent`), so the browser decides to scroll.
 */
describe.skipIf(!SERVING)("dragging a card in Solitaire with a finger, on a phone", { timeout: 120_000 }, () => {
  let browser: Browser
  let page: Page
  let swipe: (from: { x: number; y: number }, by: number) => Promise<void>

  beforeAll(async () => {
    browser = await chromium.launch()
    const context = await browser.newContext({ ...devices["iPhone 13"] })
    page = await context.newPage()
    const cdp = await context.newCDPSession(page)
    const touch = (type: "touchStart" | "touchMove" | "touchEnd", x = 0, y = 0) =>
      cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] })
    swipe = async ({ x, y }, by) => {
      await touch("touchStart", x, y)
      for (let step = 1; step <= 10; step++) {
        await touch("touchMove", x, y - (by * step) / 10)
        await page.waitForTimeout(16)
      }
      await touch("touchEnd")
      await page.waitForTimeout(500)
    }
    await page.goto(`${EDITOR}run/@spell/examples/Solitaire`, { timeout: 60_000 })
    await page.waitForSelector("solitaire-card", { timeout: 60_000 })
    await page.waitForTimeout(6000)
    await page.evaluate(() => {
      document.body.style.height = "auto"
      document.body.style.paddingBottom = "3000px"
    })
    // loading the editor and dealing take longer than a hook's usual 10s
  }, 90_000)
  afterAll(async () => {
    await browser?.close()
  })

  /** Where to press:  the last face-up card that can be dragged, or the felt below the cards. */
  const spotOf = (what: "card" | "felt") =>
    page.evaluate((what) => {
      const elements: Element[] = []
      const walk = (root: Document | ShadowRoot) => {
        for (const element of root.querySelectorAll("*")) {
          elements.push(element)
          if (element.shadowRoot) walk(element.shadowRoot)
        }
      }
      walk(document)
      if (what === "felt") {
        const box = elements.find(({ localName }) => localName === "solitaire-app")!.getBoundingClientRect()
        return { x: box.x + box.width / 2, y: Math.min(box.bottom, innerHeight) - 20 }
      }
      const card = elements.filter((element) => element.matches("solitaire-column > :state(draggable)")).at(-1)!
      ;(globalThis as { pressed?: Element }).pressed = card
      const box = card.getBoundingClientRect()
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    }, what)

  test("the card follows the finger, and the page stays put", async () => {
    await page.evaluate(() => scrollTo(0, 0))
    const card = await spotOf("card")
    // read where the card is mid-drag:  it slides back once let go, nobody taking it
    const watching = page.evaluate(
      () =>
        new Promise<string>((done) => {
          const pressed = (globalThis as { pressed?: HTMLElement }).pressed!
          const watch = () => (pressed.style.translate ? done(pressed.style.translate) : requestAnimationFrame(watch))
          watch()
        })
    )
    await swipe(card, 150)
    expect(await watching).not.toBe("")
    expect(await page.evaluate(() => scrollY)).toBe(0)
  })

  test("a finger on the felt still scrolls the page", async () => {
    await page.evaluate(() => scrollTo(0, 0))
    await swipe(await spotOf("felt"), 200)
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(50)
  })
})
