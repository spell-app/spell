import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING, openAddPanel, ADD_PANEL } from "./runningEditor"

/**
 * Where a drop or a palette click lands in a site with a main layout (epic `editor` P35, Placing And Isolation):
 * in the page shown, never in the layout's panes round it (its app menu, drawer, footer), unless one is picked.
 * - A site written for the test, answered as Task List's program file:  nothing reaches the disk.
 * - Needs this checkout's editor running:  `spell server start all`.  Skips itself when it isn't, as in CI.
 * - Headless Playwright, never a real browser window.
 */

/** The address of the program's file, loaded or saved, and of no other. */
const PROGRAM_URL = /\/TaskList\.spell(\?.*)?$/

/** The page's lines of text:  enough to fill the app pane, so its end is below the fold. */
const LINES = 30

/** A site with a main layout:  an app menu, the site's navigation in its drawer, and a footer. */
const SITE = `# A site with a layout

home page is a page
\tto draw it
\t\t<container>
${Array.from({ length: LINES }, (_line, at) => `\t\t\t<header>Line ${at + 1}</header>`).join("\n")}
\t\t</>

main layout is a page layout
\tto draw its app menu
\t\t<app-menu>
\t\t\t<site-nav-button slot="start" />
\t\t</app-menu>
\tto draw its footer
\t\t<text>The footer</text>

my site is a site
\tit has a home page at "/", named "Home"
`

/** What a compile and redraw takes, at most. */
const SETTLE_MS = 2500

/** The button the palette's Button row writes. */
const BUTTON = "<ui-button>Click me</ui-button>"

describe.skipIf(!SERVING)("placing in a site with a layout", { timeout: 180_000 }, () => {
  let browser: Browser
  let page: Page
  /** What a save sent. */
  let saved: string | undefined

  /** The program's real text. */
  const text = () =>
    page.evaluate(() => {
      const { project } = window as unknown as { project: { spellFiles: { path: string; contents: string }[] } }
      return project.spellFiles.find((each) => each.path.endsWith("/TaskList.spell"))!.contents
    })

  /** The lines of `section`, its head's line to the next blank line, trimmed. */
  const linesOf = async (head: string) => {
    const lines = (await text()).split("\n")
    const start = lines.findIndex((line) => line.trim() === head)
    const end = lines.findIndex((line, at) => at > start && !line.trim())
    return lines.slice(start + 1, end).map((line) => line.trim())
  }

  /** Open the palette. */
  async function openPalette(): Promise<void> {
    await openAddPanel(page)
    await page.waitForTimeout(800)
  }

  /** The palette's Button row, open. */
  const buttonRow = () => page.locator(`${ADD_PANEL} ui-tree-item[label="Button"]`).first()

  /** Drag the palette's Button to (`toX`, `toY`), as a person does. */
  async function dropButton(toX: number, toY: number): Promise<void> {
    await openPalette()
    const row = (await buttonRow().boundingBox())!
    const x = row.x + 40
    const y = row.y + 10
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + 10, y + 10, { steps: 3 })
    await page.mouse.move(toX, toY, { steps: 6 })
    await page.waitForTimeout(100)
    await page.mouse.up()
    await page.waitForTimeout(SETTLE_MS)
  }

  /** Click the palette's Button row. */
  async function clickButton(): Promise<void> {
    await openPalette()
    await buttonRow().click()
    await page.waitForTimeout(SETTLE_MS)
  }

  /** Let go of what's selected. */
  const letGo = () => page.evaluate(() => (window as unknown as { Inspector: { letGo(): void } }).Inspector.letGo())

  /** Take back the last change. */
  async function undo(): Promise<void> {
    await page.mouse.move(5, 400)
    await page.keyboard.press("ControlOrMeta+z")
    await page.waitForTimeout(SETTLE_MS)
  }

  /** The box of the drawn element written at `line` of the program (counted from 0), and the app pane's. */
  const boxes = (line: number) =>
    page.evaluate((at) => {
      const area = document.querySelector(".AppPaneBody")!
      const drawn = [...area.querySelectorAll(`[data-spell-at$=":${at}:3"], [data-spell-at$=":${at}:2"]`)].at(-1)
      const box = (element: Element | undefined) => {
        const { top, bottom, left, right } = element?.getBoundingClientRect() ?? new DOMRect()
        return { top, bottom, left, right }
      }
      const { Inspector } = window as unknown as { Inspector: { allSelected: { element?: Element }[] } }
      const selected = Inspector.allSelected.at(-1)?.element
      return {
        drawn: box(drawn),
        pane: box(area),
        isSelected: !!drawn && selected === drawn,
        selected: selected?.outerHTML.slice(0, 80)
      }
    }, line)

  beforeAll(async () => {
    browser = await chromium.launch()
    const context = await browser.newContext({ viewport: { width: 1440, height: 800 } })
    await context.route(/\/api\/projects\/file\/|\.(spell)(\?.*)?$/, (route) => {
      const request = route.request()
      if (request.isNavigationRequest()) return route.continue()
      const isProgram = PROGRAM_URL.test(request.url())
      if (request.method() !== "GET") {
        if (isProgram) saved = request.postData() ?? ""
        return route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
      }
      return isProgram ? route.fulfill({ contentType: "text/plain", body: saved ?? SITE }) : route.continue()
    })
    page = await context.newPage()
    await page.goto(`${EDITOR}edit/@spell/examples/TaskList`, { timeout: 60_000 })
    await page.waitForSelector(".InspectAppButton", { state: "attached", timeout: 60_000 })
    await page.waitForTimeout(6000)
    await page.evaluate(() => {
      const { Inspector } = window as unknown as { Inspector: { isOpen: boolean; toggle(): void } }
      if (!Inspector.isOpen) Inspector.toggle()
    })
    await page.waitForTimeout(1000)
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
  })

  test("a drop over the layout's app menu lands at the end of the page's own drawing", async () => {
    // its box is its shadow root's:  the host draws none of its own
    const menu = await page.evaluate(() => {
      const host = document.querySelector(".AppPaneBody ui-app-menu")!
      const shown = [...host.shadowRoot!.children]
        .map((child) => child.getBoundingClientRect())
        .find((box) => box.width)!
      return { x: shown.x + shown.width / 2, y: shown.y + shown.height / 2 }
    })
    await dropButton(menu.x, menu.y)
    expect((await linesOf("<container>")).at(-2)).toBe(BUTTON)
    expect(await linesOf("to draw its footer")).toEqual(["<text>The footer</text>"])
    await undo()
    expect(await linesOf("<container>")).not.toContain(BUTTON)
  })

  test("a click with nothing selected adds to the page, selected and scrolled into view", async () => {
    await letGo()
    await clickButton()
    const lines = await linesOf("<container>")
    expect(lines.at(-2)).toBe(BUTTON)
    expect(await linesOf("to draw its footer")).toEqual(["<text>The footer</text>"])
    // the button's line, counted from 0 as a drawn part's place is:  the container's head is on line 4
    const { drawn, pane, isSelected, selected } = await boxes(4 + lines.indexOf(BUTTON) + 1)
    expect(isSelected, selected).toBe(true)
    expect(drawn.top).toBeGreaterThanOrEqual(pane.top)
    expect(drawn.bottom).toBeLessThanOrEqual(pane.bottom)
    await undo()
  })

  test("with the footer picked, a click adds to the footer, and it's drawn at once", async () => {
    await page.evaluate(() => {
      const footer = document.querySelector('.AppPaneBody div[slot="footer"] ui-text')
      ;(window as unknown as { Inspector: { select(element: Element | null): void } }).Inspector.select(footer)
    })
    await page.waitForTimeout(800)
    await clickButton()
    expect(await linesOf("to draw its footer")).toEqual(["<text>The footer</text>", BUTTON])
    expect(await page.locator('.AppPaneBody div[slot="footer"] ui-button').count()).toBe(1)
    await undo()
  })

  test("what's added but draws nothing to see is still picked, and a notice says so", async () => {
    await letGo()
    await page.evaluate(() => ((window as unknown as { editor: { notice?: string } }).editor.notice = undefined))
    await openPalette()
    await page.locator(`${ADD_PANEL} ui-tree-item[label="Container"]`).first().click()
    await page.waitForTimeout(SETTLE_MS)
    const { notice, selected } = await page.evaluate(() => {
      const { editor, Inspector } = window as unknown as {
        editor: { notice?: string }
        Inspector: { allSelected: { element?: Element }[] }
      }
      return { notice: editor.notice, selected: Inspector.allSelected.at(-1)?.element?.localName }
    })
    expect(selected).toBe("ui-container")
    expect(notice).toMatch(/empty/)
    await undo()
  })
})
