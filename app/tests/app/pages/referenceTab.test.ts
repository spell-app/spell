import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { CodeEditor, EDITOR, SERVING } from "./runningEditor"

/**
 * The Inspector's Views card has a Reference tab (epic `editor` T104):  `<SpellReference>`, laid out for the column.
 * - Owen:  "Add it as another tab in the same panel as `Views`".
 * - A thing a property holds reads `Deck "deck"`, a thing's cube its icon;  with no comment of its own, its
 *   description is its type's:  `a Deck of playing cards named "deck"`.
 * - The app's templates in program order, not by name;  an action's icon a circled play, a test's a vial.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** Solitaire, in the editor. */
const SOLITAIRE = `${EDITOR}edit/@spell/examples/Solitaire`

/** The page's debug globals, what's used of them. */
type DebugGlobals = { Inspector: { toggle(): void } }

/** A row of the reference:  its icon, words and muted words. */
type Row = { icon: string; label: string; which: string }

/** Open the Inspector, if it isn't, and show its Views card's Reference tab. */
async function showReference(page: Page): Promise<void> {
  if (!(await page.locator(".InspectorCard[data-panel=views]").count())) {
    await page.evaluate(() => (window as unknown as DebugGlobals).Inspector.toggle())
  }
  await page.locator('.ViewsTab[data-tab="reference"]').click()
  await page.locator(".InspectorCard[data-panel=views] .SpellReference.stacked").waitFor({ timeout: 20_000 })
}

/** The rows under the reference's row labelled `label` (`This app`, `Solitaire`), each as it shows. */
function rowsUnder(page: Page, label: string): Promise<Row[]> {
  return page.evaluate((label) => {
    const parent = [...document.querySelectorAll(".InspectorCard .SpellReference ui-tree-item")].find(
      (row) => row.getAttribute("label") === label
    )
    return [...(parent?.children ?? [])]
      .filter((row) => row.localName === "ui-tree-item")
      .map((row) => ({
        icon: row.getAttribute("icon") ?? "",
        label: row.getAttribute("label") ?? "",
        which: row.getAttribute("which") ?? ""
      }))
  }, label)
}

describe.skipIf(!SERVING)("the Views card's Reference tab", { timeout: 120_000 }, () => {
  let browser: Browser
  let page: Page

  beforeAll(async () => {
    browser = await chromium.launch()
    page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
    await page.goto(SOLITAIRE, { timeout: 60_000 })
    await new CodeEditor(page).shown()
    await page.waitForTimeout(3000)
    await showReference(page)
  }, 120_000)

  afterAll(async () => {
    // the next test file opens on Views, as Owen left it
    await page?.locator('.ViewsTab[data-tab="views"]').click()
    await browser?.close()
  })

  test("lists the app's templates in program order", async () => {
    const templates = (await rowsUnder(page, "This app")).filter((row) => row.icon === "cube").map((row) => row.label)
    // Card.spell, Pile.spell, Deck.spell, then Solitaire.spell:  the project's files in order
    expect(templates.indexOf("Card")).toBeLessThan(templates.indexOf("Pile"))
    expect(templates.indexOf("Pile")).toBeLessThan(templates.indexOf("Deck"))
    expect(templates.indexOf("Deck")).toBeLessThan(templates.indexOf("Solitaire"))
  })

  test("names a thing a property holds by its type, then its name, with a thing's icon", async () => {
    const members = await rowsUnder(page, "Solitaire")
    expect(members).toContainEqual({ icon: "cube", label: "Deck", which: '"deck"' })
    expect(members).toContainEqual({ icon: "cube", label: "Stock Pile", which: '"stock"' })
    // a value isn't a thing
    expect(members).toContainEqual({ icon: "tag", label: "score", which: "number" })
  })

  test("gives an action a circled play, and a test a vial", async () => {
    const members = await rowsUnder(page, "Solitaire")
    expect(members.find((row) => row.label === "draw solitaire")?.icon).toBe("fa7-free:circle-play")
    const app = await rowsUnder(page, "This app")
    expect(app.find((row) => row.label === "test a new deck")?.icon).toBe("fa7-free:vial-circle-check")
    // the app itself, a top-level thing:  its type, then its name
    expect(app).toContainEqual({ icon: "cube", label: "Solitaire", which: '"solitaire"' })
  })

  test("says what a held thing is from its type, in the header and under it", async () => {
    await page.evaluate(() => {
      const row = [...document.querySelectorAll(".InspectorCard .SpellReference ui-tree-item")].find(
        (each) => each.getAttribute("label") === "Deck" && each.getAttribute("which") === '"deck"'
      ) as HTMLElement
      row.scrollIntoView()
      row.shadowRoot!.querySelector<HTMLElement>(".words")!.click()
    })
    const details = page.locator(".InspectorCard .ReferenceDetails")
    await expect.poll(() => details.locator("h4").textContent(), { timeout: 8000 }).toMatch(/Deck\s*"deck"/)
    await expect.poll(() => details.textContent(), { timeout: 8000 }).toContain('a Deck of playing cards named "deck"')
  })
})
