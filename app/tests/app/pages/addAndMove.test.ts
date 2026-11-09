import { chromium, type Browser, type BrowserContext, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"

/**
 * Adding, moving and removing parts from the running editor, by a real mouse and keys (epic `editor`, Add And Move).
 * - A blank program, starting from nothing:  every step reads the file's real text, not what's drawn.
 * - NOTHING reaches the disk:  the program's file and every save are answered here,
 *   so the built-in examples can't change.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** The file a blank program is answered for:  a project in tags, the example's text never read. */
const FILE = "TaskList.spellml"

/** A program with nothing in it. */
const BLANK = `# A new app

<spell-app "blank">
\t<draw>
\t\t<ui-container>
\t\t</ui-container>
\t</draw>
</spell-app>

<spell>
\tstart the blank
</spell>
`

/** What a compile and redraw takes, at most. */
const SETTLE_MS = 2500

/** A part as it's drawn. */
type Drawn = { tag: string; x: number; y: number; width: number; height: number }

describe.skipIf(!SERVING)("adding and moving parts", { timeout: 180_000 }, () => {
  let browser: Browser
  let context: BrowserContext
  let page: Page
  /** What a save sent. */
  let saved: string | undefined

  /** The program's real text. */
  const text = () =>
    page.evaluate((file) => {
      const { project } = window as unknown as { project: { spellFiles: { path: string; contents: string }[] } }
      return project.spellFiles.find((each) => each.path.endsWith(`/${file}`))!.contents
    }, FILE)

  /** What's in the program's container, as written:  its tags, in order, with no indent. */
  const written = async () =>
    (await text())
      .split("<ui-container>")[1]!
      .split("</ui-container>")[0]!
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)

  /** The app's parts named `tag`, as they're drawn. */
  const drawn = (tag: string) =>
    page.evaluate((name) => {
      const area = document.querySelector(".AppPaneBody")!
      return [...area.querySelectorAll(name)].map((element) => {
        const own = element.getBoundingClientRect()
        const box = own.width
          ? own
          : [...(element.shadowRoot?.children ?? [])]
              .map((child) => child.getBoundingClientRect())
              .find((one) => one.width)!
        return { tag: name, x: box.x + box.width / 2, y: box.y + box.height / 2, width: box.width, height: box.height }
      })
    }, tag) as Promise<Drawn[]>

  /** Press at (`x`, `y`), move to (`toX`, `toY`) as a person does, and let go. */
  async function drag(x: number, y: number, toX: number, toY: number): Promise<void> {
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + 10, y + 10, { steps: 3 })
    await page.mouse.move(toX, toY, { steps: 6 })
    await page.waitForTimeout(100)
    await page.mouse.up()
    await page.waitForTimeout(SETTLE_MS)
  }

  /** Drag `label` from the palette to (`toX`, `toY`). */
  async function fromPalette(label: string, toX: number, toY: number): Promise<void> {
    await page.locator("#AddPartButton").click()
    await page.waitForTimeout(800)
    const row = await page.locator(`.PalettePopup ui-tree-item[label="${label}"]`).first().boundingBox()
    await drag(row!.x + 40, row!.y + 10, toX, toY)
  }

  /** Press `keys`, and wait for it to be drawn. */
  async function press(keys: string): Promise<void> {
    await page.keyboard.press(keys)
    await page.waitForTimeout(SETTLE_MS)
  }

  beforeAll(async () => {
    browser = await chromium.launch()
    context = await browser.newContext({ viewport: { width: 1440, height: 800 } })
    // the one route:  Playwright asks the last one added first, and a second could let a save through
    await context.route(/\/api\/projects\/file\/|\.(spellml|spell)(\?.*)?$/, (route) => {
      const request = route.request()
      // Show in Code puts the file's name in the page's address:  a reload is the page, not the file
      if (request.isNavigationRequest()) return route.continue()
      if (request.method() !== "GET") {
        saved = request.postData() ?? ""
        return route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
      }
      return request.url().includes(FILE)
        ? route.fulfill({ contentType: "text/plain", body: saved ?? BLANK })
        : route.continue()
    })
    page = await context.newPage()
    await page.goto(`${EDITOR}edit/@spell/examples/TaskList`, { timeout: 60_000 })
    await page.waitForSelector(".InspectorToggle ui-icon", { timeout: 60_000 })
    await page.waitForTimeout(6000)
    await page.locator(".InspectorToggle ui-icon").first().click({ force: true })
    await page.waitForTimeout(1000)
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
  })

  test("from a blank program:  add, reorder, cut, paste, undo, save, and read real code", async () => {
    const area = (await page.locator(".AppPaneBody").boundingBox())!
    const middle = area.x + area.width / 2

    // an empty app says what to do, until something's in it
    const promptShows = () =>
      page.locator(".EmptyAppPrompt").evaluate((prompt) => getComputedStyle(prompt).display !== "none")
    expect(await promptShows()).toBe(true)
    await fromPalette("Button", middle, area.y + 60)
    expect(await promptShows()).toBe(false)
    expect(await written()).toEqual(["<ui-button>Click me</ui-button>"])

    await fromPalette("Card", middle, area.y + area.height - 40)
    expect(await written()).toEqual([
      "<ui-button>Click me</ui-button>",
      '<ui-card heading="A card" description="What it says"></ui-card>'
    ])

    if ((await page.locator(".InspectAppButton").first().getAttribute("aria-pressed")) !== "true") {
      await page.locator(".InspectAppButton [part~=item]").first().click()
    }
    const [button] = await drawn("ui-button")
    const [card] = await drawn("ui-card")
    await drag(button!.x, button!.y, card!.x, card!.y + card!.height / 2 - 2)
    expect(await written()).toEqual([
      '<ui-card heading="A card" description="What it says"></ui-card>',
      "<ui-button>Click me</ui-button>"
    ])

    const [movedCard] = await drawn("ui-card")
    await page.mouse.click(movedCard!.x, movedCard!.y)
    await page.waitForTimeout(500)
    await page.mouse.move(area.x + 10, area.y + area.height - 10)
    await press("ControlOrMeta+x")
    expect(await written()).toEqual(["<ui-button>Click me</ui-button>"])

    await press("ControlOrMeta+v")
    expect(await written()).toEqual([
      "<ui-button>Click me</ui-button>",
      '<ui-card heading="A card" description="What it says"></ui-card>'
    ])

    await press("ControlOrMeta+z")
    expect(await written()).toEqual(["<ui-button>Click me</ui-button>"])
    await press("ControlOrMeta+z")
    expect(await written()).toEqual([
      '<ui-card heading="A card" description="What it says"></ui-card>',
      "<ui-button>Click me</ui-button>"
    ])
    await press("ControlOrMeta+Shift+z")
    await press("ControlOrMeta+Shift+z")

    await page.keyboard.press("ControlOrMeta+s")
    await page.waitForTimeout(1000)
    expect(saved).toContain("\t\t\t<ui-button>Click me</ui-button>")
    expect(saved).toContain('<ui-card heading="A card" description="What it says"></ui-card>')
    expect(saved).toContain("start the blank")
  })

  test("what's selected is duplicated and deleted by its keys, each one step", async () => {
    const [card] = await drawn("ui-card")
    if ((await page.locator(".InspectAppButton").first().getAttribute("aria-pressed")) !== "true") {
      await page.locator(".InspectAppButton [part~=item]").first().click()
    }
    await page.mouse.click(card!.x, card!.y)
    await page.waitForTimeout(500)
    const before = await written()
    await press("ControlOrMeta+d")
    expect(await written()).toHaveLength(before.length + 1)
    await press("Backspace")
    expect(await written()).toEqual(before)
    await press("ControlOrMeta+z")
    expect(await written()).toHaveLength(before.length + 1)
    await press("ControlOrMeta+z")
    expect(await written()).toEqual(before)
  })

  test("a row of the Views tree drags the same way", async () => {
    const before = await written()
    const button = await page.locator('.InspectorTree ui-tree-item[label="Click me"]').first().boundingBox()
    const card = await page.locator('.InspectorTree ui-tree-item[label="Card"]').first().boundingBox()
    await drag(button!.x + 60, button!.y + 10, card!.x + 60, card!.y + 21)
    expect(await written()).toEqual([...before].reverse())
    await press("ControlOrMeta+z")
    expect(await written()).toEqual(before)
  })

  test("a right click opens the one menu, on what was clicked", async () => {
    const before = await written()
    const [card] = await drawn("ui-card")
    await page.mouse.click(card!.x, card!.y, { button: "right" })
    await page.waitForTimeout(500)
    await page.locator('.PartMenu ui-action:has-text("Duplicate")').click()
    await page.waitForTimeout(SETTLE_MS)
    expect(await written()).toHaveLength(before.length + 1)
    expect(await page.locator(".PartMenu").count()).toBe(0)
    await press("ControlOrMeta+z")
    expect(await written()).toEqual(before)
  })

  test("Delete, by click and by Enter, closes the menu, though it greys itself once it has run", async () => {
    const before = await written()
    for (const how of ["click", "Enter"] as const) {
      const [card] = await drawn("ui-card")
      await page.mouse.click(card!.x, card!.y, { button: "right" })
      await page.waitForTimeout(500)
      if (how === "click") await page.locator('.PartMenu ui-action:has-text("Delete")').click()
      else {
        for (let row = 0; row < 4; row++) await page.keyboard.press("ArrowDown")
        await page.keyboard.press("Enter")
      }
      await page.waitForTimeout(SETTLE_MS)
      expect(await written()).toHaveLength(before.length - 1)
      expect(await page.locator(".PartMenu").count()).toBe(0)
      await press("ControlOrMeta+z")
      expect(await written()).toEqual(before)
    }
  })

  /** The part menu's rows on `on`:  each one's words, and whether it's greyed, with why. */
  const menuRows = (on: Page) =>
    on.evaluate(() =>
      [...document.querySelectorAll(".PartMenu ui-action")].map((row) => ({
        title: row.getAttribute("kind") === "divider" ? "-" : (row.textContent ?? "").trim(),
        grey: row.hasAttribute("disabled"),
        why: row.getAttribute("title") ?? ""
      }))
    )

  test("the menu's rows, in order, and each of them on a drawn part", async () => {
    const [card] = await drawn("ui-card")
    await page.mouse.click(card!.x, card!.y, { button: "right" })
    await page.waitForTimeout(500)
    const rows = await menuRows(page)
    expect(rows.map((row) => row.title)).toEqual([
      "Cut",
      "Copy",
      "Paste",
      "Duplicate",
      "Delete",
      "-",
      "Show in Code",
      "Inspect",
      "-",
      "Change This..."
    ])
    expect(rows.filter((row) => row.grey).map((row) => row.title)).toEqual([])
    await page.keyboard.press("Escape")
    await page.waitForTimeout(300)
    expect(await page.locator(".PartMenu").count()).toBe(0)
  })

  test("the keys:  focus goes in, the arrows move, Enter runs, and focus comes back", async () => {
    const [card] = await drawn("ui-card")
    await page.mouse.click(card!.x, card!.y, { button: "right" })
    await page.waitForTimeout(500)
    const focused = () =>
      page.evaluate(() => {
        let at = document.activeElement
        while (at?.shadowRoot?.activeElement) at = at.shadowRoot.activeElement
        const host = (at?.getRootNode() as ShadowRoot | undefined)?.host
        return (host ?? at)?.textContent?.trim() ?? ""
      })
    expect(await focused()).toMatch(/^Cut/)
    await page.keyboard.press("ArrowDown")
    expect(await focused()).toMatch(/^Copy/)
    await page.keyboard.press("Escape")
    await page.waitForTimeout(300)
    expect(await page.locator(".PartMenu").count()).toBe(0)
    expect(await focused()).not.toMatch(/^Copy/)
  })

  test("Show in Code goes to the line;  Inspect opens the Inspector, with Inspect app off", async () => {
    await page.evaluate(() => {
      const inspector = (window as unknown as { Inspector: { isOpen: boolean; close(): void } }).Inspector
      if (inspector.isOpen) inspector.close()
    })
    await page.waitForTimeout(500)
    const [card] = await drawn("ui-card")
    await page.mouse.click(card!.x, card!.y, { button: "right" })
    await page.waitForTimeout(500)
    await page.locator('.PartMenu ui-action:has-text("Show in Code")').click()
    await page.waitForTimeout(800)
    const line = await page.evaluate(() => {
      const code = (window as unknown as { editor: { shownCodeEditor: { getPosition(): { lineNumber: number } } } })
        .editor.shownCodeEditor
      return code.getPosition().lineNumber
    })
    expect(line).toBeGreaterThan(1)

    await page.mouse.click(card!.x, card!.y, { button: "right" })
    await page.waitForTimeout(500)
    await page.locator('.PartMenu ui-action:has-text("Inspect")').click()
    await page.waitForTimeout(800)
    const state = await page.evaluate(() => {
      const { Inspector } = window as unknown as {
        Inspector: { isOpen: boolean; isInspecting: boolean; allSelected: unknown[] }
      }
      return { isOpen: Inspector.isOpen, isInspecting: Inspector.isInspecting, count: Inspector.allSelected.length }
    })
    expect(state).toEqual({ isOpen: true, isInspecting: false, count: 1 })
  })

  test("the background is the app:  only Copy, Paste, Show in Code and Inspect;  its tooltips say why", async () => {
    const area = (await page.locator(".AppPaneBody").boundingBox())!
    await page.mouse.click(area.x + area.width - 12, area.y + area.height - 12, { button: "right" })
    await page.waitForTimeout(500)
    const rows = await menuRows(page)
    const grey = rows.filter((row) => row.grey)
    expect(grey.map((row) => row.title)).toEqual(expect.arrayContaining(["Cut", "Duplicate", "Delete"]))
    expect(grey.find((row) => row.title === "Cut")!.why).toMatch(/app itself/)
    expect(rows.find((row) => row.title === "Inspect")!.grey).toBe(false)
    await page.keyboard.press("Escape")
    await page.waitForTimeout(300)
  })

  test("a menu opened in each corner stays inside the window", async () => {
    const area = (await page.locator(".AppPaneBody").boundingBox())!
    const size = page.viewportSize()!
    const open = async (x: number, y: number) => {
      // straight at the corner of the window:  the app's area stops short of it
      await page.evaluate(
        ({ x, y }) => {
          const { PartEdits } = window as unknown as { PartEdits: { onMenu(x: number, y: number): void } }
          PartEdits.onMenu(x, y)
        },
        { x, y }
      )
      await page.waitForTimeout(500)
      const box = await page.locator(".PartMenu").evaluate((popup) => {
        const { x, y, right, bottom, width } = popup.shadowRoot!.querySelector("[part~=popup]")!.getBoundingClientRect()
        return { x, y, right, bottom, width }
      })
      await page.keyboard.press("Escape")
      await page.waitForTimeout(300)
      return box
    }
    expect(area.width).toBeGreaterThan(0)
    for (const [x, y] of [
      [2, 2],
      [size.width - 2, 2],
      [2, size.height - 2],
      [size.width - 2, size.height - 2]
    ]) {
      const box = await open(x!, y!)
      expect(box.width).toBeGreaterThan(50)
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.right).toBeLessThanOrEqual(size.width)
      expect(box.bottom).toBeLessThanOrEqual(size.height)
    }
  })

  test("in the code editor, ⌘C copies its own text, and nothing happens to the parts", async () => {
    const before = await text()
    await page.locator(".monaco-editor .view-line").first().click()
    await press("ControlOrMeta+a")
    await press("ControlOrMeta+c")
    await page.mouse.click(5, 400)
    expect(await text()).toBe(before)
  })

  test("a card made in a loop can't move or go alone, and the editor says why", async () => {
    const other = await context.newPage()
    await other.goto(`${EDITOR}edit/@spell/examples/Solitaire`, { timeout: 60_000 })
    await other.waitForSelector(".InspectorToggle ui-icon", { timeout: 60_000 })
    await other.waitForTimeout(7000)
    const notice = () => other.evaluate(() => (window as unknown as { editor: { notice?: string } }).editor.notice)
    const source = () =>
      other.evaluate(() => {
        const { project } = window as unknown as { project: { spellFiles: { path: string; contents: string }[] } }
        return project.spellFiles.map((each) => each.contents).join("")
      })
    const before = await source()
    // already open from this context's first test, and inspecting
    if ((await other.locator(".InspectAppButton").first().getAttribute("aria-pressed")) !== "true") {
      await other.locator(".InspectAppButton [part~=item]").first().click()
    }
    const box = await other.evaluate(() => {
      const find = (root: Document | ShadowRoot): Element | undefined => {
        for (const element of root.querySelectorAll("*")) {
          if (element.localName === "solitaire-card") return element
          const inside = element.shadowRoot && find(element.shadowRoot)
          if (inside) return inside
        }
        return undefined
      }
      const found = find(document)!.getBoundingClientRect()
      return { x: found.x + found.width / 2, y: found.y + found.height / 2 }
    })
    await other.mouse.move(box.x, box.y)
    await other.mouse.down()
    await other.mouse.move(box.x + 30, box.y + 30, { steps: 4 })
    await other.mouse.up()
    await other.waitForTimeout(500)
    expect(await notice()).toMatch(/one place in the code/)
    expect(await source()).toBe(before)

    // its right click:  what would act on it alone is greyed, saying why;  the rest isn't
    await other.mouse.click(box.x, box.y, { button: "right" })
    await other.waitForTimeout(500)
    const rows = await menuRows(other)
    const cut = rows.find((row) => row.title === "Cut")!
    expect(cut.grey).toBe(true)
    expect(cut.why).toMatch(/one place in the code/)
    expect(rows.find((row) => row.title === "Show in Code")!.grey).toBe(false)
    expect(rows.find((row) => row.title === "Inspect")!.grey).toBe(false)
    await other.keyboard.press("Escape")
    await other.waitForTimeout(300)
    await other.close()
  })

  test("cards are a list, so Shift takes a run;  and in Run a program keeps its right click", async () => {
    const other = await context.newPage()
    await other.goto(`${EDITOR}edit/@spell/examples/Solitaire`, { timeout: 60_000 })
    await other.waitForSelector(".InspectorToggle ui-icon", { timeout: 60_000 })
    await other.waitForTimeout(7000)
    // the last test's right click is remembered with the project
    await other.evaluate(() => {
      const { Inspector } = window as unknown as { Inspector: { letGo(): void; startInspecting(): void } }
      Inspector.letGo()
      Inspector.startInspecting()
    })
    await other.waitForTimeout(300)
    const cards = await other.evaluate(() => {
      const found: { x: number; y: number }[] = []
      const walk = (root: Document | ShadowRoot) => {
        for (const element of root.querySelectorAll("*")) {
          if (element.localName === "solitaire-card" && !element.nextElementSibling) {
            const { x, y, width, height } = element.getBoundingClientRect()
            found.push({ x: x + width / 2, y: y + height / 2 })
          }
          if (element.shadowRoot) walk(element.shadowRoot)
        }
      }
      walk(document)
      return found.filter((card) => card.y > 0)
    })
    expect(cards.length).toBeGreaterThan(3)
    const count = () =>
      other.evaluate(
        () => (window as unknown as { Inspector: { allSelected: unknown[] } }).Inspector.allSelected.length
      )
    await other.keyboard.down("Meta")
    await other.mouse.click(cards[0]!.x, cards[0]!.y)
    await other.keyboard.up("Meta")
    await other.waitForTimeout(300)
    expect(await count()).toBe(1)
    await other.keyboard.down("Shift")
    await other.mouse.click(cards[1]!.x, cards[1]!.y)
    await other.keyboard.up("Shift")
    await other.waitForTimeout(300)
    const run = await count()
    expect(run).toBeGreaterThan(1)

    await other.keyboard.press("Escape")
    await other.locator('.ModeTabs ui-item:has-text("Run")').first().click()
    await other.waitForTimeout(1500)
    const grid = await other.evaluate(() => {
      const walk = (root: Document | ShadowRoot): Element | undefined => {
        for (const element of root.querySelectorAll("*")) {
          if (element.getAttribute("context-menu")) return element
          const inside = element.shadowRoot && walk(element.shadowRoot)
          if (inside) return inside
        }
        return undefined
      }
      const { x, y, width } = walk(document)!.getBoundingClientRect()
      return { x: x + width / 2, y: y + 6 }
    })
    await other.mouse.click(grid.x, grid.y, { button: "right" })
    await other.waitForTimeout(600)
    expect(await other.locator(".PartMenu").count()).toBe(0)
    expect(await other.locator("ui-popup[data-spell-action-menu]").count()).toBe(1)
    await other.keyboard.press("Escape")
    await other.waitForTimeout(400)
    expect(await other.locator("ui-popup[data-spell-action-menu]").count()).toBe(0)
    await other.close()
  })

  test("a project's code closes, and stays closed;  Show in Code opens it", async () => {
    const code = page.locator(".InputEditor .monaco-editor")
    expect(await code.count()).toBe(1)
    await page.locator(".ModeTabs .CodeToggle [part~=item]").first().click()
    await page.waitForTimeout(800)
    expect(await code.count()).toBe(0)
    await page.locator(".ModeTabs .CodeToggle [part~=item]").first().click()
    await page.waitForSelector(".InputEditor .monaco-editor", { timeout: 30_000 })
  })

  test("the palette stays pinned across a reload", async () => {
    await page.locator("#AddPartButton").click()
    await page.waitForTimeout(600)
    await page.locator(".PalettePopup .PalettePin").click()
    await page.waitForTimeout(600)
    expect(await page.locator(".PaletteStrip").count()).toBe(1)
    await page.reload()
    await page.waitForSelector(".PaletteStrip", { timeout: 60_000 })
    await page.locator(".PaletteStrip .PalettePin").click()
    await page.waitForTimeout(600)
    expect(await page.locator(".PaletteStrip").count()).toBe(0)
  })

  test("a page that draws, its whole drawing in its shadow root, says nothing of dragging (T77)", async () => {
    const other = await browser.newContext({ viewport: { width: 1440, height: 800 } })
    // FizzBuzz with its Explainer turned on, as a person would in its project file;  nothing saved
    await other.route(/\/api\/projects\/index\//, async (route) => {
      const response = await route.fetch()
      const index = (await response.json()) as { imports?: { path: string; active: boolean }[] }
      for (const each of index.imports ?? []) if (each.path.endsWith("/Explainer.spellml")) each.active = true
      await route.fulfill({ response, json: index })
    })
    await other.route(/\/api\/projects\/file\//, (route) =>
      route.request().method() === "GET" ? route.continue() : route.fulfill({ status: 200, body: "{}" })
    )
    const explainer = await other.newPage()
    await explainer.goto(`${EDITOR}edit/@spell/examples/fizzbuzz`, { timeout: 60_000 })
    await explainer.waitForSelector(".AppPaneBody .App > *", { timeout: 60_000 })
    await explainer.waitForTimeout(SETTLE_MS)
    const shown = await explainer.evaluate(() => {
      const element = document.querySelector(".AppPaneBody .App > *")!
      const prompt = document.querySelector(".EmptyAppPrompt")!
      return { drawn: element.shadowRoot!.childElementCount > 0, prompt: getComputedStyle(prompt).display }
    })
    expect(shown).toEqual({ drawn: true, prompt: "none" })
    await other.close()
  })
})
