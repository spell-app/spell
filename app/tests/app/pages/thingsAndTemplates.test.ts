import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { chromium, type Browser, type BrowserContext, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

/**
 * What took over from the Things and Templates tabs, on Solitaire (epic `editor`, Rethink Things Templates):
 * - the Views card's sort, and its group of what isn't drawn
 * - This app, the app's own views, first in the add menu
 * - the Program panel's Reference tab
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
const SETTLE_MS = 2500

describe.skipIf(!SERVING)("Things and Templates, rethought", { timeout: 180_000 }, () => {
  let browser: Browser
  let context: BrowserContext
  let page: Page

  /** The labels of the board's parts in the Views tree:  the row holding all 13 piles' cells. */
  const boardRows = () =>
    page.evaluate(() => {
      const rows = [...document.querySelectorAll('[data-panel="views"] ui-tree-item')]
      const board = rows.find((row) => row.querySelectorAll(":scope > ui-tree-item").length >= 13)!
      return [...board.querySelectorAll(":scope > ui-tree-item")].map((row) => row.getAttribute("label"))
    })

  /** Choose `words` in the Views card's sort, where its menu draws them. */
  async function sortBy(words: string): Promise<void> {
    await page.locator(".ViewsSort").click()
    await page.waitForTimeout(400)
    const at = await page.evaluate((label) => {
      const find = (root: ParentNode): number[] | undefined => {
        for (const element of root.querySelectorAll("*")) {
          const box = element.getBoundingClientRect()
          if (box.width && !element.children.length && element.textContent?.trim() === label) {
            if (!element.closest(".ViewsSort ui-item")) return [box.x + box.width / 2, box.y + box.height / 2]
          }
          const inside = element.shadowRoot && find(element.shadowRoot)
          if (inside) return inside
        }
        return undefined
      }
      return find(document)
    }, words)
    await page.mouse.click(at![0]!, at![1]!)
    await page.waitForTimeout(800)
  }

  beforeAll(async () => {
    browser = await chromium.launch()
    context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await context.route(/\/api\/projects\/file\//, (route) =>
      route.request().method() === "GET"
        ? route.continue()
        : route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
    )
    page = await context.newPage()
    await page.goto(`${EDITOR}edit/@spell/examples/Solitaire`, { timeout: 60_000 })
    await page.waitForSelector("#AddPartButton", { timeout: 60_000 })
    await page.waitForTimeout(4000)
    if (!(await page.locator('[data-panel="views"]').count())) {
      await page.locator(".InspectorToggle ui-icon").first().click({ force: true })
      await page.waitForTimeout(1500)
    }
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
  })

  test("the Views card sorts by name or type, and remembers it", async () => {
    const inOrder = await boardRows()
    expect(inOrder.slice(0, 3)).toEqual(["StockPile", "DiscardPile", "Column"])
    await sortBy("By name")
    expect((await boardRows()).slice(0, 2)).toEqual(["Column", "DiscardPile"])
    await sortBy("By type")
    // Spell UI's column after the program's own elements, which all start `solitaire-`
    expect((await boardRows()).at(-1)).toBe("Column")
    await page.reload()
    await page.waitForSelector("#AddPartButton", { timeout: 60_000 })
    await page.waitForTimeout(4000)
    expect((await boardRows()).at(-1)).toBe("Column")
    await sortBy("In document order")
    expect(await boardRows()).toEqual(inOrder)
  })

  test("the deck, which isn't drawn, is in Views and shows in the Inspector", async () => {
    const notDrawn = page.locator('[data-panel="views"] ui-tree-item[group][label="Not drawn"]')
    await notDrawn.evaluate((group) => group.setAttribute("open", ""))
    await page.locator('[data-panel="views"] ui-tree-item[group] > ui-tree-item[label="Deck"]').click()
    await page.waitForTimeout(800)
    expect(await page.locator(".InspectorPane").innerText()).toContain("Its 52 items")
  })

  test("a part inspected in the app shows in Views, the rows around it opening (I18)", async () => {
    // the board's grid, closed:  the row with the most rows inside it, but for the app's own
    const grid = () =>
      [...document.querySelectorAll('[data-panel="views"] ui-tree-item')]
        .filter((row) => row.getAttribute("label") !== "Solitaire" && !row.hasAttribute("group"))
        .sort((a, b) => b.querySelectorAll("ui-tree-item").length - a.querySelectorAll("ui-tree-item").length)[0]!
    await page.evaluate(`(${grid})().shadowRoot.querySelector(".toggle").click()`)
    await page.waitForTimeout(800)
    expect(await page.evaluate(`(${grid})().hasAttribute("open")`)).toBe(false)
    const isInspecting = () => page.evaluate(() => !!document.querySelector(".InspectAppButton.inspecting"))
    if (!(await isInspecting())) await page.locator(".InspectAppButton [part~=item]").first().click({ force: true })
    await page.waitForTimeout(1500)
    // the lowest card on screen, inside that grid
    const at = await page.evaluate(() => {
      const cards: Element[] = []
      const walk = (root: ParentNode) => {
        for (const element of root.querySelectorAll("*")) {
          if (element.localName === "solitaire-card") cards.push(element)
          if (element.shadowRoot) walk(element.shadowRoot)
        }
      }
      walk(document)
      const box = cards
        .map((card) => card.getBoundingClientRect())
        .filter((box) => box.width > 10)
        .sort((a, b) => b.bottom - a.bottom)[0]!
      return [box.x + box.width / 2, box.bottom - 8]
    })
    await page.mouse.click(at[0]!, at[1]!)
    await page.waitForTimeout(1500)
    const shown = await page.evaluate(`(() => {
      const top = [...document.querySelectorAll('[data-panel="views"] ui-tree > ui-tree-item')]
      const row = [...document.querySelectorAll('[data-panel="views"] ui-tree-item[label="Card"]')].find((it) => it.selected)
      const box = row?.getBoundingClientRect()
      const view = document.querySelector(".InspectorViews").getBoundingClientRect()
      return {
        top: top.map((it) => it.getAttribute("label")),
        isOpen: (${grid})().hasAttribute("open"),
        isInView: !!box && box.top >= view.top && box.bottom <= view.bottom
      }
    })()`)
    expect(shown).toEqual({ top: ["Solitaire", "Not drawn"], isOpen: true, isInView: true })
    await page.locator(".InspectAppButton [part~=item]").first().click({ force: true })
    await page.waitForTimeout(800)
  })

  test("opening or closing Not drawn by hand keeps the Views tree where it is (I27)", async () => {
    // with a card still selected, from the test before
    const notDrawn = `document.querySelector('[data-panel="views"] ui-tree-item[group][label="Not drawn"]')`
    const scroller = `(() => {
      for (let at = ${notDrawn}.parentElement; at; at = at.parentElement) {
        if (at.scrollHeight > at.clientHeight && /auto|scroll/.test(getComputedStyle(at).overflowY)) return at
      }
    })()`
    const scrollTop = () => page.evaluate(`${scroller}.scrollTop`) as Promise<number>
    const toggle = async () => {
      await page.evaluate(`${notDrawn}.shadowRoot.querySelector(".toggle").click()`)
      await page.waitForTimeout(800)
    }
    const isOpen = () => page.evaluate(`${notDrawn}.hasAttribute("open")`) as Promise<boolean>
    for (let tries = 0; tries < 2 && (await isOpen()); tries++) await toggle()
    expect(await isOpen()).toBe(false)
    await page.evaluate(`${scroller}.scrollTop = ${scroller}.scrollHeight`)
    await page.waitForTimeout(300)
    const before = await scrollTop()
    expect(before).toBeGreaterThan(0)
    await toggle()
    expect(await page.evaluate(`${notDrawn}.hasAttribute("open")`)).toBe(true)
    expect(await scrollTop()).toBe(before)
    await toggle()
    expect(await scrollTop()).toBeLessThanOrEqual(before)
  })

  test("This app comes first in the add menu, and adds the app's own view, told what it needs to draw (T51)", async () => {
    await page.locator("#AddPartButton").click()
    await page.waitForTimeout(1500)
    const own = await page
      .locator(".PalettePopup .ThisApp ui-tree-item")
      .evaluateAll((rows) => rows.map((row) => row.getAttribute("label")))
    expect(own).toEqual(["Card", "Discard pile", "Foundation", "Joker", "Pile", "Stock pile", "Tableau"])
    const cards = () => page.evaluate(() => document.querySelectorAll("solitaire-card").length)
    const before = await cards()
    await page.locator('.PalettePopup .ThisApp ui-tree-item[label="Card"]').click()
    await page.waitForTimeout(SETTLE_MS)
    expect(await cards()).toBe(before + 1)
    const written = await page.evaluate(() =>
      (window as unknown as { project: { spellFiles: { contents: string }[] } }).project.spellFiles
        .map((file) => file.contents)
        .join("\n")
    )
    // it draws:  what a card must be told, its rank and suit, written in with the first of each (T51)
    expect(written).toContain("{draw a new card whose rank is ace and suit is clubs}")
    await page.keyboard.press("Escape")
  })

  test("All Cards edits the type:  its values as pills, its worked-out fields' Spell, its events, actions and tests as cards (I26)", async () => {
    const card = page.locator('[data-panel="views"] ui-tree-item[label^="Card"]').first()
    await card.scrollIntoViewIfNeeded()
    await card.click()
    await page.waitForTimeout(800)
    await page.locator(".InspectorScope").nth(1).click({ force: true })
    await page.waitForTimeout(1500)
    const cards = await page
      .locator(".InspectorCard")
      .evaluateAll((all) => all.map((one) => (one as HTMLElement).dataset.panel))
    expect(cards).toEqual(["properties", "events", "actions", "tests", "views"])
    // the rank's values, as its one-of writes them:  `2 ... 10` is one
    const rank = page.locator(".InspectorTypeChoices[name=rank] ui-dropdown")
    expect(await rank.evaluate((dropdown) => (dropdown as HTMLElement & { value: string[] }).value)).toEqual([
      "ace",
      "2 ... 10",
      "jack",
      "queen",
      "king"
    ])
    expect((await page.locator(".InspectorTypeSpell[name=value]").innerText()).replace(/\s+/g, " ")).toContain(
      "the position of its rank"
    )
    expect(await page.locator('[data-panel="actions"]').innerText()).toContain("count the points for")
    // a pill taken away is taken out of the one-of, as one step
    const rankLine = () =>
      page.evaluate(() =>
        (
          window as unknown as { editor: { project: { spellFiles: { path: string; contents: string }[] } } }
        ).editor.project.spellFiles
          .find((file) => file.path.endsWith("/Card.spellml"))!
          .contents.split("\n")
          .find((line) => line.includes('property "rank"'))!
      )
    await rank
      .locator(".label, ui-label")
      .filter({ hasText: "king" })
      .first()
      .locator("ui-icon, .delete, i")
      .last()
      .click({ force: true })
    await page.waitForTimeout(800)
    expect(await rankLine()).toContain('one-of="ace, 2 ... 10, jack, queen"')
    await page.keyboard.press("ControlOrMeta+z")
    await page.waitForTimeout(600)
    expect(await rankLine()).toContain('one-of="ace, 2 ... 10, jack, queen, king"')
    // the tests run on a copy of their own, and say how they went
    await page.locator(".InspectorRunTests").click({ force: true })
    await expect
      .poll(() => page.locator('[data-panel="tests"] .InspectorTestResult').first().getAttribute("name"), {
        timeout: 20_000
      })
      .toBe("check circle")
    // back to This, as the other tests expect
    await page.locator(".InspectorScope").nth(0).click({ force: true })
    await page.waitForTimeout(800)
  })

  test("the Program panel has Reference, not Things or Templates:  it finds a built-in and says what it is", async () => {
    await page.getByText("View", { exact: true }).first().click()
    await page.waitForTimeout(500)
    await page.getByText("Program Panel", { exact: true }).first().click()
    await page.waitForTimeout(1500)
    const tabs = await page
      .locator(".ProgramPanel [data-tab]")
      .evaluateAll((all) => all.map((tab) => (tab as HTMLElement).dataset.tab))
    expect(tabs).toContain("reference")
    expect(tabs).not.toContain("things")
    expect(tabs).not.toContain("templates")
    await page.locator('.ProgramPanel [data-tab="reference"]').first().click()
    await page.waitForTimeout(1500)
    const groups = await page
      .locator(".SpellReference ui-tree > ui-tree-item")
      .evaluateAll((rows) => rows.map((row) => row.getAttribute("label")))
    expect(groups).toEqual(["This app", "Spell"])
    await page.locator(".ReferenceSearch").first().click()
    await page.keyboard.type("shuffle")
    await page.waitForTimeout(800)
    await page.locator('.SpellReference ui-tree-item[label="shuffle (a list)"]').click()
    await page.waitForTimeout(1500)
    expect(await page.locator(".ReferenceDetails").innerText()).toContain("Put it in random order")
  })
})
