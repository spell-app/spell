import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"

/**
 * Anatomy (epic `editor` P34):  Solitaire's running app pulled apart into floors, in the editor, shown in Debug
 * (the Program panel open, the Inspector open).
 * - Each view is a floor over the view that holds it, lifted by the spacing:  nested as the Views tree is.
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
  AppAnatomy: { show(): void; hide(): void; spacing: number; isShowing: boolean; focus?: Element }
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

  test("each view is a floor over the view holding it, tagged with its type;  a click selects;  off puts it back", async () => {
    const before = await stylesNow()
    await page.locator(".AnatomyButton [part~=item]").first().click()
    await page.waitForTimeout(1200)

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

    // a click on the top card of the last column's floor selects that card
    const card = (await page.evaluate(() => {
      const columns = document.querySelectorAll("solitaire-column")
      const top = [...columns[columns.length - 1]!.children].at(-1)!
      const box = top.getBoundingClientRect()
      return { id: top.id, x: box.x + box.width / 2, y: box.y + box.height * 0.75 }
    })) as Spot
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
    const again = (await page.evaluate((id) => {
      const box = document.getElementById(id)!.getBoundingClientRect()
      return { id, x: box.x + box.width / 2, y: box.y + box.height * 0.75 }
    }, card.id)) as Spot
    await page.mouse.dblclick(again.x, again.y)
    await page.waitForTimeout(600)
    const focused = await page.evaluate(() => {
      return (window as unknown as TestWindow).AppAnatomy.focus?.id
    })
    expect(focused).toBe(card.id)
    await page.keyboard.press("Escape")
    await page.waitForTimeout(400)
    expect(await page.evaluate(() => (window as unknown as TestWindow).AppAnatomy.focus?.id)).toBe(undefined)

    // off:  every element as it was
    await page.locator(".AnatomyButton [part~=item]").first().click()
    await page.waitForTimeout(800)
    expect(await stylesNow()).toEqual(before)
    expect(warnings).toEqual([])
  })
})
