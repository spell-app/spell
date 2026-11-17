import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { CodeEditor, EDITOR, SERVING } from "./runningEditor"

/**
 * The compiled-code pane has a Reference tab (epic `editor` T104, T105):  `<SpellReference>`, tree and details side by side.
 * - Owen:  "it's too wide for that column ... maybe put it in the `Compiled Code` Panel?"
 * - A thing a property holds reads `Deck "deck"`, a thing's cube its icon;  with no comment of its own, its
 *   description is its type's:  `a Deck of playing cards named "deck"`.
 * - The app's templates in program order, not by name, its tests after them and its constants last;
 *   no counts on the groups' rows.  An action's icon a circled play, a test's a vial.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** Solitaire, in the editor. */
const SOLITAIRE = `${EDITOR}edit/@spell/examples/Solitaire`

/** A row of the reference:  its icon, words and muted words. */
type Row = { icon: string; label: string; which: string }

/** Open the compiled code, if it isn't, and show its Reference tab. */
async function showReference(page: Page): Promise<void> {
  if (!(await page.locator(".CodeOutputPane").count()))
    await page.locator(".ModeTabs .CompiledCodeToggle [part~=item]").first().click()
  await page.locator('.CodeOutputTab[data-tab="reference"] [part~=item]').first().click()
  await page.locator(".CodeOutputPane .SpellReference").waitFor({ timeout: 20_000 })
}

/** The rows under the reference's row labelled `label` (`This app`, `Solitaire`), each as it shows. */
function rowsUnder(page: Page, label: string): Promise<Row[]> {
  return page.evaluate((label) => {
    const parent = [...document.querySelectorAll(".CodeOutputPane .SpellReference ui-tree-item")].find(
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
    // the next test file opens with no compiled code, as Owen left it
    await page?.locator('.CodeOutputTab[data-tab="js/solid"] [part~=item]').first().click()
    await page?.locator(".ModeTabs .CompiledCodeToggle [part~=item]").first().click()
    await browser?.close()
  })

  test("lists the app's templates in program order", async () => {
    const templates = (await rowsUnder(page, "This app")).filter((row) => row.icon === "cube").map((row) => row.label)
    // Card.spell, Pile.spell, Deck.spell, then Solitaire.spell:  the project's files in order
    expect(templates.indexOf("Card")).toBeLessThan(templates.indexOf("Pile"))
    expect(templates.indexOf("Pile")).toBeLessThan(templates.indexOf("Deck"))
    expect(templates.indexOf("Deck")).toBeLessThan(templates.indexOf("Solitaire"))
  })

  test("puts the app's tests after its templates, its constants last, and counts nothing", async () => {
    const app = await rowsUnder(page, "This app")
    const kinds = app.map((row) =>
      row.icon === "fa7-free:vial-circle-check" ? "test" : row.icon === "lock" ? "constant" : "other"
    )
    expect(kinds.join(" ")).toMatch(/^(other )+(test )+(constant ?)+$/)
    const counts = await page.evaluate(() =>
      [...document.querySelectorAll(".CodeOutputPane .SpellReference ui-tree-item[group]")].map((row) =>
        row.getAttribute("which")
      )
    )
    expect(counts.every((which) => !which)).toBe(true)
  })

  test("lists Spell's own types in Owen's order", async () => {
    const spell = (await rowsUnder(page, "Spell")).map((row) => row.label)
    const named = [
      "Thing",
      "List",
      "View",
      "App",
      "TwoSidedView",
      "ViewableList",
      "Text",
      "Date",
      "Site",
      "Page",
      "PageLayout",
      "Place"
    ]
    expect(spell.slice(0, named.length)).toEqual(named)
  })

  test("puts the search at the top of the right column, the tree at the top of the left", async () => {
    const boxes = await page.evaluate(() => {
      const box = (selector: string) => {
        const { left, top } = document.querySelector(selector)!.getBoundingClientRect()
        return { left, top }
      }
      return {
        search: box(".CodeOutputPane .ReferenceDetails > .ReferenceSearch"),
        details: box(".CodeOutputPane .ReferenceDetails"),
        tree: box(".CodeOutputPane .SpellReference > ui-tree")
      }
    })
    expect(boxes.search.left).toBeGreaterThan(boxes.tree.left + 100)
    expect(boxes.search.top - boxes.details.top).toBeLessThan(20)
    expect(Math.abs(boxes.tree.top - boxes.details.top)).toBeLessThan(2)
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
      const row = [...document.querySelectorAll(".CodeOutputPane .SpellReference ui-tree-item")].find(
        (each) => each.getAttribute("label") === "Deck" && each.getAttribute("which") === '"deck"'
      ) as HTMLElement
      row.scrollIntoView()
      row.shadowRoot!.querySelector<HTMLElement>(".words")!.click()
    })
    const details = page.locator(".CodeOutputPane .ReferenceDetails")
    await expect.poll(() => details.locator("h4").textContent(), { timeout: 8000 }).toMatch(/Deck\s*"deck"/)
    await expect.poll(() => details.textContent(), { timeout: 8000 }).toContain('a Deck of playing cards named "deck"')
  })
})
