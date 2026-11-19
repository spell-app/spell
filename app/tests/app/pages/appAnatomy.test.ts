import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"

/**
 * Anatomy (epic `editor` P34):  Solitaire's running app pulled apart into floors, in the editor, shown in Debug
 * (the Program panel open, the Inspector open).
 * - It opens face on, then turns to its resting angle half a second later (I256, T118);
 *   once it rests, a drag turns it (I262).
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
    toggleFullWindow(): void
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

  /**
   * A spot well inside what shows of `selector`'s element on screen, over its floors:  the hit with most hits round it.
   * - Not at an edge, where a pointer slipping a pixel lands on something else.
   */
  const spotIn = (selector: string) =>
    page.evaluate((within): { x: number; y: number } => {
      const element = document.querySelector(within)!
      const box = element.getBoundingClientRect()
      const holds = (found: Element | null) => {
        for (let node = found; node; node = node.parentElement ?? ((node.getRootNode() as ShadowRoot).host || null))
          if (node === element) return true
        return false
      }
      const hits: { x: number; y: number }[] = []
      for (let y = box.top + 2; y < box.bottom; y += 3) {
        for (let x = box.left + 2; x < box.right; x += 3) {
          let found = document.elementFromPoint(x, y)
          for (let inside = found?.shadowRoot?.elementFromPoint(x, y); inside && inside !== found;) {
            found = inside
            inside = found.shadowRoot?.elementFromPoint(x, y)
          }
          if (holds(found)) hits.push({ x, y })
        }
      }
      const around = (hit: { x: number; y: number }) =>
        hits.filter((other) => Math.abs(other.x - hit.x) <= 9 && Math.abs(other.y - hit.y) <= 9).length
      const best = hits.sort((one, other) => around(other) - around(one))[0]
      if (!best) throw new Error(`spotIn():  nothing of ${within} shows`)
      return best
    }, selector)

  test("each view is a floor over the view holding it, tagged with its type;  a click selects;  off puts it back", async () => {
    const before = await stylesNow()
    // the palette kept open, so its strip shows
    if (!(await page.locator(".PaletteStrip").count()))
      await page.evaluate(() => (document.querySelector(".PalettePin") as HTMLElement).click())
    await page.waitForSelector(".PaletteStrip")
    await page.locator(".AnatomyButton [part~=item]").first().click()
    // the palette's strip hidden while Anatomy shows (I263)
    await page.waitForTimeout(300)
    expect(await page.locator(".PaletteStrip").count()).toBe(0)
    const turn = () => page.evaluate(() => (window as unknown as TestWindow).AppAnatomy.view)

    // the pane fills its split pane while it shows, so the turned app is cut off only at the pane's edges (I266)
    const edges = await page.evaluate(() => {
      const body = document.querySelector(".AppPaneBody")!
      return {
        body: body.getBoundingClientRect().bottom,
        split: body.closest(".SplitPane")!.getBoundingClientRect().bottom
      }
    })
    expect(edges.body).toBeCloseTo(edges.split, 0)

    // face on at first, then turned to its resting angle once it's waited half a second and turned
    expect(await turn()).toMatchObject({ tilt: 0, spin: 0 })

    // what it shows:  Views | Named | Outlines, no Depth slider (T118, T121);  Named for the tags below
    const tabs = await page.locator(".AnatomyShows ui-item").allTextContents()
    expect(tabs.map((tab) => tab.trim())).toEqual(["Views", "Named", "Outlines"])
    await page.locator(".AnatomyShows ui-item[value=named] [part~=item]").click()
    expect(await page.locator(".AnatomyBar ui-slider").count()).toBe(1)
    await page.waitForTimeout(2500)
    const resting = await turn()
    expect(resting.tilt).not.toBe(0)
    expect(resting.spin).not.toBe(0)
    await page.waitForTimeout(300)
    expect(await turn()).toEqual(resting)

    // once it rests, a drag in Inspect turns it (I262)
    const middle = await page.evaluate(() => {
      const box = document.querySelector(".AppPaneBody")!.getBoundingClientRect()
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    })
    await page.mouse.move(middle.x, middle.y)
    await page.mouse.down()
    for (let step = 1; step <= 10; step++) await page.mouse.move(middle.x + step * 8, middle.y + step * 3)
    await page.mouse.up()
    const dragged = await turn()
    expect(dragged.spin).toBeCloseTo(resting.spin + 80 * 0.4, 0)
    expect(dragged.tilt).toBeCloseTo(resting.tilt - 30 * 0.4, 0)
    // and dragged back, it rests where it was
    const end = { x: middle.x + 80, y: middle.y + 30 }
    await page.mouse.down()
    for (let step = 1; step <= 10; step++) await page.mouse.move(end.x - step * 8, end.y - step * 3)
    await page.mouse.up()
    const back = await turn()
    expect(back.spin).toBeCloseTo(resting.spin, 0)
    expect(back.tilt).toBeCloseTo(resting.tilt, 0)

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

    // Full Window:  the turned app on the dark dim, no surface of the pane's own behind it (I263)
    await page.evaluate(() => (window as unknown as TestWindow).AppAnatomy.toggleFullWindow())
    await page.waitForTimeout(300)
    const behind = await page.evaluate(() =>
      [".AppPane.AnatomyFullWindow", ".AnatomyFullWindow > .AppPaneBody", ".AnatomyFullWindow .AppPaneProgram"].map(
        (selector) => getComputedStyle(document.querySelector(selector)!).backgroundColor
      )
    )
    // the dim:  dark in every theme, 90% opaque (T121, J234)
    expect(behind[0]).toBe("rgba(0, 0, 0, 0.9)")
    expect(behind.slice(1)).toEqual(["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0)"])
    // the bar's controls one group centred on the bar;  "Esc to close" 20px under it, yellow (T121)
    const bar = await page.evaluate(() => {
      const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect()
      const centre = (rect: DOMRect) => (rect.left + rect.right) / 2
      return {
        bar: centre(box(".AnatomyBar")),
        middle: centre(box(".AnatomyMiddle")),
        gap: box(".AnatomyEscHint").top - box(".AnatomyBar").bottom,
        hint: getComputedStyle(document.querySelector(".AnatomyEscHint")!).color
      }
    })
    expect(bar.middle).toBeCloseTo(bar.bar, 0)
    expect(bar.gap).toBeCloseTo(20, 0)
    expect(bar.hint).not.toBe("rgb(255, 255, 255)")
    await page.evaluate(() => (window as unknown as TestWindow).AppAnatomy.toggleFullWindow())
    await page.waitForTimeout(300)

    // off:  every element as it was
    await page.locator(".AnatomyButton [part~=item]").first().click()
    await page.waitForTimeout(800)
    expect(await stylesNow()).toEqual(before)
    // and the palette's strip back, without its first arrival again (I263)
    expect(await page.locator(".PaletteStrip").getAttribute("class")).toBe("PaletteStrip")
    expect(warnings).toEqual([])
  })

  test("in Play, a click on the stock deals a card, a drag off the cards turns it, and a card drags in 3D", async () => {
    const turn = () => page.evaluate(() => (window as unknown as TestWindow).AppAnatomy.view)
    await page.locator(".AnatomyButton [part~=item]").first().click()
    await page.waitForTimeout(2500)
    await page.locator(".AnatomyClicks ui-item[value=play] [part~=item]").click()
    await page.waitForTimeout(300)
    // Play:  a click on the stock deals a card, though the pointer slips a pixel or two before it lets go (I265)
    const stockCards = () =>
      page.evaluate(() => document.querySelectorAll("solitaire-stock-pile > solitaire-card").length)
    for (let deal = 0; deal < 3; deal++) {
      const stock = await spotIn("solitaire-stock-pile")
      const before = await stockCards()
      await page.mouse.move(stock.x, stock.y)
      await page.mouse.down()
      await page.mouse.move(stock.x + 2, stock.y + 1)
      await page.mouse.up()
      await page.waitForTimeout(800)
      expect(await stockCards()).toBe(before - 1)
    }

    // and a drag where the game takes no press still turns it, in Play (I264)
    const playTurn = await turn()
    const below = await page.evaluate(() => {
      const box = document.querySelector(".AppPaneBody")!.getBoundingClientRect()
      return { x: box.x + box.width / 2, y: box.bottom - 40 }
    })
    await page.mouse.move(below.x, below.y)
    await page.mouse.down()
    for (let step = 1; step <= 10; step++) await page.mouse.move(below.x + step * 6, below.y)
    await page.mouse.up()
    expect((await turn()).spin).toBeCloseTo(playTurn.spin + 60 * 0.4, 0)

    // a card dragged in Play stays under the pointer, at its depth, in the turned board's plane (T120)
    const cards = await page.evaluate(() => {
      const draggable = (element: Element) => element.matches(":state(draggable)")
      return [...document.querySelectorAll("solitaire-column, solitaire-discard-pile")]
        .map((pile) => pile.lastElementChild)
        .filter((top) => top && draggable(top))
        .map((top) => top!.id)
    })
    const centreOf = (id: string) =>
      page.evaluate((cardId) => {
        const box = document.getElementById(cardId)!.getBoundingClientRect()
        return { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 }
      }, id)
    // the first that shows:  one may be wholly under a pile lifted over it
    let card = ""
    let grab = { x: 0, y: 0 }
    for (const each of cards) {
      grab = await spotIn(`[id="${each}"]`).catch(() => grab)
      if (grab.x) {
        card = each
        break
      }
    }
    expect(card).not.toBe("")
    const held = await centreOf(card)
    await page.mouse.move(grab.x, grab.y)
    await page.mouse.down()
    for (let step = 1; step <= 10; step++) await page.mouse.move(grab.x + step * 6, grab.y + step * 3)
    const moved = await centreOf(card)
    const depth = await page.evaluate((cardId) => document.getElementById(cardId)!.style.translate.split(" ")[2], card)
    await page.mouse.move(grab.x, grab.y, { steps: 5 })
    await page.mouse.up()
    await page.waitForTimeout(600)
    expect(Math.abs(moved.x - held.x - 60)).toBeLessThan(8)
    expect(Math.abs(moved.y - held.y - 30)).toBeLessThan(8)
    expect(depth).toMatch(/px$/)

    // and dropped on a column that takes it, it moves there, when the deal has such a move
    const move = await page.evaluate(() => {
      const draggable = (element: Element) => element.matches(":state(draggable)")
      const ranks: Record<string, number> = { ace: 1, jack: 11, queen: 12, king: 13 }
      const valueOf = (id: string) => {
        const [rank = "", , suit = ""] = id.split("-")
        return { value: ranks[rank] ?? Number(rank), isRed: /hearts|diamonds/.test(suit) }
      }
      const columns = [...document.querySelectorAll("solitaire-column")]
      for (const pile of document.querySelectorAll("solitaire-column, solitaire-discard-pile")) {
        const top = pile.lastElementChild
        if (!top || !draggable(top)) continue
        for (const column of columns) {
          const onto = column.lastElementChild
          if (!onto || onto === top || !draggable(onto)) continue
          const [one, other] = [valueOf(top.id), valueOf(onto.id)]
          if (other.value === one.value + 1 && other.isRed !== one.isRed)
            return { card: top.id, onto: onto.id, to: column.id }
        }
      }
      return undefined
    })
    if (move) {
      const from = await spotIn(`[id="${move.card}"]`)
      const to = await spotIn(`[id="${move.onto}"]`)
      await page.mouse.move(from.x, from.y)
      await page.mouse.down()
      await page.mouse.move(to.x, to.y, { steps: 12 })
      await page.mouse.up()
      await page.waitForTimeout(800)
      expect(await page.evaluate((id) => document.getElementById(id)!.parentElement!.id, move.card)).toBe(move.to)
    }
    await page.locator(".AnatomyButton [part~=item]").first().click()
    await page.waitForTimeout(800)
    expect(warnings).toEqual([])
  })
})
