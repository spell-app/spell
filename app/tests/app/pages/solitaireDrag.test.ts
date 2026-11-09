import { chromium, type Browser, type Page } from "playwright"
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
      const elements: (Element & { thing?: any })[] = []
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
      const ace = elements.find(({ tagName, thing }) => {
        if (tagName !== "SOLITAIRE-CARD" || String(thing?.rank) !== "ace") return false
        const pile = thing.pile
        return (
          String(thing.state).includes("↑") &&
          pile?.lastItem === thing &&
          !/Foundation|StockPile/.test(pile.constructor.name)
        )
      })
      const foundations = elements
        .filter(({ tagName }) => tagName === "SOLITAIRE-FOUNDATION")
        .map((element) => ({ suit: String(element.thing.suit), count: element.thing.items.length, ...spot(element) }))
      return ace ? { ace: { rank: "ace", suit: String(ace.thing.suit), ...spot(ace) }, foundations } : undefined
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
        const walk = (root: Document | ShadowRoot) => {
          for (const element of root.querySelectorAll("*") as NodeListOf<Element & { thing?: any }>) {
            if (element.tagName === "SOLITAIRE-FOUNDATION")
              counts[String(element.thing.suit)] = element.thing.items.length
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
