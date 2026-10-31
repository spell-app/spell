import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { chromium, type Browser, type BrowserContext, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

/**
 * Adding, moving and removing parts from the running editor, by a real mouse and keys (epic `editor`, Add And Move).
 * - A blank program, starting from nothing:  every step reads the file's real text, not what's drawn.
 * - NOTHING reaches the disk:  the program's file and every save are answered here,
 *   so the built-in examples can't change.
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
  })

  afterAll(async () => {
    await browser?.close()
  })

  test("from a blank program:  add, reorder, cut, paste, undo, save, and read real code", async () => {
    const area = (await page.locator(".AppPaneBody").boundingBox())!
    const middle = area.x + area.width / 2

    await fromPalette("Button", middle, area.y + 60)
    expect(await written()).toEqual(["<ui-button>Click me</ui-button>"])

    await fromPalette("Card", middle, area.y + area.height - 40)
    expect(await written()).toEqual([
      "<ui-button>Click me</ui-button>",
      '<ui-card heading="A card" description="What it says"></ui-card>'
    ])

    if ((await page.locator(".InspectAppButton").first().getAttribute("aria-pressed")) !== "true") {
      await page.locator(".InspectAppButton").first().click()
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
      await page.locator(".InspectAppButton").first().click()
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
      await other.locator(".InspectAppButton").first().click()
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
    await other.close()
  })

  test("the palette stays pinned across a reload", async () => {
    await page.locator("#AddPartButton").click()
    await page.waitForTimeout(600)
    await page.locator(".PalettePopup .PalettePin").click()
    await page.waitForTimeout(600)
    expect(await page.locator(".PalettePane").count()).toBe(1)
    await page.reload()
    await page.waitForSelector(".PalettePane", { timeout: 60_000 })
    await page.locator(".PalettePane .PalettePin").click()
    await page.waitForTimeout(600)
    expect(await page.locator(".PalettePane").count()).toBe(0)
  })
})
