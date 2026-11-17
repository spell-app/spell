import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { CodeEditor, EDITOR, SERVING } from "./runningEditor"

/**
 * The Program panel's Spell Reference tab (epic `editor` T104, T105, T109, T110):  `<SpellReference>`, tree and details
 * side by side, the search at the top of the right column.
 * - Owen:  "Remove `Reference` from the Compiled code pane -- it's also too narrow.  Leave it in the bottom bar."
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

/** Show the Program panel's Spell Reference tab, opening the panel (View › Program Panel) if it isn't. */
async function showReference(page: Page): Promise<void> {
  if (!(await page.locator(".ProgramPanel").count())) await toggleProgramPanel(page)
  await page.locator('.ProgramPanel [data-tab="reference"]').first().click()
  await page.locator(".ProgramPanel .SpellReference").waitFor({ timeout: 20_000 })
}

/** View › Program Panel:  shows the panel, or hides it. */
async function toggleProgramPanel(page: Page): Promise<void> {
  await page.getByText("View", { exact: true }).first().click()
  await page.waitForTimeout(500)
  await page.getByText("Program Panel", { exact: true }).first().click()
  await page.waitForTimeout(1500)
}

/** The rows under the reference's row labelled `label` (`This app`, `Solitaire`), each as it shows. */
function rowsUnder(page: Page, label: string): Promise<Row[]> {
  return page.evaluate((label) => {
    const parent = [...document.querySelectorAll(".ProgramPanel .SpellReference ui-tree-item")].find(
      // a template's row, not a member named after its type (Card's `pile` reads `Pile "pile"`)
      (row) => row.getAttribute("label") === label && !row.getAttribute("which")?.startsWith('"')
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
    // the next test file opens with no Program panel, as Owen left it
    if (page) await toggleProgramPanel(page)
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
      row.icon === "fa7-free:vial-circle-check" ? "test" : row.icon === "fa7-free:t" ? "constant" : "other"
    )
    expect(kinds.join(" ")).toMatch(/^(other )+(test )+(constant ?)+$/)
    const counts = await page.evaluate(() =>
      [...document.querySelectorAll(".ProgramPanel .SpellReference ui-tree-item[group]")].map((row) =>
        row.getAttribute("which")
      )
    )
    expect(counts.every((which) => !which)).toBe(true)
  })

  test("is titled Spell Reference, and isn't in the compiled code's tabs", async () => {
    expect(await page.locator('.ProgramPanel [data-tab="reference"]').first().textContent()).toContain(
      "Spell Reference"
    )
    await page.locator(".ModeTabs .CompiledCodeToggle [part~=item]").first().click()
    await page.locator(".CodeOutputPane").waitFor({ timeout: 10_000 })
    expect(await page.locator(".CodeOutputPane .SpellReference, .CodeOutputPane [data-tab=reference]").count()).toBe(0)
    await page.locator(".ModeTabs .CompiledCodeToggle [part~=item]").first().click()
  })

  test("gives a constant, a word that's its own text, the text icon", async () => {
    const pile = await rowsUnder(page, "Pile")
    expect(pile.filter((row) => ["stacked", "vertical"].includes(row.label)).map((row) => row.icon)).toEqual([
      "fa7-free:t",
      "fa7-free:t"
    ])
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
        search: box(".ProgramPanel .ReferenceDetails > .ReferenceSearch"),
        details: box(".ProgramPanel .ReferenceDetails"),
        tree: box(".ProgramPanel .SpellReference > ui-tree")
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
      const row = [...document.querySelectorAll(".ProgramPanel .SpellReference ui-tree-item")].find(
        (each) => each.getAttribute("label") === "Deck" && each.getAttribute("which") === '"deck"'
      ) as HTMLElement
      row.scrollIntoView()
      row.shadowRoot!.querySelector<HTMLElement>(".words")!.click()
    })
    const details = page.locator(".ProgramPanel .ReferenceDetails")
    await expect.poll(() => details.locator("h4").textContent(), { timeout: 8000 }).toMatch(/Deck\s*"deck"/)
    await expect.poll(() => details.textContent(), { timeout: 8000 }).toContain('a Deck of playing cards named "deck"')
  })
})
