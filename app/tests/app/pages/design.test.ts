import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { CodeEditor, EDITOR, SERVING } from "./runningEditor"

/**
 * Design mode (epic `editor` P37;  Q58, Q59, Q60, Q63):  Solitaire's `Card.spell` open in Design,
 * its picker listing the card's drawings and its property editor, the bit picked drawn large on its own.
 * - It opens on the drawing the code's cursor is in (Q63 B).
 * - Picking the property editor shows the form, the card small beside it, not the card alone (T116).
 * - A drop on what it draws writes into the right file:  the card's drawing, or its property editor.
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

describe.skipIf(!SERVING)("Design mode", { timeout: 180_000 }, () => {
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

  /** What Design shows:  its picker's rows (the chosen one starred), and what its canvas draws. */
  const shown = () =>
    page.evaluate(() => {
      const card = document.querySelector(".DesignView solitaire-card")
      const { Inspector } = window as unknown as { Inspector: { allSelected: { element?: Element }[] } }
      return {
        address: location.pathname,
        rows: [...document.querySelectorAll(".DesignBitRow")].map(
          (row) => `${row.textContent}${row.hasAttribute("selected") ? "*" : ""}`
        ),
        direction: card?.getAttribute("direction"),
        fields: document.querySelectorAll(".DesignEditor ui-property").length,
        selected: Inspector.allSelected.at(-1)?.element?.localName,
        isAppHidden: getComputedStyle(document.querySelector(".AppPaneProgram")!).display === "none"
      }
    })

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

  /** The middle of what `selector` draws in the canvas, across shadow roots:  its own box, else its first child's. */
  const middleOf = (selector: string) =>
    page.evaluate((wanted) => {
      const canvas = document.querySelector(".DesignCanvas")!
      const find = (root: ParentNode): Element | undefined => {
        const found = root.querySelector(wanted)
        if (found) return found
        for (const element of root.querySelectorAll("*")) {
          const inner = element.shadowRoot && find(element.shadowRoot)
          if (inner) return inner
        }
        return undefined
      }
      const element = find(canvas)!
      const boxes = [element, ...element.children, ...(element.shadowRoot?.children ?? [])].map((each) =>
        each.getBoundingClientRect()
      )
      const box = boxes.find((one) => one.width && one.height)!
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    }, selector)

  /** Pick the picker's row for `bit`. */
  async function pick(bit: string): Promise<void> {
    await page.locator(`.DesignBitRow[data-bit="${bit}"]`).click()
    await page.waitForTimeout(SETTLE_MS)
  }

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
    await browser?.close()
  })

  test("Design opens on the drawing the code's cursor is in, face down for its back", async () => {
    const code = new CodeEditor(page)
    await code.clickLine(await code.lineOf("to draw its back"))
    await page.waitForTimeout(500)
    await page.locator(".ModeTabs ui-item", { hasText: "Design" }).click()
    await page.waitForTimeout(SETTLE_MS)
    const now = await shown()
    expect(now.address).toBe("/design/@spell/examples/Solitaire/Card.spell")
    expect(now.rows.slice(0, 3)).toEqual(["Front", "Back*", "Property editor"])
    expect(now).toMatchObject({ direction: "down", fields: 0, selected: "solitaire-card", isAppHidden: true })
  })

  test("picking the property editor shows its form, the card small beside it", async () => {
    await pick("editor")
    expect(await shown()).toMatchObject({ fields: 8, selected: "solitaire-card", isAppHidden: true })
    const sizes = await page.evaluate(() => ({
      card: document.querySelector(".DesignView solitaire-card")!.getBoundingClientRect().width,
      form: document.querySelector(".DesignEditor")!.getBoundingClientRect().width
    }))
    expect(sizes.card).toBeLessThan(sizes.form / 2)
  })

  test("picking the front draws the card face up, large", async () => {
    await pick("drawing:to draw its front")
    expect(await shown()).toMatchObject({ direction: "up", fields: 0 })
  })

  test("a drop on the card's front writes into `to draw its front`", async () => {
    const front = await middleOf("solitaire-card-image[part=front]")
    await dropFromPalette("Button", front.x, front.y)
    expect(await linesUnder("Card.spell", "to draw its front")).toContain(BUTTON)
    await undo()
    expect(await linesUnder("Card.spell", "to draw its front")).not.toContain(BUTTON)
  })

  test("a drop on its property editor writes into Card.editor.spell", async () => {
    await pick("editor")
    const field = await middleOf('ui-property[name="rank"]')
    await dropFromPalette("Button", field.x, field.y)
    expect(await text("Card.editor.spell")).toContain(BUTTON)
    await undo()
    expect(await text("Card.editor.spell")).not.toContain(BUTTON)
  })

  test("Edit shows the whole app again", async () => {
    await page.locator(".ModeTabs ui-item", { hasText: "Edit" }).first().click()
    await page.waitForTimeout(SETTLE_MS)
    const now = await shown()
    expect(now.address).toBe("/edit/@spell/examples/Solitaire/Card.spell")
    expect(now.rows).toEqual([])
    expect(now.isAppHidden).toBe(false)
  })
})
