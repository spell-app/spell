import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"

/**
 * A view shown on its own (epic `editor` P35, Placing And Isolation;  Q45 A, Q46 A):  Solitaire's `Card.spell` open,
 * Card alone draws one card in the app pane, its property editor beside it, both taking the palette's drops.
 * - NOTHING reaches the disk:  every save is answered here, and what it sent is what the next load reads,
 *   so the example can't change.
 * - Needs this checkout's editor running:  `spell server start all`.  Skips itself when it isn't, as in CI.
 * - Headless Playwright, never a real browser window.
 */

/** Solitaire's files a test may write:  the card's and its property editor's. */
const WRITTEN = /\/Solitaire\/(Card\.spell|Card\.editor\.spell)(\?.*)?$/

/** What a compile and redraw takes, at most. */
const SETTLE_MS = 2500

/** The button the palette's Button row writes. */
const BUTTON = "<ui-button>Click me</ui-button>"

describe.skipIf(!SERVING)("a view on its own", { timeout: 180_000 }, () => {
  let browser: Browser
  let page: Page
  /** What each save sent, by its file's name. */
  const saved = new Map<string, string>()

  /** A Solitaire file's real text, by its name. */
  const text = (name: string) =>
    page.evaluate((file) => {
      // `files`:  a property editors file is never compiled, so it's not among the Spell files
      const { project } = window as unknown as { project: { files: { path: string; contents: string }[] } }
      return project.files.find((each) => each.path.endsWith(`/${file}`))!.contents
    }, name)

  /** The lines under `head` in `name`, to the next line no deeper than it, trimmed. */
  const linesUnder = async (name: string, head: string) => {
    const lines = (await text(name)).split("\n")
    const start = lines.findIndex((line) => line.trim() === head)
    const indent = /^\s*/.exec(lines[start]!)![0].length
    const end = lines.findIndex((line, at) => at > start && line.trim() && /^\s*/.exec(line)![0].length <= indent)
    return lines
      .slice(start + 1, end < 0 ? undefined : end)
      .map((line) => line.trim())
      .filter(Boolean)
  }

  /** Take back the last change. */
  async function undo(): Promise<void> {
    await page.mouse.move(5, 400)
    await page.keyboard.press("ControlOrMeta+z")
    await page.waitForTimeout(SETTLE_MS)
  }

  /** Drag the palette's `label` row to (`toX`, `toY`), as a person does. */
  async function dropFromPalette(label: string, toX: number, toY: number): Promise<void> {
    await page.locator("#AddPartButton [part~=item]").click()
    await page.waitForTimeout(800)
    const row = (await page.locator(`.PalettePopup ui-tree-item[label="${label}"]`).first().boundingBox())!
    await page.mouse.move(row.x + 40, row.y + 10)
    await page.mouse.down()
    await page.mouse.move(row.x + 50, row.y + 20, { steps: 3 })
    await page.mouse.move(toX, toY, { steps: 6 })
    await page.waitForTimeout(100)
    await page.mouse.up()
    await page.waitForTimeout(SETTLE_MS)
  }

  /** The middle of what `selector` draws in the stage, across shadow roots:  its own box, else its first child's. */
  const middleOf = (selector: string) =>
    page.evaluate((wanted) => {
      const stage = document.querySelector(".ViewAloneStage")!
      const find = (root: ParentNode): Element | undefined => {
        const found = root.querySelector(wanted)
        if (found) return found
        for (const element of root.querySelectorAll("*")) {
          const inner = element.shadowRoot && find(element.shadowRoot)
          if (inner) return inner
        }
        return undefined
      }
      const element = find(stage)!
      const boxes = [element, ...element.children, ...(element.shadowRoot?.children ?? [])].map((each) =>
        each.getBoundingClientRect()
      )
      const box = boxes.find((one) => one.width && one.height)!
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    }, selector)

  beforeAll(async () => {
    browser = await chromium.launch()
    const context = await browser.newContext({ viewport: { width: 1440, height: 800 } })
    await context.route(/\/api\/projects\/file\/|\.(spell)(\?.*)?$/, (route) => {
      const request = route.request()
      if (request.isNavigationRequest()) return route.continue()
      const name = WRITTEN.exec(request.url())?.[1]
      if (request.method() !== "GET") {
        if (name) saved.set(name, request.postData() ?? "")
        return route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
      }
      const kept = name && saved.get(name)
      return kept ? route.fulfill({ contentType: "text/plain", body: kept }) : route.continue()
    })
    page = await context.newPage()
    await page.goto(`${EDITOR}edit/@spell/examples/Solitaire/Card.spell`, { timeout: 60_000 })
    await page.waitForSelector(".InspectAppButton", { state: "attached", timeout: 60_000 })
    await page.waitForTimeout(6000)
    await page.evaluate(() => {
      const { Inspector } = window as unknown as { Inspector: { isOpen: boolean; toggle(): void; letGo(): void } }
      if (!Inspector.isOpen) Inspector.toggle()
      Inspector.letGo()
    })
    await page.waitForTimeout(500)
  }, 120_000)

  afterAll(async () => {
    // the next run starts with the whole app again
    await page
      ?.evaluate(() => {
        const { ViewAlone } = window as unknown as { ViewAlone?: { isShowing: boolean; toggle(): void } }
        if (ViewAlone?.isShowing) ViewAlone.toggle()
      })
      .catch(() => {})
    await browser?.close()
  })

  test("Card alone shows one card, selected, with its property editor beside it", async () => {
    await page.locator(".ViewAloneButton [part~=item]").click()
    await page.waitForTimeout(SETTLE_MS)
    const shown = await page.evaluate(() => {
      const stage = document.querySelector(".ViewAloneStage")
      const { Inspector } = window as unknown as { Inspector: { allSelected: { element?: Element }[] } }
      return {
        cards: stage?.querySelectorAll(".ViewAloneView solitaire-card").length,
        properties: stage?.querySelectorAll(".ViewAloneEditor ui-property").length,
        selected: Inspector.allSelected.at(-1)?.element?.localName,
        isAppHidden: getComputedStyle(document.querySelector(".AppPaneProgram")!).display === "none"
      }
    })
    expect(shown).toEqual({ cards: 1, properties: 8, selected: "solitaire-card", isAppHidden: true })
  })

  test("a drop on the card's front writes into `to draw its front`", async () => {
    const front = await middleOf("solitaire-card-image[part=front]")
    await dropFromPalette("Button", front.x, front.y)
    expect(await linesUnder("Card.spell", "to draw its front")).toContain(BUTTON)
    await undo()
    expect(await linesUnder("Card.spell", "to draw its front")).not.toContain(BUTTON)
  })

  test("a drop on its property editor writes into Card.editor.spell", async () => {
    const field = await middleOf('ui-property[name="rank"]')
    await dropFromPalette("Button", field.x, field.y)
    expect(await text("Card.editor.spell")).toContain(BUTTON)
    await undo()
    expect(await text("Card.editor.spell")).not.toContain(BUTTON)
  })

  test("a change to its suit in the Inspector draws the card again", async () => {
    // the card's front, as drawn:  one letter of unicode's playing cards, its suit's
    const drawnFront = () =>
      page.evaluate(() => {
        const card = document.querySelector(".ViewAloneView solitaire-card")!
        const front = card.shadowRoot!.querySelector("solitaire-card-image[part=front]")!
        return {
          suit: (card as Element & { thing: { suit: string } }).thing.suit,
          drawn: front.shadowRoot!.textContent
        }
      })
    const before = await drawnFront()
    const other = before.suit === "hearts" ? "spades" : "hearts"
    // the Inspector's own card:  the view is selected in it
    await page.locator(`.InspectorColumn ui-property[name="suit"] ui-item[value="${other}"]`).first().click()
    await page.waitForTimeout(SETTLE_MS)
    const after = await drawnFront()
    expect(after.suit).toBe(other)
    expect(after.drawn).not.toBe(before.drawn)
    await undo()
  })
})
