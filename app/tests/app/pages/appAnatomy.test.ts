import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"

/**
 * Anatomy (epic `editor` P34):  Solitaire's running app pulled apart into floors, in the editor, shown in Debug
 * (the Program panel open, the Inspector open).
 * - It opens face on, then turns to its resting angle a second later (I256).
 * - Each view is a floor over the view that holds it, lifted by the spacing:  nested as the Views tree is.
 * - The cards of a pile step up one by one, each over the one under it (I256).
 * - Each floor has its type's tag over it.
 * - A click on a card's floor selects that card:  the Inspector's selection and the tree's row.
 * - Turned off, every style it set is put back:  the app's elements are as they were.
 * - The console has no Solid warning of Anatomy's.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** Where an element is on the page, and which it is. */
type Spot = { id: string; x: number; y: number }

/** The page's globals the tests reach. */
type TestWindow = Window & {
  AppAnatomy: {
    show(): void
    hide(): void
    spacing: number
    isShowing: boolean
    focus?: Element
    view: { tilt: number; spin: number; zoom: number }
  }
  Inspector: { selected?: { element: Element }; area?: HTMLElement }
}

describe.skipIf(!SERVING)("Anatomy, over Solitaire", { timeout: 180_000 }, () => {
  let browser: Browser
  let page: Page
  const warnings: string[] = []

  beforeAll(async () => {
    browser = await chromium.launch()
    page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
    // Debug:  the Program panel under the code, and the Inspector open
    await page.addInitScript(() => {
      localStorage.setItem("spellEditor:programPanel", "true")
      localStorage.setItem("spellEditor:inspector", "true")
    })
    page.on("console", (message) => {
      if (/warn|error/.test(message.type()) && /Anatomy|\[[A-Z_]{8,}\]/.test(message.text()))
        warnings.push(message.text())
    })
    await page.goto(`${EDITOR}edit/@spell/examples/Solitaire`, { timeout: 60_000 })
    await page.waitForSelector("solitaire-card", { timeout: 60_000 })
    await page.waitForTimeout(4000)
  })
  afterAll(async () => {
    await browser?.close()
  })

  /** Every element's `style` attribute in the app pane, through its shadow roots, in document order. */
  const stylesNow = () =>
    page.evaluate(() => {
      const styles: string[] = []
      const walk = (root: ParentNode) => {
        for (const element of root.querySelectorAll("*")) {
          styles.push(`${element.localName}#${element.id}:${element.getAttribute("style") ?? ""}`)
          if (element.shadowRoot) walk(element.shadowRoot)
        }
      }
      walk(document.querySelector(".AppPaneProgram")!)
      return styles
    })

  /**
   * A spot on the card `id`, on the card's own floor:  where neither of its pictures, floors over it, covers it.
   * - Searched from its bottom right, through the shadow roots under the pointer.
   */
  const spotOnCard = (id: string) =>
    page.evaluate((cardId): Spot => {
      const card = document.getElementById(cardId)!
      const box = card.getBoundingClientRect()
      // the element drawn at (x, y), down through shadow roots
      const deepest = (x: number, y: number) => {
        let found = document.elementFromPoint(x, y)
        for (let inside = found?.shadowRoot?.elementFromPoint(x, y); inside && inside !== found;) {
          found = inside
          inside = found.shadowRoot?.elementFromPoint(x, y)
        }
        return found
      }
      // what holds `element`, through shadow roots, itself first
      const holders = (element: Element | null) => {
        const all: Element[] = []
        for (let node = element; node; node = node.parentElement ?? ((node.getRootNode() as ShadowRoot).host || null))
          all.push(node)
        return all
      }
      for (let across = 0.95; across > 0; across -= 0.05) {
        for (let down = 0.95; down > 0; down -= 0.05) {
          const [x, y] = [box.x + box.width * across, box.y + box.height * down]
          const held = holders(deepest(x, y))
          if (held.includes(card) && !held.some((each) => each.localName === "solitaire-card-image"))
            return { id: cardId, x, y }
        }
      }
      throw new Error(`spotOnCard():  every spot on ${cardId} is under its pictures`)
    }, id)

  test("each view is a floor over the view holding it, tagged with its type;  a click selects;  off puts it back", async () => {
    const before = await stylesNow()
    await page.locator(".AnatomyButton [part~=item]").first().click()
    const turn = () => page.evaluate(() => (window as unknown as TestWindow).AppAnatomy.view)

    // face on at first, then turned to its resting angle once it's waited a second and turned
    expect(await turn()).toMatchObject({ tilt: 0, spin: 0 })
    await page.waitForTimeout(2500)
    const resting = await turn()
    expect(resting.tilt).not.toBe(0)
    expect(resting.spin).not.toBe(0)
    await page.waitForTimeout(300)
    expect(await turn()).toEqual(resting)

    // nested as the tree is:  the app flat, each pile lifted over it, each card over its pile, by the spacing
    const lifts = await page.evaluate(() => {
      const { AppAnatomy } = window as unknown as TestWindow
      const lift = (element: Element | null) => (element as HTMLElement | null)?.style.translate ?? ""
      const app = document.querySelector("solitaire-app")
      const column = document.querySelector("solitaire-column")
      return {
        spacing: AppAnatomy.spacing,
        app: lift(app),
        column: lift(column),
        card: lift(column!.querySelector("solitaire-card")),
        tags: [...document.querySelectorAll(".AnatomyTags .AnatomyTag")].map((tag) => tag.textContent ?? "")
      }
    })
    expect(lifts.app).toBe("")
    expect(lifts.column).toBe(`0px 0px ${lifts.spacing}px`)
    expect(lifts.card).toBe(`0px 0px ${lifts.spacing}px`)
    expect(lifts.tags).toEqual(expect.arrayContaining(["Solitaire", "Column", "Card"]))

    // each column's cards step up one by one:  every card higher than the one under it
    const piles = await page.evaluate(() =>
      [...document.querySelectorAll("solitaire-column")].map((column) =>
        [...column.querySelectorAll(":scope > solitaire-card")].map((card) =>
          Number.parseFloat((card as HTMLElement).style.translate.split(" ")[2] ?? "0")
        )
      )
    )
    expect(piles.some((pile) => pile.length > 1)).toBe(true)
    for (const pile of piles) for (let at = 1; at < pile.length; at++) expect(pile[at]).toBeGreaterThan(pile[at - 1]!)

    // a click on the top card of the last column's floor selects that card
    const topCard = await page.evaluate(
      () => [...document.querySelectorAll("solitaire-column")].at(-1)!.lastElementChild!.id
    )
    const card = await spotOnCard(topCard)
    await page.mouse.move(card.x, card.y)
    await page.mouse.click(card.x, card.y)
    await page.waitForTimeout(800)
    const selected = await page.evaluate(() => (window as unknown as TestWindow).Inspector.selected?.element.id)
    expect(selected).toBe(card.id)
    // the Views tree's row for it:  selected
    const row = await page.evaluate(() =>
      [...document.querySelectorAll(".InspectorViews ui-tree-item")].some(
        (item) => (item as Element & { selected?: boolean }).selected === true
      )
    )
    expect(row).toBe(true)

    // a double-click shows that card's floor alone:  the rest hidden;  Esc goes back to the whole app
    const again = await spotOnCard(card.id)
    await page.mouse.dblclick(again.x, again.y)
    await page.waitForTimeout(600)
    const focused = await page.evaluate(() => {
      return (window as unknown as TestWindow).AppAnatomy.focus?.id
    })
    expect(focused).toBe(card.id)
    await page.keyboard.press("Escape")
    await page.waitForTimeout(400)
    expect(await page.evaluate(() => (window as unknown as TestWindow).AppAnatomy.focus?.id)).toBe(undefined)

    // a click on a foundation's layer picks the foundation, though its picture covers it;  again, the picture (I259)
    const foundation = await page.evaluate(() => {
      const box = document.querySelectorAll("solitaire-foundation")[1]!.getBoundingClientRect()
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    })
    const selectedTag = () =>
      page.evaluate(() => (window as unknown as TestWindow).Inspector.selected?.element.localName)
    await page.mouse.click(foundation.x, foundation.y)
    await page.waitForTimeout(800)
    expect(await selectedTag()).toBe("solitaire-foundation")
    await page.mouse.click(foundation.x, foundation.y)
    await page.waitForTimeout(800)
    expect(await selectedTag()).toBe("solitaire-card-image")

    // Play:  a click goes to the game, so it never picks the foundation, as Inspect would now (T117)
    await page.locator(".AnatomyClicks ui-item[value=play] [part~=item]").click()
    await page.waitForTimeout(300)
    await page.mouse.click(foundation.x, foundation.y)
    await page.waitForTimeout(800)
    expect(await selectedTag()).not.toBe("solitaire-foundation")
    await page.locator(".AnatomyClicks ui-item[value=inspect] [part~=item]").click()
    await page.waitForTimeout(300)

    // off:  every element as it was
    await page.locator(".AnatomyButton [part~=item]").first().click()
    await page.waitForTimeout(800)
    expect(await stylesNow()).toEqual(before)
    expect(warnings).toEqual([])
  })
})
