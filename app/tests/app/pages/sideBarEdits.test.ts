import { execSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { chromium, type BrowserContext, type Page } from "playwright"
import { afterAll, afterEach, beforeEach, describe, expect, test } from "vite-plus/test"

/**
 * A change in the side bar goes into the program's text, in the running editor (epic `editor`, Sidebar Writes Source).
 * - Every step reads the file's real text, not what's drawn.
 * - NOTHING reaches the disk:  every save is answered here, and a reload is handed what was "saved",
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

/** The code editor's chunk, in dev:  never answered, to work without it. */
const CODE_EDITOR = /\/src\/app\/solid\/monaco\//

/** Saves answered here, and what a reload then reads:  by address. */
const saved = new Map<string, string>()

/** A browser context whose saves go nowhere near the disk. */
async function contextWithNoSaving(context: BrowserContext): Promise<void> {
  // the one route:  Playwright asks the last one added first, and a second could let a save through
  await context.route(/\/api\/projects\/file\/|\.(spellml|spell)(\?.*)?$/, (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    if (request.method() !== "GET") {
      saved.set(decodeURI(pathname), request.postData() ?? "")
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
    }
    // a reload reads what was "saved", wherever it reads its source
    const tail = decodeURI(pathname).split("/").pop()!
    const key = [...saved.keys()].find((each) => each.endsWith(`/${tail}`))
    return key ? route.fulfill({ contentType: "text/plain", body: saved.get(key)! }) : route.continue()
  })
}

/** Open `project`, with the Inspector open. */
async function open(page: Page, project: string, { codeEditor }: { codeEditor: boolean }): Promise<void> {
  await page.goto(`${EDITOR}edit/@spell/examples/${project}`, { timeout: 60_000 })
  if (codeEditor) await page.waitForSelector(".monaco-editor .view-line", { timeout: 60_000 })
  // with no code editor to wait for, the page's loading hero gives up after 8 seconds
  else await page.waitForTimeout(9000)
  await page.waitForTimeout(4000)
  await page.locator(".InspectorToggle ui-icon").first().click({ force: true })
  await page.waitForTimeout(1000)
}

/** Select the first element named `tag` by a click on it, as a person does;  `alt`:  a Spell UI element. */
async function select(page: Page, tag: string, { alt = false } = {}): Promise<void> {
  const at = await page.evaluate((name) => {
    const find = (root: Document | ShadowRoot): Element | undefined => {
      for (const element of root.querySelectorAll("*")) {
        if (element.localName === name) return element
        const inside = element.shadowRoot && find(element.shadowRoot)
        if (inside) return inside
      }
      return undefined
    }
    const box = find(document)!.getBoundingClientRect()
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }, tag)
  if (alt) await page.keyboard.down("Alt")
  await page.mouse.click(at.x, at.y)
  if (alt) await page.keyboard.up("Alt")
  await page.waitForSelector("ui-property-editor", { timeout: 8000 })
  await page.waitForTimeout(500)
}

/** Change a field as a field does:  the value written, then `ui-changed`. */
async function change(page: Page, name: string, value: unknown): Promise<void> {
  await page.evaluate(
    ([field, to]) => {
      const form = document.querySelector("ui-property-editor") as HTMLElement & { value: Record<string, unknown> }
      form.value[field as string] = to
      form.dispatchEvent(new CustomEvent("ui-changed", { detail: { name: field, value: to } }))
    },
    [name, value]
  )
  await page.waitForTimeout(200)
}

/** The real text of the project's file named `name`, and is it unsaved?  From the file, not what's drawn. */
function fileState(page: Page, name: string) {
  return page.evaluate((file) => {
    const spellFile = (
      window as unknown as {
        project: { spellFiles: { path: string; contents: string; isDirty: boolean }[] }
      }
    ).project.spellFiles.find((each) => each.path.endsWith(`/${file}`))!
    return { text: spellFile.contents, isDirty: spellFile.isDirty }
  }, name)
}

/** The page's debug globals, what's used of them. */
type DebugGlobals = {
  editor: { loadRuntime(): Promise<{ core: { things: { all(): object[] } } }> }
  Inspector: { inspectThing(thing: object): void }
}

/** Press ⌘Z, or ⇧⌘Z, with the focus off the code. */
async function press(page: Page, keys: string): Promise<void> {
  await page.keyboard.press(keys)
  await page.waitForTimeout(300)
}

describe.skipIf(!SERVING)("the side bar writes the source", () => {
  let context: BrowserContext
  const browser = chromium.launch()

  // a context each:  the Inspector remembers being open
  beforeEach(async () => {
    context = await (await browser).newContext({ viewport: { width: 1440, height: 800 }, colorScheme: "dark" })
    await contextWithNoSaving(context)
  })
  afterEach(() => context.close())
  afterAll(async () => (await browser).close())

  // what this test is for:  the built-in examples stay as they are
  afterEach(() => {
    expect(execSync("git status --short spaces", { cwd: path.join(KIT, "app") }).toString()).toBe("")
  })

  test("with the code editor not loaded:  edit, undo, redo, Save, reload", { timeout: 150_000 }, async () => {
    const page = await context.newPage()
    await page.route(CODE_EDITOR, () => undefined)
    await open(page, "Solitaire", { codeEditor: false })
    const { text: before, isDirty: wasDirty } = await fileState(page, "Solitaire.spellml")
    expect(wasDirty).toBeFalsy()
    expect(before).toContain(`suit = clubs`)

    // a foundation's suit:  a literal, on the line that made it
    await select(page, "solitaire-foundation")
    await change(page, "suit", "hearts")
    const edited = await fileState(page, "Solitaire.spellml")
    expect(edited.text).toBe(before.replace(`suit = clubs`, `suit = hearts`))
    expect(edited.isDirty).toBe(true)

    await press(page, "ControlOrMeta+z")
    expect((await fileState(page, "Solitaire.spellml")).text).toBe(before)
    await press(page, "Shift+ControlOrMeta+z")
    expect((await fileState(page, "Solitaire.spellml")).text).toBe(edited.text)

    await press(page, "ControlOrMeta+s")
    await page.waitForTimeout(500)
    const key = [...saved.keys()].find((each) => each.endsWith("Solitaire.spellml"))!
    expect(saved.get(key)).toContain(edited.text)
    await page.close()

    const reloaded = await context.newPage()
    await reloaded.route(CODE_EDITOR, () => undefined)
    await open(reloaded, "Solitaire", { codeEditor: false })
    expect((await fileState(reloaded, "Solitaire.spellml")).text).toBe(edited.text)
    await reloaded.close()
    saved.clear()
  })

  test(
    "with it loaded:  an edit keeps the typed undo, and undo survives typing elsewhere",
    { timeout: 120_000 },
    async () => {
      const page = await context.newPage()
      await open(page, "Solitaire", { codeEditor: true })
      const { text: before } = await fileState(page, "Solitaire.spellml")
      await select(page, "solitaire-foundation")
      await change(page, "suit", "hearts")
      expect((await fileState(page, "Solitaire.spellml")).text).toBe(before.replace(`suit = clubs`, `suit = hearts`))

      // typing elsewhere, at the top of the file
      await page.locator("ui-item", { hasText: "Solitaire.spellml" }).first().click()
      await page.waitForTimeout(800)
      await page.locator(".monaco-editor .view-line").nth(1).click()
      await page.keyboard.press("ControlOrMeta+ArrowUp")
      await page.keyboard.type("// typed\n")
      await page.waitForTimeout(400)
      const typed = await fileState(page, "Solitaire.spellml")
      expect(typed.text).toContain("// typed")
      expect(typed.text).toContain(`suit = hearts`)

      // the focus off the code:  the side bar's step comes back, and the typing stays
      await page.locator(".InspectorMain").click({ position: { x: 2, y: 2 }, force: true })
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
      await press(page, "ControlOrMeta+z")
      const undone = await fileState(page, "Solitaire.spellml")
      expect(undone.text).toContain(`suit = clubs`)
      expect(undone.text).toContain("// typed")
      await page.close()
    }
  )

  test(
    "a card made in a loop has no line of its own:  it says so, and writes nothing",
    { timeout: 90_000 },
    async () => {
      const page = await context.newPage()
      await open(page, "Solitaire", { codeEditor: false })
      const { text: before } = await fileState(page, "Deck.spellml")
      await select(page, "solitaire-card")
      await change(page, "suit", "hearts")
      expect((await fileState(page, "Deck.spellml")).text).toBe(before)
      expect(await page.locator(".InspectorNotSaved").textContent()).toMatch(/won't be saved/)
      await page.close()
    }
  )

  test(
    "a drawn tag:  an attribute's added, then changed, and the menu says what it'll undo",
    { timeout: 90_000 },
    async () => {
      const page = await context.newPage()
      await open(page, "Counter", { codeEditor: true })
      const { text: before } = await fileState(page, "Counter.spell")
      await select(page, "ui-button")
      await change(page, "color", "red")
      const added = before.replace("<ui-button onClick", `<ui-button color="red" onClick`)
      expect((await fileState(page, "Counter.spell")).text).toBe(added)
      await change(page, "color", "blue")
      expect((await fileState(page, "Counter.spell")).text).toBe(added.replace("red", "blue"))

      // its text is code:  it says so, with a way to it
      await change(page, "textContent", "Press me")
      expect(await page.locator(".InspectorNotSaved").textContent()).toMatch(/comes from code/)
      expect((await fileState(page, "Counter.spell")).text).toBe(added.replace("red", "blue"))

      // one step:  the two changes to one field fold
      await page.locator("ui-item", { hasText: "Edit" }).first().click()
      await page.waitForTimeout(400)
      expect(await page.getByText("Undo Change Color").count()).toBeGreaterThan(0)
      await page.keyboard.press("Escape")
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
      await press(page, "ControlOrMeta+z")
      expect((await fileState(page, "Counter.spell")).text).toBe(before)
      await page.close()
    }
  )

  test("a notebook's lock is a step of the same history", { timeout: 90_000 }, async () => {
    const page = await context.newPage()
    await page.goto(`${EDITOR}edit/@spell/notebooks/Counter`, { timeout: 60_000 })
    await page.waitForFunction(() => "notebook" in window, undefined, { timeout: 40_000 })
    await page.waitForTimeout(2000)
    const text = () =>
      page.evaluate(() => (window as unknown as { notebook: { now: { text: string } } }).notebook.now.text)
    const before = await text()
    await page.evaluate(() =>
      (window as unknown as { notebook: { setLocked(locked: boolean): void } }).notebook.setLocked(true)
    )
    await page.waitForTimeout(300)
    expect(await text()).not.toBe(before)
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    await press(page, "ControlOrMeta+z")
    expect(await text()).toBe(before)
    await press(page, "Shift+ControlOrMeta+z")
    expect(await text()).not.toBe(before)
    await page.close()
  })

  test(
    "a type's default changes in place, and what still holds the old one takes it",
    { timeout: 90_000 },
    async () => {
      const page = await context.newPage()
      await open(page, "Counter", { codeEditor: false })
      const { text: before } = await fileState(page, "Counter.spell")
      // its drawing is one button, which a click selects:  the thing itself comes from the Things view's call
      await page.evaluate(async () => {
        const { editor, Inspector } = window as unknown as DebugGlobals
        const { core } = await editor.loadRuntime()
        Inspector.inspectThing(core.things.all().find((thing) => thing.constructor.name === "Counter")!)
      })
      await page.waitForSelector("ui-property-editor", { timeout: 8000 })
      await page.waitForTimeout(500)
      await page.evaluate(() => {
        // two counters' worth:  another still holding the old default, and one that's moved on
        const form = document.querySelector("ui-property-editor") as HTMLElement & {
          value: { constructor: new () => object }
        }
        const made = new form.value.constructor() as { count: number }
        const moved = new form.value.constructor() as { count: number }
        moved.count = 3
        Object.assign(window, { made, moved })
      })
      await change(page, "count", 5)
      const { text } = await fileState(page, "Counter.spell")
      expect(text).toBe(before.replace("set its count to 0", "set its count to 5"))
      const counts = () =>
        page.evaluate(() => {
          const { made, moved } = window as unknown as Record<"made" | "moved", { count: number }>
          return [made.count, moved.count]
        })
      expect(await counts()).toEqual([5, 3])
      // the first Inspect's help popup holds the keys until it's let go
      await press(page, "Escape")
      await press(page, "ControlOrMeta+z")
      expect((await fileState(page, "Counter.spell")).text).toBe(before)
      expect(await counts()).toEqual([0, 3])
      await page.close()
    }
  )
})
