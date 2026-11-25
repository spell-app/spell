import { chromium, type Browser, type BrowserContext, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { Alignment } from "spell/test-helpers/Alignment"
import { CodeEditor, EDITOR, SERVING, openAddPanel } from "./runningEditor"

/**
 * Adding, moving and removing parts from the running editor, by a real mouse and keys (epic `editor`, Add And Move).
 * - A blank program, starting from nothing:  every step reads the file's real text, not what's drawn.
 * - NOTHING reaches the disk:  the program's file and every save are answered here,
 *   so the built-in examples can't change.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** The file a blank program is answered for:  the example's text never read. */
const FILE = "TaskList.spell"

/** The address of that file, loaded or saved, and of no other. */
const PROGRAM_URL = /\/TaskList\.spell(\?.*)?$/

/** A program with nothing in it, in plain Spell (the tag form is gone:  epic `language` P47;  I62). */
const BLANK = `# A new app

blank is an app
\tto draw blank
\t\t<container>
\t\t</>
`

/** What a compile and redraw takes, at most. */
const SETTLE_MS = 2500

/** How long the mouse rests on an add bar button before its menu shows:  the page's hover delay, and some (T162). */
const HOVER_OPENS_MS = 1500

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
  const written = async () => {
    const lines = (await text()).split("\n")
    const start = lines.findIndex((line) => line.trim() === "<container>")
    const indent = /^\s*/.exec(lines[start]!)![0]
    // to its own closing `</>`, at its indent
    const end = lines.findIndex((line, at) => at > start && line === `${indent}</>`)
    return lines
      .slice(start + 1, end)
      .map((line) => line.trim())
      .filter(Boolean)
  }

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
    await openAddPanel(page)
    await page.waitForTimeout(800)
    const row = await page.locator(`.PalettePanel ui-tree-item[label="${label}"]`).first().boundingBox()
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
    await context.route(/\/api\/projects\/file\/|\.(spell)(\?.*)?$/, (route) => {
      const request = route.request()
      // Show in Code puts the file's name in the page's address:  a reload is the page, not the file
      if (request.isNavigationRequest()) return route.continue()
      // the program's own file alone:  its compiled `TaskList.spell.js` is saved too, on a compile not cached yet
      const isProgram = PROGRAM_URL.test(request.url())
      if (request.method() !== "GET") {
        if (isProgram) saved = request.postData() ?? ""
        return route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
      }
      return isProgram ? route.fulfill({ contentType: "text/plain", body: saved ?? BLANK }) : route.continue()
    })
    page = await context.newPage()
    await page.goto(`${EDITOR}edit/@spell/examples/TaskList`, { timeout: 60_000 })
    await page.waitForSelector(".InspectAppButton", { state: "attached", timeout: 60_000 })
    await page.waitForTimeout(6000)
    await page.evaluate(() => (window as unknown as { Inspector: { toggle(): void } }).Inspector.toggle())
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
    expect(saved).toContain("blank is an app")
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

  /** The words of the menu row that has the focus, inside its shadow root. */
  const focusedRow = () =>
    page.evaluate(() => {
      let at = document.activeElement
      while (at?.shadowRoot?.activeElement) at = at.shadowRoot.activeElement
      const host = (at?.getRootNode() as ShadowRoot | undefined)?.host
      return (host ?? at)?.textContent?.trim() ?? ""
    })

  test("Delete, by click and by Enter, closes the menu, though it greys itself once it has run", async () => {
    const before = await written()
    for (const how of ["click", "Enter"] as const) {
      const [card] = await drawn("ui-card")
      await page.mouse.click(card!.x, card!.y, { button: "right" })
      await page.waitForTimeout(500)
      if (how === "click") await page.locator('.PartMenu ui-action:has-text("Delete")').click()
      else {
        // down the rows to Delete:  Inspect's come first (T160)
        for (let row = 0; row < 8 && !(await focusedRow()).startsWith("Delete"); row++)
          await page.keyboard.press("ArrowDown")
        expect(await focusedRow()).toMatch(/^Delete/)
        await page.keyboard.press("Enter")
      }
      await page.waitForTimeout(SETTLE_MS)
      expect(await written()).toHaveLength(before.length - 1)
      expect(await page.locator(".PartMenu").count()).toBe(0)
      await press("ControlOrMeta+z")
      expect(await written()).toEqual(before)
    }
  })

  /**
   * The part menu's rows on `on`:  each one's words, and whether it's greyed, with why.
   * - Inspect Other Views, with parts to pick at its side, is a `<ui-submenu>`:  its words are its `label`,
   *   its side menu not read.
   */
  const menuRows = (on: Page) =>
    on.evaluate(() =>
      [...document.querySelectorAll(".PartMenu ui-menu.BarMenuItems > :is(ui-action, ui-submenu)")].map((row) => ({
        title:
          row.getAttribute("kind") === "divider" ? "-" : (row.getAttribute("label") ?? row.textContent ?? "").trim(),
        grey: row.hasAttribute("disabled"),
        why: row.getAttribute("title") ?? ""
      }))
    )

  test("the menu's rows, in order, and each of them on a drawn part", async () => {
    const [card] = await drawn("ui-card")
    await page.mouse.click(card!.x, card!.y, { button: "right" })
    await page.waitForTimeout(500)
    const rows = await menuRows(page)
    // Inspect first, by the mouse;  Show in Code and Change This together at the bottom (T160)
    expect(rows.map((row) => row.title)).toEqual([
      expect.stringMatching(/^Inspect /),
      "Inspect Other Views",
      "-",
      // the editor's own Undo and Redo, named for its next step (T171)
      expect.stringMatching(/^Undo/),
      expect.stringMatching(/^Redo/),
      "Cut",
      "Copy",
      "Paste",
      "Duplicate",
      "Delete",
      "-",
      "Show in Code",
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
    expect(await focused()).toMatch(/^Inspect (?!Other)/)
    await page.keyboard.press("ArrowDown")
    expect(await focused()).not.toMatch(/^Inspect (?!Other)/)
    await page.keyboard.press("Escape")
    await page.waitForTimeout(300)
    expect(await page.locator(".PartMenu").count()).toBe(0)
    expect(await focused()).not.toMatch(/^Inspect/)
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
    const line = (await new CodeEditor(page).caret()).lineNumber
    expect(line).toBeGreaterThan(1)

    await page.mouse.click(card!.x, card!.y, { button: "right" })
    await page.waitForTimeout(500)
    // a card holds parts of its own, so Inspect Other Views is below:  Inspect Card inspects the card (Q37)
    await page
      .locator(".PartMenu ui-menu.BarMenuItems > ui-action", { hasText: /^\s*Inspect / })
      .first()
      .click()
    await page.waitForTimeout(800)
    const state = await page.evaluate(() => {
      const { Inspector } = window as unknown as {
        Inspector: { isOpen: boolean; isInspecting: boolean; allSelected: unknown[] }
      }
      return { isOpen: Inspector.isOpen, isInspecting: Inspector.isInspecting, count: Inspector.allSelected.length }
    })
    expect(state).toEqual({ isOpen: true, isInspecting: false, count: 1 })
  })

  test("holding Option swaps Inspect Card for Inspect Other Views;  letting go swaps it back (Q37)", async () => {
    const [card] = await drawn("ui-card")
    await page.mouse.click(card!.x, card!.y, { button: "right" })
    await page.waitForTimeout(500)
    const inspectRows = async () =>
      (await menuRows(page)).map((row) => row.title).filter((title) => title.startsWith("Inspect "))
    expect(await inspectRows()).toEqual([expect.stringMatching(/^Inspect (?!Other)/), "Inspect Other Views"])
    await page.keyboard.down("Alt")
    await page.waitForTimeout(200)
    expect(await inspectRows()).toEqual(["Inspect Other Views"])
    await page.keyboard.up("Alt")
    await page.waitForTimeout(200)
    expect(await inspectRows()).toEqual([expect.stringMatching(/^Inspect (?!Other)/), "Inspect Other Views"])
    await page.keyboard.press("Escape")
    await page.waitForTimeout(300)
    expect(await page.locator(".PartMenu").count()).toBe(0)
  })

  test("the background is the app:  only Copy, Paste, Show in Code and Inspect;  its tooltips say why", async () => {
    const area = (await page.locator(".AppPaneBody").boundingBox())!
    await page.mouse.click(area.x + area.width - 12, area.y + area.height - 12, { button: "right" })
    await page.waitForTimeout(500)
    const rows = await menuRows(page)
    const grey = rows.filter((row) => row.grey)
    expect(grey.map((row) => row.title)).toEqual(expect.arrayContaining(["Cut", "Duplicate", "Delete"]))
    expect(grey.find((row) => row.title === "Cut")!.why).toMatch(/app itself/)
    expect(rows.find((row) => row.title.startsWith("Inspect "))!.grey).toBe(false)
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
          const { PartEdits } = window as unknown as { PartEdits: { onMenu(at: { x: number; y: number }): void } }
          PartEdits.onMenu({ x, y })
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
    await new CodeEditor(page).lineLocator().first().click()
    await press("ControlOrMeta+a")
    await press("ControlOrMeta+c")
    await page.mouse.click(5, 400)
    expect(await text()).toBe(before)
  })

  test("a card made in a loop can't move or go alone, and the editor says why", async () => {
    const other = await context.newPage()
    await other.goto(`${EDITOR}edit/@spell/examples/Solitaire`, { timeout: 60_000 })
    await other.waitForSelector(".InspectAppButton", { state: "attached", timeout: 60_000 })
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
    expect(await notice()).toMatch(/one line of your program/)
    expect(await source()).toBe(before)

    // its right click:  what would act on it alone is greyed, saying why;  the rest isn't
    await other.mouse.click(box.x, box.y, { button: "right" })
    await other.waitForTimeout(500)
    const rows = await menuRows(other)
    const cut = rows.find((row) => row.title === "Cut")!
    expect(cut.grey).toBe(true)
    expect(cut.why).toMatch(/one line of your program/)
    expect(rows.find((row) => row.title === "Show in Code")!.grey).toBe(false)
    expect(rows.find((row) => row.title.startsWith("Inspect "))!.grey).toBe(false)
    await other.keyboard.press("Escape")
    await other.waitForTimeout(300)
    await other.close()
  })

  test("cards are a list, so Shift takes a run;  and in Run a program keeps its right click", async () => {
    const other = await context.newPage()
    await other.goto(`${EDITOR}edit/@spell/examples/Solitaire`, { timeout: 60_000 })
    await other.waitForSelector(".InspectAppButton", { state: "attached", timeout: 60_000 })
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
          // a menu written in a drawing is a hidden `<spell-context-menu>` in the element it's for
          if (element.localName === "spell-context-menu") {
            return element.parentElement ?? (element.getRootNode() as ShadowRoot).host
          }
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

  test("in Edit, a part inside a program menu shows its items under App Menu, between thick lines, below ours;  Run's is its own (I76, T160)", async () => {
    const other = await context.newPage()
    await other.goto(`${EDITOR}edit/@spell/examples/Solitaire`, { timeout: 60_000 })
    await other.waitForSelector(".InspectAppButton", { state: "attached", timeout: 60_000 })
    await other.waitForTimeout(7000)
    // a face-down card on top of a pile, as it's drawn now
    const topCard = () =>
      other.evaluate(() => {
        const walk = (root: Document | ShadowRoot): { x: number; y: number } | undefined => {
          for (const element of root.querySelectorAll("*")) {
            if (element.localName === "solitaire-card" && !element.nextElementSibling) {
              const { x, y, width, height } = element.getBoundingClientRect()
              if (y > 0) return { x: x + width / 2, y: y + height / 2 }
            }
            const inside = element.shadowRoot && walk(element.shadowRoot)
            if (inside) return inside
          }
          return undefined
        }
        return walk(document)!
      })
    const card = await topCard()
    // every row of a menu, the program's by its action's title:  `=` the thick line, `-` a hairline
    const rows = (selector: string) =>
      other.evaluate(
        (menu) =>
          [...document.querySelectorAll(`${menu} ui-menu > :is(ui-action, ui-item, ui-submenu)`)].map((row) =>
            row.getAttribute("kind") === "divider"
              ? row.matches("[appearance~=dashed]")
                ? "="
                : "-"
              : ((row as { action?: { title: string } }).action?.title ??
                (row.getAttribute("label") ?? row.textContent ?? "").trim())
          ),
        selector
      )
    // Solitaire's `<context-menu>`, as Run draws it
    const program = ["Auto Play", "Cheat", "Deal the Cards", "-"]
    /** The program's rows in the part menu:  the four under its App Menu header. */
    const programIn = (shown: string[]) => shown.slice(shown.indexOf("App Menu") + 1, shown.indexOf("App Menu") + 5)
    // Inspect, ours, then Solitaire's `<context-menu>` under its header, then Show in Code and Change This (T160)
    await other.mouse.click(card.x, card.y, { button: "right" })
    await other.waitForTimeout(600)
    const shown = await rows(".PartMenu")
    expect(shown).toEqual([
      expect.stringMatching(/^Inspect /),
      "Inspect Other Views",
      "-",
      // the editor's own Undo and Redo, named for its next step (T171)
      expect.stringMatching(/^Undo/),
      expect.stringMatching(/^Redo/),
      "Cut",
      "Copy",
      "Paste",
      "Duplicate",
      "Delete",
      "=",
      "App Menu",
      "Auto Play",
      "Cheat",
      "Deal the Cards",
      "-",
      // the app's own, named for it in Edit (T171)
      "Undo in Solitaire",
      "Redo in Solitaire",
      "=",
      "Show in Code",
      "Change This..."
    ])
    const thickness = await other.evaluate(() => {
      const line = document
        .querySelector(".PartMenu ui-action[kind=divider][appearance~=dashed]")!
        .shadowRoot!.querySelector("[part~=item]")!
      const hairline = document.querySelector(".PartMenu ui-action[kind=divider]:not([appearance~=dashed])")!
      return [line, hairline.shadowRoot!.querySelector("[part~=item]")!].map(
        (one) => getComputedStyle(one).borderTopWidth
      )
    })
    expect(thickness).toEqual(["2px", "1px"])
    // one of the program's items runs through its core, and the menu goes:  Cheat turns a card face up
    const faceDown = () =>
      other.evaluate(() => {
        let count = 0
        const walk = (root: Document | ShadowRoot) => {
          for (const element of root.querySelectorAll("*")) {
            if (element.localName === "solitaire-card" && element.getAttribute("direction") === "down") count++
            if (element.shadowRoot) walk(element.shadowRoot)
          }
        }
        walk(document)
        return count
      })
    const before = await faceDown()
    // its row as drawn:  the host draws no box of its own
    const cheat = await other.evaluate(() => {
      const row = [...document.querySelectorAll(".PartMenu ui-menu > :is(ui-action, ui-item)")].find(
        (each) => (each as { action?: { title: string } }).action?.title === "Cheat"
      )!
      const { x, y, height } = row.shadowRoot!.querySelector("[part~=item]")!.getBoundingClientRect()
      return { x, y, height }
    })
    await other.mouse.click(cheat.x + 20, cheat.y + cheat.height / 2)
    await other.waitForTimeout(800)
    expect(await other.locator(".PartMenu").count()).toBe(0)
    expect(await faceDown()).toBeLessThan(before)

    // the Views tree's row of a part:  the same
    await other.evaluate(() => {
      const { Inspector } = window as unknown as { Inspector: { showSelected(): void } }
      Inspector.showSelected()
    })
    await other.waitForTimeout(800)
    // a pile's row, brought into view:  its line, as drawn, not the rows inside it
    const box = await other.evaluate(async () => {
      const row = document.querySelector('.InspectorTree ui-tree-item[label="Discard Pile"]')
      const line = row?.shadowRoot?.querySelector(".row")
      line?.scrollIntoView({ block: "center" })
      await new Promise((settled) => setTimeout(settled, 300))
      const { x, y } = line?.getBoundingClientRect() ?? {}
      return x === undefined ? undefined : { x, y: y! }
    })
    expect(box).toBeDefined()
    await other.mouse.click(box!.x + 40, box!.y + 10, { button: "right" })
    await other.waitForTimeout(600)
    expect(programIn(await rows(".PartMenu"))).toEqual(program)
    await other.keyboard.press("Escape")
    await other.waitForTimeout(300)

    // Run:  the program's menu alone, as before
    await other.locator('.ModeTabs ui-item:has-text("Run")').first().click()
    await other.waitForTimeout(1500)
    const inRun = await topCard()
    await other.mouse.click(inRun.x, inRun.y, { button: "right" })
    await other.waitForTimeout(600)
    expect(await other.locator(".PartMenu").count()).toBe(0)
    const run = await rows("ui-popup[data-spell-action-menu]")
    expect(run.slice(0, 4)).toEqual(program)
    expect(run).not.toContain("=")
    expect(run).not.toContain("Cut")
    await other.keyboard.press("Escape")
    await other.close()
  })

  test("a right click on a card:  the menu at once, for it;  never the browser's, even on the menu (Owen, 2026-11-12)", async () => {
    const other = await context.newPage()
    await other.goto(`${EDITOR}edit/@spell/examples/Solitaire`, { timeout: 60_000 })
    await other.waitForSelector(".InspectAppButton", { state: "attached", timeout: 60_000 })
    await other.waitForTimeout(7000)
    // every right click, as the page has dealt with it:  did the browser's own menu stay away?
    await other.evaluate(() => {
      const seen: { prevented: boolean; menuMs?: number }[] = []
      Object.assign(window, { rightClicks: seen })
      window.addEventListener(
        "contextmenu",
        (event) => {
          const click: { prevented: boolean; menuMs?: number } = { prevented: false }
          seen.push(click)
          setTimeout(() => (click.prevented = event.defaultPrevented))
          // how long until the part menu is open, measured in the page:  it may be busy just after
          const start = performance.now()
          const look = () => {
            if (document.querySelector("ui-popup.PartMenu")?.matches(":popover-open"))
              click.menuMs = performance.now() - start
            else if (performance.now() - start < 5000) requestAnimationFrame(look)
          }
          requestAnimationFrame(look)
        },
        { capture: true }
      )
      const { Inspector } = window as unknown as { Inspector: { letGo(): void } }
      Inspector.letGo()
    })
    // the top card of each pile, and its element, to tell which is selected
    const cards = await other.evaluate(() => {
      const found: Element[] = []
      const walk = (root: Document | ShadowRoot) => {
        for (const element of root.querySelectorAll("*")) {
          if (element.localName === "solitaire-card" && !element.nextElementSibling) found.push(element)
          if (element.shadowRoot) walk(element.shadowRoot)
        }
      }
      walk(document)
      const shown = found.filter((card) => {
        const { top, bottom } = card.getBoundingClientRect()
        return top > 0 && bottom < innerHeight
      })
      Object.assign(window, { topCards: shown })
      return shown.map((card) => {
        const { x, y, width, height } = card.getBoundingClientRect()
        return { x: x + width / 2, y: y + height / 2 }
      })
    })
    const card = cards.at(-1)!
    const rightClicks = () =>
      other.evaluate(
        () => (window as unknown as { rightClicks: { prevented: boolean; menuMs?: number }[] }).rightClicks
      )
    const selectedIs = (index: number) =>
      other.evaluate((at) => {
        const { Inspector, topCards } = window as unknown as {
          Inspector: { allSelected: { element?: Element }[] }
          topCards: Element[]
        }
        return Inspector.allSelected.at(-1)?.element === topCards[at]
      }, index)

    // at once:  the menu, then the card's selection, which draws the Inspector's card (seconds, with code in it)
    await other.mouse.click(card.x, card.y, { button: "right" })

    await other.waitForTimeout(SETTLE_MS)
    // ~4.6s before (2026-11-12, Inspector open);  ~0.1s since
    expect((await rightClicks())[0]!.menuMs).toBeLessThan(500)
    expect(await selectedIs(cards.length - 1)).toBe(true)

    // a quick second right click, on the menu itself
    const menu = (await other.locator("ui-popup.PartMenu").boundingBox())!
    await other.mouse.click(menu.x + 20, menu.y + 20, { button: "right" })
    await other.waitForTimeout(300)
    expect((await rightClicks()).map((click) => click.prevented)).toEqual([true, true])

    // a Mac's Control-click is a right click:  the menu, and no drag of the card under it
    await other.keyboard.press("Escape")
    const next = cards.at(-2)!
    await other.keyboard.down("Control")
    await other.mouse.move(next.x, next.y)
    await other.mouse.down()
    await other.mouse.move(next.x + 40, next.y + 40, { steps: 5 })
    const isDragging = await other.evaluate(() =>
      [...document.body.children].some((element) => /grabbing/.test((element as HTMLElement).style.cssText))
    )
    await other.mouse.up()
    await other.keyboard.up("Control")
    if (process.platform === "darwin") {
      expect(isDragging).toBe(false)
      expect(await other.evaluate(() => !!document.querySelector("ui-popup.PartMenu")?.matches(":popover-open"))).toBe(
        true
      )
    }
    await other.keyboard.press("Escape")
    await other.close()
  })

  test("Inspect Card inspects the card;  Inspect Other Views lists the parts seen under the mouse, which rings and selects (P31, Q37, T160)", async () => {
    const other = await context.newPage()
    await other.goto(`${EDITOR}edit/@spell/examples/Solitaire`, { timeout: 60_000 })
    await other.waitForSelector(".InspectAppButton", { state: "attached", timeout: 60_000 })
    await other.waitForTimeout(7000)
    // a face-up card on top of its pile, with a picture inside it:  where a right click lands on all of them
    const at = await other.evaluate(() => {
      const cards: Element[] = []
      const walk = (root: Document | ShadowRoot) => {
        for (const element of root.querySelectorAll("*")) {
          if (element.localName === "solitaire-card" && !element.nextElementSibling) cards.push(element)
          if (element.shadowRoot) walk(element.shadowRoot)
        }
      }
      walk(document)
      const PICTURE = "solitaire-card-image"
      // the last column's top card:  face up, fanned over the cards under it
      const card = cards
        .filter((each) => {
          const { top, bottom, width } = each.getBoundingClientRect()
          return width && top > 0 && bottom < innerHeight && each.shadowRoot?.querySelector(PICTURE)
        })
        .at(-1)!
      Object.assign(window, { theCard: card })
      const { Inspector } = window as unknown as { Inspector: { letGo(): void } }
      Inspector.letGo()
      const { x, y, width, height } = card.getBoundingClientRect()
      return { x: x + width / 2, y: y + height / 2 }
    })
    const inspectCard = other.locator("ui-popup.PartMenu ui-menu.BarMenuItems > ui-action", { hasText: /^\s*Inspect / })
    const inspectRow = other.locator("ui-popup.PartMenu ui-submenu.InspectRow")
    /** What's selected last, as the card or its picture. */
    const selected = () =>
      other.evaluate(() => {
        const { Inspector, theCard } = window as unknown as {
          Inspector: { allSelected: { element?: Element }[]; isOpen: boolean }
          theCard: Element
        }
        const element = Inspector.allSelected.at(-1)?.element
        const which =
          element === theCard ? "card" : theCard.shadowRoot!.contains(element!) ? element!.localName : "other"
        return { which, count: Inspector.allSelected.length, isOpen: Inspector.isOpen }
      })

    // its first row names the card's type, and inspects the card;  Inspect Other Views is below it
    await other.mouse.click(at.x, at.y, { button: "right" })
    await other.waitForTimeout(600)
    expect((await inspectCard.first().textContent())!.trim()).toMatch(/^Inspect Card/)
    expect(await inspectRow.getAttribute("label")).toBe("Inspect Other Views")
    await inspectCard.first().click()
    await other.waitForTimeout(800)
    expect(await other.locator("ui-popup.PartMenu").count()).toBe(0)
    expect(await selected()).toEqual({ which: "card", count: 1, isOpen: true })

    // Inspect Other Views:  the parts seen under the mouse, outermost first, each inside the one before, flat (T160)
    await other.mouse.click(at.x, at.y, { button: "right" })
    await other.waitForTimeout(600)
    await inspectRow.locator("[part~=title]").first().hover()
    await other.waitForTimeout(600)
    expect(await inspectRow.evaluate((row) => row.matches(":state(open)"))).toBe(true)
    const rows = await inspectRow.locator(":scope > ui-action").evaluateAll((actions) =>
      actions.map((action) => ({
        title: action.textContent!.trim(),
        // no tick, no indent:  a flat list (T160)
        ticked: action.hasAttribute("selected") || action.hasAttribute("active"),
        indent: getComputedStyle(action.shadowRoot!.querySelector("[part~=item]")!).paddingInlineStart
      }))
    )
    expect(rows.length).toBeGreaterThanOrEqual(4)
    expect(rows.some((row) => row.ticked)).toBe(false)
    expect(new Set(rows.map((row) => row.indent)).size).toBe(1)
    // one card, the one on top:  the cards it covers there are left out (T160)
    expect(rows.filter((row) => row.title.startsWith('Card "')).length).toBe(1)
    const card = rows.findIndex((row) => row.title.startsWith('Card "'))
    // the pile round it (a column) just before it;  its picture after it
    expect(rows[card - 1]!.title).toMatch(/^Column /)

    // pointing at the picture rings it;  choosing it selects it, and the properties card shows it
    const picture = inspectRow.locator(":scope > ui-action").nth(card + 1)
    await picture.hover()
    await other.waitForTimeout(300)
    expect(
      await other.evaluate(() => {
        const { theCard } = window as unknown as { theCard: Element }
        const image = theCard.shadowRoot!.querySelector("solitaire-card-image:not([hidden])")!
        const box = document.querySelector<HTMLElement>(".InspectorHover")
        return image.hasAttribute("data-inspect-hover") || (!!box && !box.hidden)
      })
    ).toBe(true)
    await picture.click()
    await other.waitForTimeout(800)
    expect(await selected()).toEqual({ which: "solitaire-card-image", count: 1, isOpen: true })
    expect(await other.locator("ui-popup.PartMenu").count()).toBe(0)

    // on the app's background, nothing under it but the app:  Inspect alone, no Inspect Other Views
    const area = (await other.locator(".AppPaneBody").boundingBox())!
    await other.mouse.click(area.x + area.width - 12, area.y + area.height - 12, { button: "right" })
    await other.waitForTimeout(600)
    expect(await inspectRow.count()).toBe(0)
    expect(await other.locator('ui-popup.PartMenu ui-action:has-text("Inspect")').count()).toBe(1)
    await other.keyboard.press("Escape")
    await other.waitForTimeout(300)

    // C3:  with Inspect app on, a long press opens the same menu, for the card;  no drag, and the press selects nothing
    await other.evaluate(() => {
      const { Inspector } = window as unknown as { Inspector: { letGo(): void; startInspecting(): void } }
      Inspector.letGo()
      Inspector.startInspecting()
    })
    await other.waitForTimeout(300)
    await other.mouse.move(at.x, at.y)
    await other.mouse.down()
    await other.waitForTimeout(900)
    expect((await inspectCard.first().textContent())!.trim()).toMatch(/^Inspect Card/)
    await other.mouse.up()
    await other.waitForTimeout(300)
    expect(await other.locator("ui-popup.PartMenu").count()).toBe(1)
    expect(
      await other.evaluate(() =>
        [...document.body.children].some((element) => /grabbing/.test((element as HTMLElement).style.cssText))
      )
    ).toBe(false)
    await other.keyboard.press("Escape")
    // a press that moves is no long press
    await other.mouse.move(at.x, at.y)
    await other.mouse.down()
    await other.mouse.move(at.x + 30, at.y + 30, { steps: 4 })
    await other.waitForTimeout(900)
    expect(await inspectRow.count()).toBe(0)
    await other.mouse.up()
    await other.keyboard.press("Escape")
    await other.close()
  })

  test("in Edit, the game's own right-click menu is under App Menu, between thick lines, below the editor's (T120, T160)", async () => {
    const other = await context.newPage()
    await other.goto(`${EDITOR}edit/@spell/examples/Solitaire`, { timeout: 60_000 })
    await other.waitForSelector(".InspectAppButton", { state: "attached", timeout: 60_000 })
    await other.waitForTimeout(7000)
    await other.evaluate(() => (window as unknown as { Inspector: { letGo(): void } }).Inspector.letGo())
    // a pile, and the top card of the last one:  each its own element, the game's menu up their chain
    const [pile, card] = await other.evaluate(() => {
      const found: Element[] = []
      const walk = (root: Document | ShadowRoot) => {
        for (const element of root.querySelectorAll("*")) {
          if (element.localName === "solitaire-column") found.push(element)
          if (element.shadowRoot) walk(element.shadowRoot)
        }
      }
      walk(document)
      const box = (element: Element, low = false) => {
        const { x, y, width, height } = element.getBoundingClientRect()
        return { x: x + width / 2, y: low ? y + height - 6 : y + Math.min(height / 2, 30) }
      }
      const last = found.at(-1)!
      return [box(found[0]!, true), box(last.querySelector(":scope > solitaire-card:last-child")!)]
    })
    /** The part menu's rows:  `=====` for the thick line, `---` for a thin one, `(off)` when greyed. */
    const rows = () =>
      other.evaluate(() =>
        [...document.querySelector("ui-popup.PartMenu ui-menu")!.children].map((element) => {
          if (element.getAttribute("kind") === "divider") {
            return element.matches("[appearance~=dashed]") ? "=====" : "---"
          }
          const { action } = element as Element & { action?: { title: string } }
          const title = action?.title ?? element.getAttribute("label") ?? element.textContent!.trim()
          return element.matches(":state(disabled)") ? `${title} (off)` : title
        })
      )
    const game = ["Auto Play", "Cheat", "Deal the Cards", "---"]

    for (const at of [pile, card]) {
      await other.mouse.click(at.x, at.y, { button: "right" })
      await other.waitForTimeout(SETTLE_MS)
      const shown = await rows()
      // Inspect first, ours, the game's under App Menu between thick lines, then Show in Code and Change This (T160)
      expect(shown[0]).toMatch(/^Inspect /)
      const cut = shown.findIndex((row) => row.startsWith("Cut"))
      expect(shown.slice(cut, cut + 5).map((row) => row.replace(" (off)", ""))).toEqual([
        "Cut",
        "Copy",
        "Paste",
        "Duplicate",
        "Delete"
      ])
      expect(shown.slice(cut + 5, cut + 11)).toEqual(["=====", "App Menu", ...game])
      expect(shown[cut + 11]).toMatch(/^Undo/)
      expect(shown[cut + 12]).toMatch(/^Redo/)
      expect(shown.slice(cut + 13).map((row) => row.replace(" (off)", ""))).toEqual([
        "=====",
        "Show in Code",
        "Change This..."
      ])
      await other.keyboard.press("Escape")
      await other.waitForTimeout(300)
    }

    // the thick line is heavier than the editor's own
    await other.mouse.click(card.x, card.y, { button: "right" })
    await other.waitForTimeout(SETTLE_MS)
    const lines = await other.evaluate(() =>
      [...document.querySelectorAll("ui-popup.PartMenu ui-menu > ui-action[kind=divider]")].map(
        (divider) =>
          `${divider.matches("[appearance~=dashed]") ? "thick" : "thin"} ${getComputedStyle(divider.shadowRoot!.querySelector("[part~=item]")!).borderTopWidth}`
      )
    )
    expect(lines.filter((line) => line.startsWith("thick"))).toEqual(["thick 2px", "thick 2px"])
    expect(lines.filter((line) => line.startsWith("thin")).every((line) => line === "thin 1px")).toBe(true)

    // Cheat runs in the program, as in Run:  the menu closes, and its Undo can undo it
    const cheat = await other.evaluate(() => {
      const item = [...document.querySelectorAll("ui-popup.PartMenu ui-action")].find(
        (action) => (action as Element & { action?: { title: string } }).action?.title === "Cheat"
      )!
      const { x, y, width, height } = item.shadowRoot!.querySelector("[part~=item]")!.getBoundingClientRect()
      return { x: x + width / 2, y: y + height / 2 }
    })
    await other.mouse.click(cheat.x, cheat.y)
    await other.waitForTimeout(SETTLE_MS)
    expect(await other.locator("ui-popup.PartMenu").count()).toBe(0)
    await other.mouse.click(card.x, card.y, { button: "right" })
    await other.waitForTimeout(SETTLE_MS)
    const after = await rows()
    const undoInApp = after.indexOf("Undo in Solitaire")
    expect(undoInApp).toBeGreaterThan(after.indexOf("App Menu"))
    await other.keyboard.press("Escape")
    await other.close()
  })

  test("a project's code closes, and stays closed;  Show in Code opens it", async () => {
    const code = page.locator(".InputEditor .cm-editor")
    expect(await code.count()).toBe(1)
    await page.locator(".ModeTabs .CodeToggle [part~=item]").first().click()
    await page.waitForTimeout(800)
    expect(await code.count()).toBe(0)
    await page.locator(".ModeTabs .CodeToggle [part~=item]").first().click()
    await page.waitForSelector(".InputEditor .cm-editor", { timeout: 30_000 })
  })

  test("the add bar runs down the left edge in Edit, the app then the code across;  its groups open beside it, its stars stay, its + opens everything (T151, T152, T173, T174)", async () => {
    const popupShows = () =>
      page.evaluate(() => !!document.querySelector<HTMLElement & { visible?: boolean }>(".PalettePanel")?.visible)

    // the bar's Edit tab, then 16px to its icons (Inspect app, the code, the compiled code, Anatomy), 1px apart
    // (I250, C5;  Anatomy, P34;  T168's order);  no "+ Add a View" since T167:  ⌥⌘V opens the add panel
    const modeBar = await page.evaluate(() => {
      const drawn = (selector: string) =>
        document.querySelector(selector)!.shadowRoot!.querySelector("[part~=item]")!.getBoundingClientRect()
      const tabs = [...document.querySelectorAll("ui-menu.ModeTabs > ui-item:not([appearance~=circular])")]
      const edit = tabs.at(-1)!.shadowRoot!.querySelector("[part~=item]")!.getBoundingClientRect()
      const [inspect, code, compiled, anatomy] = [
        ".InspectAppButton",
        ".CodeToggle",
        ".CompiledCodeToggle",
        ".AnatomyButton"
      ].map((name) => drawn(`ui-menu.ModeTabs ${name}`))
      return {
        gaps: [
          inspect.left - edit.right,
          code.left - inspect.right,
          compiled.left - code.right,
          anatomy.left - compiled.right
        ].map(Math.round),
        addButtons: document.querySelectorAll(".AddPartButton").length
      }
    })
    expect(modeBar).toEqual({ gaps: [16, 1, 1, 1], addButtons: 0 })

    expect(await popupShows()).toBe(false)

    // the add bar, the app, then the code at the far right (T151, Owen's B)
    await page.waitForSelector(".PaletteRail ui-item.PaletteRailButton", { timeout: 60_000, state: "attached" })
    await page.waitForTimeout(1000)
    const across = () =>
      page.evaluate(() => {
        const left = (selector: string) => document.querySelector(selector)?.getBoundingClientRect().left ?? -1
        const rail = document.querySelector(".PaletteRail")!.getBoundingClientRect()
        const buttons = [...document.querySelectorAll<HTMLElement>(".PaletteRail ui-item.PaletteRailButton")]
        return {
          order: [left(".PaletteRail"), left(".AppPane"), left(".InputEditor")].every(
            (at, index, all) => at >= 0 && (index === 0 || at > all[index - 1]!)
          ),
          railWidth: Math.round(rail.width),
          // each button a 32px square, its icon centred in it
          squares: buttons.every((button) => {
            const box = (button.shadowRoot?.querySelector("[part~=item]") ?? button).getBoundingClientRect()
            return Math.round(box.width) === 32 && Math.round(box.height) === 32
          }),
          centred: buttons.every((button) => {
            const box = (button.shadowRoot?.querySelector("[part~=item]") ?? button).getBoundingClientRect()
            const icon = button.shadowRoot?.querySelector("ui-icon, [part~=icon]")?.getBoundingClientRect()
            if (!icon) return true
            const middle = (a: number, b: number) => (a + b) / 2
            return (
              Math.abs(middle(icon.left, icon.right) - middle(box.left, box.right)) <= 0.5 &&
              Math.abs(middle(icon.top, icon.bottom) - middle(box.top, box.bottom)) <= 0.5
            )
          }),
          names: buttons.map((button) => button.getAttribute("aria-label") ?? ""),
          // no tooltips:  a group's menu, opening as the mouse rests, names it (T162)
          tooltips: buttons.some((button) => button.hasAttribute("data-tooltip")),
          // a + atop, saying what it's for;  the buttons 4px apart (T162)
          plus: !!document.querySelector(".PaletteRail .PaletteRailAdd ui-icon[name=plus]"),
          touching: (() => {
            const top = (button: Element) =>
              button.shadowRoot!.querySelector("[part~=item]")!.getBoundingClientRect().top
            return (
              Math.min(...buttons.slice(1).map((button, index) => Math.round(top(button) - top(buttons[index]!)))) ===
              36
            )
          })(),
          // docked to the window's left edge:  no room on its left, its left corners square (T162)
          docked:
            rail.left === 0 && getComputedStyle(document.querySelector(".PaletteRail")!).borderTopLeftRadius === "0px"
        }
      })
    const laidOut = await across()
    expect(laidOut).toMatchObject({
      order: true,
      railWidth: 40,
      squares: true,
      centred: true,
      tooltips: false,
      plus: true,
      touching: true,
      docked: true
    })
    // every row in it lined up (the kit's alignment check)
    expect(Alignment.report(await Alignment.scanPage(page, { within: ".PaletteRailPlace" }))).toEqual([])
    expect(laidOut.names).toContain("Layout")

    // a group's button opens its parts beside the bar as the mouse rests on it (T162);  Escape closes it
    const flyoutsOpen = () =>
      page.evaluate(
        () =>
          [...document.querySelectorAll(".PaletteFlyout")].filter(
            (menu) => (menu as HTMLElement & { visible?: boolean }).visible
          ).length
      )
    await page.locator('.PaletteRail ui-item.PaletteRailButton[aria-label="Layout"] [part~=item]').hover()
    await page.waitForTimeout(HOVER_OPENS_MS)
    expect(await flyoutsOpen()).toBe(1)
    const layout = page.locator('ui-popup.PaletteFlyout[aria-label="Layout"]')
    expect(await layout.locator('ui-tree-item[label="Grid"]').count()).toBe(1)
    // its search, a button beside its name until clicked (T162), keeps only the matches, by name, other names or
    // description (Column's says it's a grid's)
    const allRows = await layout.locator("ui-tree-item").count()
    await layout.locator(".PaletteFlyoutSearch [part~=opener]").click()
    await page.waitForTimeout(300)
    expect(await layout.locator(".PaletteFlyoutSearch input").getAttribute("placeholder")).toBe("Search Layout")
    await layout.locator(".PaletteFlyoutSearch input").fill("grid")
    await page.waitForTimeout(400)
    const gridRows = await layout
      .locator("ui-tree-item")
      .evaluateAll((rows) => rows.map((row) => row.getAttribute("label")))
    expect(gridRows).toContain("Grid")
    expect(gridRows.length).toBeLessThan(allRows)
    await layout.locator(".PaletteFlyoutSearch input").fill("")
    await page.waitForTimeout(400)

    // a part's star puts it atop the bar, starred;  a right click takes the star away (T152)
    await layout.locator('ui-tree-item[label="Grid"]').locator("[part~=row]").first().hover()
    // its icon alone, no tooltip (T162)
    const star = layout.locator('ui-tree-item[label="Grid"] > ui-button.PaletteStar')
    expect(await star.getAttribute("data-tooltip")).toBeNull()
    await star.locator("[part~=button]").click()
    await page.waitForTimeout(400)
    expect(await page.locator(".PaletteRail ui-item.PaletteFavorite").count()).toBe(1)
    await page.keyboard.press("Escape")
    await page.waitForTimeout(600)
    expect(await flyoutsOpen()).toBe(0)
    // ... kept across a reload
    await page.reload()
    await page.waitForSelector(".PaletteRail ui-item.PaletteFavorite", { timeout: 60_000, state: "attached" })
    // its click picks it up to place with the next click in the app (T153's `PartPlacing`), lit while it's picked up;
    // Escape puts it down, nothing added
    const grids = ((await text()).match(/<(ui-)?grid\b/g) ?? []).length
    const isPicked = () =>
      page.evaluate(() =>
        (window as unknown as { PartPlacing: { isPicked(label: string): boolean } }).PartPlacing.isPicked("Grid")
      )
    await page.locator(".PaletteRail ui-item.PaletteFavorite [part~=item]").click()
    await page.waitForTimeout(400)
    expect(await isPicked()).toBe(true)
    expect(await page.locator(".PaletteRail ui-item.PaletteFavorite[selected]").count()).toBe(1)
    await page.keyboard.press("Escape")
    await page.waitForTimeout(400)
    expect(await isPicked()).toBe(false)
    expect(((await text()).match(/<(ui-)?grid\b/g) ?? []).length).toBe(grids)
    await page.locator(".PaletteRail ui-item.PaletteFavorite [part~=item]").click({ button: "right" })
    await page.waitForTimeout(400)
    expect(await page.locator(".PaletteRail ui-item.PaletteFavorite").count()).toBe(0)

    // the `+` opens the whole add panel beside the bar as the mouse rests on it, in columns, the cursor in its search
    // (T174);  its search looks through every part;  choosing one closes it (I176) and adds it
    await page.locator(".PaletteRail .PaletteRailAdd").hover()
    await page.waitForTimeout(HOVER_OPENS_MS)
    const everything = page.locator("ui-popup.PalettePlus")
    expect(await everything.evaluate((panel) => (panel as HTMLElement & { visible?: boolean }).visible)).toBe(true)
    expect(await everything.locator(".PaletteGroup").count()).toBeGreaterThan(4)
    const buttons = ((await text()).match(/<(ui-)?button\b/g) ?? []).length
    await page.keyboard.type("butt")
    await page.waitForTimeout(600)
    expect(await everything.locator('ui-tree-item[label="Button"]').count()).toBeGreaterThan(0)
    await everything.locator('ui-tree-item[label="Button"]').first().locator("[part~=row]").first().click()
    await page.waitForTimeout(SETTLE_MS)
    expect(await flyoutsOpen()).toBe(0)
    expect(((await text()).match(/<(ui-)?button\b/g) ?? []).length).toBe(buttons + 1)

    // ... a click opens it at once;  while it's out, pointing at a group's button opens that one at once, gliding there
    // from the `+`, as one sub-panel (T173):  the button and its panel's header one fill, the panel at the bar's edge,
    // its top the button's
    await page.locator(".PaletteRail .PaletteRailAdd").click()
    await page.waitForTimeout(400)
    expect(await everything.evaluate((panel) => (panel as HTMLElement & { visible?: boolean }).visible)).toBe(true)
    await page.locator('.PaletteRail ui-item.PaletteRailButton[aria-label="Layout"] [part~=item]').hover()
    await page.waitForTimeout(400)
    const joined = await page.evaluate(() => {
      const button = document.querySelector('.PaletteRail ui-item.PaletteRailButton[aria-label="Layout"]')!
      const item = button.shadowRoot!.querySelector("[part~=item]")!
      const popup = document.querySelector('ui-popup.PaletteFlyout[aria-label="Layout"]')!
      const panel = popup.shadowRoot!.querySelector("[part~=popup]")!.getBoundingClientRect()
      const head = popup.querySelector(".PaletteFlyoutHead")!
      const rail = document.querySelector(".PaletteRail")!.getBoundingClientRect()
      return {
        open: [...document.querySelectorAll(".PaletteFlyout")].filter(
          (each) => (each as HTMLElement & { visible?: boolean }).visible
        ).length,
        lit: button.classList.contains("open"),
        oneFill: getComputedStyle(item).backgroundColor === getComputedStyle(head).backgroundColor,
        atEdge: Math.round(panel.left) === Math.round(rail.right),
        sameTop: Math.round(panel.top) === Math.round(item.getBoundingClientRect().top)
      }
    })
    expect(joined).toEqual({ open: 1, lit: true, oneFill: true, atEdge: true, sameTop: true })
    await page.keyboard.press("Escape")
    await page.waitForTimeout(600)
    expect(await flyoutsOpen()).toBe(0)

    // a family's parts inside its main one (T162):  Statistics and Value inside Statistic, found by a search too
    await page.locator('.PaletteRail ui-item.PaletteRailButton[aria-label="Data display"] [part~=item]').hover()
    await page.waitForTimeout(HOVER_OPENS_MS)
    const data = page.locator('ui-popup.PaletteFlyout[aria-label="Data display"]')
    const inside = (outer: string) =>
      data
        .locator(`ui-tree-item[label="${outer}"] > ui-tree-item`)
        .evaluateAll((rows) => rows.map((row) => row.getAttribute("label")))
    expect(await inside("Statistic")).toEqual(["Statistics", "Value"])
    expect(await inside("Card")).toEqual(["Cards"])
    await data.locator(".PaletteFlyoutSearch [part~=opener]").click()
    await data.locator(".PaletteFlyoutSearch input").fill("value")
    await page.waitForTimeout(400)
    expect(await inside("Statistic")).toEqual(["Value"])
    await page.keyboard.press("Escape")
    await page.keyboard.press("Escape")
    await page.waitForTimeout(400)

    // in Run, it goes;  back in Edit, it's back
    await page.evaluate(`window.editor.showRunner()`)
    await page.waitForFunction(`!document.querySelector(".PaletteRailPlace")`, undefined, { timeout: 10_000 })
    await page.evaluate(`window.editor.showEditor()`)
    await page.waitForSelector(".PaletteRailPlace", { timeout: 30_000 })
  })

  test("the palette shows every part, with no scrolling, and closes once one is chosen (I174, I176, I180, I185)", async () => {
    const popupShows = () =>
      page.evaluate(() => !!document.querySelector<HTMLElement & { visible?: boolean }>(".PalettePanel")?.visible)
    await openAddPanel(page)
    await page.waitForTimeout(600)
    // no "N more":  what was behind it shows, under its topic
    expect(await page.locator(".PalettePanel .PaletteMore").count()).toBe(0)
    expect(await page.locator('.PalettePanel ui-tree-item[label="Grid"]').count()).toBe(1)
    // a group of buttons, ready-made;  everything fits, with no scrolling (I180):
    // 6 columns at 1440px wide, rows 20px, so the palette table's longer topics fit an 800px window (I185)
    expect(await page.locator('.PalettePanel ui-tree-item[label="Buttons"]').count()).toBe(1)
    const fits = await page.evaluate(() => {
      const groups = document.querySelector(".PalettePanel .PaletteGroups")!
      const columns = new Set(
        [...document.querySelectorAll(".PalettePanel .PaletteGroup")].map((group) => group.getBoundingClientRect().x)
      )
      return { scrolls: groups.scrollHeight > groups.clientHeight + 1, columns: columns.size }
    })
    expect(fits).toEqual({ scrolls: false, columns: 6 })
    await page.locator(".PalettePanel .PaletteSearch input").fill("grid")
    await page.waitForTimeout(600)
    expect(await page.locator(".PalettePanel .PaletteGroup:not(.ThisApp) ui-tree-item").count()).toBeGreaterThan(0)
    // Escape:  the first empties the search (T163), the next closes the panel
    await page.keyboard.press("Escape")
    await page.keyboard.press("Escape")
    await page.waitForTimeout(600)
    expect(await popupShows()).toBe(false)
    // its key, ⌥⌘V, opens it too (T167)
    await page.keyboard.press("Alt+ControlOrMeta+KeyV")
    await page.waitForSelector("ui-modal.PalettePanel ui-tree-item", { state: "attached", timeout: 30_000 })
    await page.keyboard.press("Escape")
    await page.waitForTimeout(600)
    expect(await popupShows()).toBe(false)
  })

  test("a page that draws, its whole drawing in its shadow root, says nothing of dragging (T77)", async () => {
    const other = await browser.newContext({ viewport: { width: 1440, height: 800 } })
    // FizzBuzz with its Explainer on, as its project file has it since epic `mockup` P19;  nothing saved
    await other.route(/\/api\/projects\/index\//, async (route) => {
      const response = await route.fetch()
      const index = (await response.json()) as { imports?: { path: string; active: boolean }[] }
      for (const each of index.imports ?? []) if (each.path.endsWith("/Explainer.spell")) each.active = true
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
