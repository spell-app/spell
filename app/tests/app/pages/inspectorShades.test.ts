import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { CodeEditor, EDITOR, SERVING } from "./runningEditor"

/**
 * The Inspector cards' scroll shades, on Solitaire (epic `editor` I201, I227):  each card's body darkens at an edge
 * only while there's more that way, as its panel draws them (`<ui-panel appearance="pane">`).
 * - The case I227 fixed:  a card scrolled down, then given a body that fits (the selection cleared),
 *   kept its top shade, scrolled to the top and not scrolling at all.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** What a selection's redraw takes, at most. */
const SETTLE_MS = 2500

/** The shades of each card, by its `data-panel`. */
type CardShades = Record<string, { above: boolean; below: boolean }>

describe.skipIf(!SERVING)("The Inspector cards' scroll shades", { timeout: 180_000 }, () => {
  let browser: Browser
  let page: Page

  /** Which ends of each card's body show a shade. */
  const shades = () =>
    page.evaluate(() =>
      Object.fromEntries(
        [...document.querySelectorAll<HTMLElement>("ui-panel.InspectorCard")].map((card) => [
          card.dataset.panel,
          { above: card.matches(":state(more-above)"), below: card.matches(":state(more-below)") }
        ])
      )
    ) as Promise<CardShades>

  /** Scroll the Inspector card's body to `top`. */
  const scrollInspector = (top: number) =>
    page.evaluate((top) => {
      document.querySelector(".InspectorCard[data-panel=properties] .InspectorSection")!.scrollTop = top
    }, top)

  beforeAll(async () => {
    browser = await chromium.launch()
    page = await browser.newPage({ viewport: { width: 1300, height: 800 } })
    await page.goto(`${EDITOR}edit/@spell/examples/Solitaire`, { timeout: 60_000 })
    await new CodeEditor(page).shown()
    await page.waitForTimeout(3000)
    if (!(await page.evaluate(() => !!document.querySelector(".InspectAppButton.inspecting")))) {
      await page.locator(".InspectAppButton [part~=item]").first().click({ force: true })
    }
    await page.waitForTimeout(1500)
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
  })

  test("nothing selected:  the Inspector card's short body has no shade", async () => {
    await expect.poll(async () => (await shades()).properties).toEqual({ above: false, below: false })
  })

  test("a card selected:  shade below at the top, both once scrolled, none after the selection's cleared", async () => {
    await page.evaluate(() => {
      const cards: Element[] = []
      const walk = (root: ParentNode) => {
        for (const element of root.querySelectorAll("*")) {
          if (element.localName === "solitaire-card") cards.push(element)
          if (element.shadowRoot) walk(element.shadowRoot)
        }
      }
      walk(document)
      const card = cards.find((card) => card.getBoundingClientRect().width > 10)!
      ;(window as unknown as { Inspector: { select(element: Element): void } }).Inspector.select(card)
    })
    await page.waitForTimeout(SETTLE_MS)
    await expect.poll(async () => (await shades()).properties).toEqual({ above: false, below: true })
    await scrollInspector(200)
    await expect.poll(async () => (await shades()).properties).toEqual({ above: true, below: true })
    // I227:  the body shrinks under the scroll, with no scroll event
    await page.evaluate(() =>
      (window as unknown as { Inspector: { select(element: Element | undefined): void } }).Inspector.select(undefined)
    )
    await expect.poll(async () => (await shades()).properties).toEqual({ above: false, below: false })
  })
})
