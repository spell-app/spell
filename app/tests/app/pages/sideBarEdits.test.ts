import { chromium, type BrowserContext, type Page } from "playwright"
import { afterAll, afterEach, beforeEach, describe, expect, test } from "vite-plus/test"

import { builtInProjectsNow, EDITOR, SERVING } from "./runningEditor"

/**
 * A change in the side bar goes into the program's text, in the running editor (epic `editor`, Sidebar Writes Source).
 * - Every step reads the file's real text, not what's drawn.
 * - NOTHING reaches the disk:  every save is answered here, and a reload is handed what was "saved",
 *   so the built-in examples can't change.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

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
    // a reload reads what was "saved", wherever it reads its source:  by its group, project and name
    const tail = decodeURI(pathname).split("/").slice(-3).join("/")
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

/**
 * Select the first element named `tag` by a click on it, as a person does;  `alt`:  a Spell UI element.
 * - Waits for it to be drawn:  a slow load can still be drawing when the fixed waits in `open()` end.
 */
async function select(page: Page, tag: string, { alt = false } = {}): Promise<void> {
  const drawn = await page.waitForFunction(
    (name) => {
      const find = (root: Document | ShadowRoot): Element | undefined => {
        for (const element of root.querySelectorAll("*")) {
          if (element.localName === name) return element
          const inside = element.shadowRoot && find(element.shadowRoot)
          if (inside) return inside
        }
        return undefined
      }
      const box = find(document)?.getBoundingClientRect()
      return box && { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    },
    tag,
    { timeout: 30_000 }
  )
  const at = (await drawn.jsonValue())!
  // the first Inspect's help popup sits over the app's top:  Counter's one button is under it
  await page.evaluate(() => (window as unknown as { Inspector: { dismissHelp(): void } }).Inspector.dismissHelp())
  await page.waitForTimeout(300)
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

/** How many steps the side bar's history holds. */
function historyLength(page: Page): Promise<number> {
  return page.evaluate(
    () => (window as unknown as { editor: { history: { undoSteps: unknown[] } } }).editor.history.undoSteps.length
  )
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
  let builtInProjectsBefore: string
  beforeEach(() => {
    builtInProjectsBefore = builtInProjectsNow()
  })
  afterEach(() => {
    expect(builtInProjectsNow()).toBe(builtInProjectsBefore)
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
    "a card made in a loop:  this one's to play with, and All Cards edits the card type",
    { timeout: 90_000 },
    async () => {
      const page = await context.newPage()
      await open(page, "Solitaire", { codeEditor: true })
      const { text: before } = await fileState(page, "Deck.spellml")
      await select(page, "solitaire-card")

      // it starts on the card itself, as nothing can change for all of them, and each field says so before any change:
      // a crossed-out save icon after its info icon (Q29);  the switch is one control, [Card · Jack of Diamonds | All Cards]
      const scopes = page.locator(".InspectorScope")
      const words = await scopes.allTextContents()
      expect(words[0]).toMatch(/^Card · /)
      expect(words.slice(1)).toEqual(["All Cards"])
      expect(await scopes.first().getAttribute("selected")).not.toBeNull()
      const unsaved = page.locator("ui-property[name=suit] .unsaved")
      expect(await unsaved.getAttribute("title")).toBe("You can't save this because it is created automatically.")
      expect(await page.locator(".InspectorNotSaved").count()).toBe(0)

      // it plays:  the running card changes, and no file does
      const suit = () =>
        page.evaluate(
          () => (document.querySelector("ui-property-editor") as unknown as { value: { suit: string } }).value.suit
        )
      const was = await suit()
      const other = was === "clubs" ? "hearts" : "clubs"
      await change(page, "suit", other)
      expect(await suit()).toBe(other)
      expect((await fileState(page, "Deck.spellml")).text).toBe(before)
      expect(await historyLength(page)).toBe(0)

      // all cards:  it edits the card type itself (Q29), so its rank and suit are its one-ofs, open to change;
      // switching writes nothing (`thingsAndTemplates` changes them)
      await scopes.nth(1).click({ force: true })
      await page.waitForTimeout(400)
      expect(await scopes.nth(1).getAttribute("selected")).not.toBeNull()
      expect(await page.locator(".InspectorTypeChoices[name=rank]").count()).toBe(1)
      expect((await fileState(page, "Deck.spellml")).text).toBe(before)
      expect((await fileState(page, "Deck.spellml")).text).toBe(before)
      await page.close()
    }
  )

  test(
    "a drawn tag:  an attribute's added, then changed, and the menu says what it'll undo",
    { timeout: 90_000 },
    async () => {
      const page = await context.newPage()
      await open(page, "Counter", { codeEditor: true })
      const { text: before } = await fileState(page, "Counter.spellml")
      await select(page, "ui-button")
      await change(page, "color", "red")
      const added = before.replace("<button onClick", `<button color="red" onClick`)
      expect((await fileState(page, "Counter.spellml")).text).toBe(added)
      await change(page, "color", "blue")
      expect((await fileState(page, "Counter.spellml")).text).toBe(added.replace("red", "blue"))

      // its text is code:  it says so, with a way to it
      await change(page, "textContent", "Press me")
      expect(await page.locator(".InspectorNotSaved").textContent()).toMatch(/comes from code/)
      expect((await fileState(page, "Counter.spellml")).text).toBe(added.replace("red", "blue"))

      // one step:  the two changes to one field fold
      await page.locator("ui-item", { hasText: "Edit" }).first().click()
      await page.waitForTimeout(400)
      expect(await page.getByText("Undo Change Color").count()).toBeGreaterThan(0)
      await page.keyboard.press("Escape")
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
      await press(page, "ControlOrMeta+z")
      expect((await fileState(page, "Counter.spellml")).text).toBe(before)
      await page.close()
    }
  )

  test("what's typed in the code undoes after a click on the app (J116)", { timeout: 90_000 }, async () => {
    const page = await context.newPage()
    await page.goto(`${EDITOR}edit/@spell/examples/Solitaire/Card.spellml`, { timeout: 60_000 })
    await page.waitForSelector(".monaco-editor .view-line", { timeout: 60_000 })
    await page.waitForTimeout(5000)
    const { text: before } = await fileState(page, "Card.spellml")
    await page.locator(".monaco-editor .view-line").nth(1).click()
    await page.keyboard.press("Home")
    await page.keyboard.type("Q")
    await page.waitForTimeout(500)
    const { text: typed } = await fileState(page, "Card.spellml")
    expect(typed).not.toBe(before)

    // in the code:  the code editor's own
    await press(page, "ControlOrMeta+z")
    expect((await fileState(page, "Card.spellml")).text).toBe(before)
    await press(page, "Shift+ControlOrMeta+z")
    expect((await fileState(page, "Card.spellml")).text).toBe(typed)

    // a click on a card moves the focus out of the code:  the key still reaches what was typed
    await select(page, "solitaire-card").catch(() => undefined)
    expect(await page.evaluate(() => document.activeElement?.closest(".monaco-editor"))).toBeNull()
    await press(page, "ControlOrMeta+z")
    expect((await fileState(page, "Card.spellml")).text).toBe(before)
    await press(page, "Shift+ControlOrMeta+z")
    expect((await fileState(page, "Card.spellml")).text).toBe(typed)
    await page.close()
  })

  test("a notebook's lock is a step of the same history", { timeout: 90_000 }, async () => {
    const page = await context.newPage()
    await page.goto(`${EDITOR}edit/@spell/guides/SpellUI/Divider/Usage.spellml`, { timeout: 60_000 })
    await page.waitForFunction(() => "notebook" in window, undefined, { timeout: 40_000 })
    await page.waitForTimeout(2000)
    const text = () => page.evaluate(() => (window as unknown as { notebook: { text(): string } }).notebook.text())
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
      const { text: before } = await fileState(page, "Counter.spellml")
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
      // all counters:  it has a line of its own, so it starts on "This";  the row's item clicked as its own
      await page
        .locator(".InspectorScope")
        .nth(1)
        .evaluate((item) => (item as HTMLElement).click())
      await page.waitForTimeout(300)
      await change(page, "count", 5)
      const { text } = await fileState(page, "Counter.spellml")
      expect(text).toBe(before.replace(">0</property>", ">5</property>"))
      const counts = () =>
        page.evaluate(() => {
          const { made, moved } = window as unknown as Record<"made" | "moved", { count: number }>
          return [made.count, moved.count]
        })
      expect(await counts()).toEqual([5, 3])
      // the first Inspect's help popup holds the keys until it's let go
      await press(page, "Escape")
      await press(page, "ControlOrMeta+z")
      expect((await fileState(page, "Counter.spellml")).text).toBe(before)
      expect(await counts()).toEqual([0, 3])
      await page.close()
    }
  )

  test(
    "this one:  typed in a real field, added to the line that made it, and reset takes it off",
    { timeout: 150_000 },
    async () => {
      const page = await context.newPage()
      await open(page, "Solitaire", { codeEditor: true })
      const { text: before } = await fileState(page, "Solitaire.spellml")
      await select(page, "solitaire-foundation")
      const name = page.locator("ui-property[name=name]")

      // set here:  a dot and a reset, and its tooltip says so
      expect(await name.evaluate((field) => field.matches(":state(here)"))).toBe(true)
      expect(await name.locator(".label").getAttribute("title")).toBe("Set here")

      // a real field, typed in
      const input = name.locator("input")
      await input.fill("mine")
      await input.press("Tab")
      await page.waitForTimeout(400)
      const named = before.replace(`name = "clubs"`, `name = "mine"`)
      expect((await fileState(page, "Solitaire.spellml")).text).toBe(named)

      // the reset takes it off the line, comma and all, as a step of its own
      const suit = page.locator("ui-property[name=suit]")
      await suit.locator("button.origin").click({ force: true })
      await page.waitForTimeout(400)
      const noSuit = named.replace(`name = "mine", suit = clubs`, `name = "mine"`)
      expect((await fileState(page, "Solitaire.spellml")).text).toBe(noSuit)

      // not on its line now:  quieter, and a change adds it back
      await page.waitForFunction(() => document.querySelector("ui-property[name=suit]")?.matches(":state(inherited)"))
      await change(page, "suit", "hearts")
      const added = noSuit.replace(`name = "mine"`, `name = "mine", suit = hearts`)
      expect((await fileState(page, "Solitaire.spellml")).text).toBe(added)

      // what it wrote is what the program does:  started afresh, that foundation is hearts
      const suits = await page.evaluate(async () => {
        const { editor } = window as unknown as DebugGlobals & { editor: { restartApp(): Promise<void> } }
        await (editor as unknown as { restartApp(): Promise<void> }).restartApp()
        await new Promise((resolve) => setTimeout(resolve, 2500))
        const { core } = await editor.loadRuntime()
        const all = core.things.all() as unknown as { name?: string; suit?: string }[]
        return all.filter((thing) => thing.name === "mine").map((thing) => thing.suit)
      })
      expect(suits.at(-1)).toBe("hearts")
      await page.close()
    }
  )

  test(
    "all of them:  a value the type declares changes there, for every one of them",
    { timeout: 90_000 },
    async () => {
      const page = await context.newPage()
      await open(page, "Solitaire", { codeEditor: false })
      const { text: before } = await fileState(page, "Solitaire.spellml")
      await select(page, "solitaire-foundation")
      const layout = page.locator("ui-property[name=layout]")
      expect(await layout.locator(".label").getAttribute("title")).toBe("From Foundation")

      // this one can't:  its type sets it after the line
      await change(page, "layout", "vertical")
      expect((await fileState(page, "Solitaire.spellml")).text).toBe(before)
      expect(await page.locator(".InspectorNotSaved").textContent()).toMatch(/All foundations start with this/)

      // the switch's items, clicked as its row's own
      await page
        .locator(".InspectorScope")
        .nth(1)
        .evaluate((item) => (item as HTMLElement).click())
      await page.waitForTimeout(300)
      await change(page, "layout", "horizontal")
      const declared = `<spell-view "foundation" template="pile"`
      const text = (await fileState(page, "Solitaire.spellml")).text
      expect(text.slice(text.indexOf(declared))).toContain(`<property "layout">horizontal</>`)
      expect(text.length).toBe(before.length + "horizontal".length - "stacked".length)
      await page.close()
    }
  )

  test(
    "a type's declared default sets it after the line:  this one says only all of them can",
    { timeout: 90_000 },
    async () => {
      const page = await context.newPage()
      await open(page, "Counter", { codeEditor: false })
      const { text: before } = await fileState(page, "Counter.spellml")
      await page.evaluate(async () => {
        const { editor, Inspector } = window as unknown as DebugGlobals
        const { core } = await editor.loadRuntime()
        Inspector.inspectThing(core.things.all().find((thing) => thing.constructor.name === "Counter")!)
      })
      await page.waitForSelector("ui-property-editor", { timeout: 8000 })
      await page.waitForTimeout(800)
      const count = page.locator("ui-property[name=count]")
      expect(await count.locator(".label").getAttribute("title")).toBe("From Counter")
      await change(page, "count", 5)
      expect((await fileState(page, "Counter.spellml")).text).toBe(before)
      expect(await page.locator(".InspectorNotSaved").textContent()).toMatch(/All counters start with this/)
      await page.close()
    }
  )

  test("pressing Run keeps a game in progress", { timeout: 120_000 }, async () => {
    const page = await context.newPage()
    await open(page, "Solitaire", { codeEditor: true })
    const mark = () =>
      page.evaluate(() => {
        const app = document.querySelector(".AppRoot")?.querySelector("*") as (Element & { kept?: boolean }) | null
        const wasKept = !!app?.kept
        if (app) app.kept = true
        return wasKept
      })
    expect(await mark()).toBe(false)
    await page.locator(".ModeTabs ui-item").first().click({ force: true })
    await page.waitForTimeout(2500)
    expect(page.url()).toMatch(/\/run\//)
    expect(await mark()).toBe(true)
    await page.close()
  })

  ////////////////
  // ## Selecting several (P11)
  ////////////////

  /** Where each element named `tag` is drawn, in the page's order. */
  function centersOf(page: Page, tag: string) {
    return page.evaluate((name) => {
      const all: Element[] = []
      const walk = (root: Document | ShadowRoot) => {
        for (const element of root.querySelectorAll("*")) {
          if (element.localName === name) all.push(element)
          if (element.shadowRoot) walk(element.shadowRoot)
        }
      }
      walk(document)
      return all.map((element) => {
        const box = element.getBoundingClientRect()
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
      })
    }, tag)
  }

  /** What's selected:  how many, and how many marching ants show round them. */
  function selection(page: Page) {
    return page.evaluate(() => {
      const { Inspector } = window as unknown as {
        Inspector: { allSelected: { element: Element; label: string }[]; isInspecting: boolean }
      }
      return {
        count: Inspector.allSelected.length,
        labels: Inspector.allSelected.map((part) => part.label),
        boxes: document.querySelectorAll(".InspectorSelected:not([hidden])").length,
        treeRows: document.querySelectorAll(".InspectorTree ui-tree-item[selected]").length,
        isInspecting: Inspector.isInspecting
      }
    })
  }

  /** Start Inspect app, as its crosshairs do. */
  async function startInspecting(page: Page): Promise<void> {
    await page.evaluate(() =>
      (window as unknown as { Inspector: { startInspecting(): void } }).Inspector.startInspecting()
    )
    await page.waitForTimeout(200)
  }

  /** The moves the running game has counted:  it mustn't lose them, nor hear of the clicks. */
  function gameState(page: Page) {
    return page.evaluate(async () => {
      const { editor } = window as unknown as DebugGlobals
      const { core } = await editor.loadRuntime()
      const game = core.things.all().find((thing) => thing.constructor.name === "Solitaire") as
        | { moves: number; score: number }
        | undefined
      return { moves: game?.moves, score: game?.score, things: core.things.all().length }
    })
  }

  test(
    "several in the app:  a plain click, then ⌘ adds and takes away, Shift toggles what's not in a list;  the tree follows",
    { timeout: 120_000 },
    async () => {
      const page = await context.newPage()
      await open(page, "Solitaire", { codeEditor: true })
      const before = await gameState(page)
      const foundations = await centersOf(page, "solitaire-foundation")
      expect(foundations.length).toBe(4)

      await page.mouse.click(foundations[0]!.x, foundations[0]!.y)
      await page.waitForTimeout(300)
      expect(await selection(page)).toMatchObject({ count: 1, isInspecting: false })

      await startInspecting(page)
      await page.keyboard.down("Meta")
      await page.mouse.click(foundations[2]!.x, foundations[2]!.y)
      await page.keyboard.up("Meta")
      await page.waitForTimeout(300)
      // a modifier keeps inspecting, for more;  the new one's the main one
      const two = await selection(page)
      expect(two).toMatchObject({ count: 2, isInspecting: true, treeRows: 2 })
      expect(two.boxes).toBe(2)
      expect(await page.locator(".InspectorScope").first().textContent()).toBe("These 2 Foundations")

      await page.keyboard.down("Meta")
      await page.mouse.click(foundations[0]!.x, foundations[0]!.y)
      await page.keyboard.up("Meta")
      await page.waitForTimeout(300)
      expect(await selection(page)).toMatchObject({ count: 1, treeRows: 1 })

      // Shift:  each foundation has a line of its own, so it isn't in a list, and it toggles
      await page.keyboard.down("Shift")
      await page.mouse.click(foundations[3]!.x, foundations[3]!.y)
      await page.keyboard.up("Shift")
      await page.waitForTimeout(300)
      expect((await selection(page)).labels).toEqual(expect.arrayContaining([expect.stringMatching(/Foundation/)]))
      expect((await selection(page)).count).toBe(2)

      // the views tree takes the same clicks
      await page
        .locator(".InspectorTree ui-tree-item")
        .nth(3)
        .locator('[part~="row"]')
        .first()
        .click({ modifiers: ["Meta"] })
      await page.waitForTimeout(300)
      expect((await selection(page)).count).toBe(3)

      expect(await gameState(page)).toEqual(before)
      await page.close()
    }
  )

  test("a rubber band over the background selects the innermost parts it touches", { timeout: 120_000 }, async () => {
    const page = await context.newPage()
    await open(page, "Solitaire", { codeEditor: true })
    const before = await gameState(page)
    const foundations = await centersOf(page, "solitaire-foundation")
    await startInspecting(page)

    // from the empty cell left of the foundations, across the first two
    const start = { x: foundations[0]!.x - 70, y: foundations[0]!.y + 4 }
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(start.x + 3, start.y, { steps: 2 })
    expect(await page.locator(".InspectorBand").count()).toBe(0)
    await page.mouse.move(foundations[1]!.x, foundations[1]!.y + 4, { steps: 6 })
    expect(await page.locator(".InspectorBand").count()).toBe(1)
    await page.mouse.up()
    await page.waitForTimeout(300)

    const banded = await selection(page)
    expect(await page.locator(".InspectorBand").count()).toBe(0)
    expect(banded).toMatchObject({ count: 2, isInspecting: true })
    expect(banded.labels.every((label) => label.startsWith("Foundation"))).toBe(true)

    // Esc cancels a band, and inspecting goes on
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(foundations[3]!.x, foundations[3]!.y + 4, { steps: 6 })
    await page.keyboard.press("Escape")
    await page.mouse.up()
    await page.waitForTimeout(300)
    expect(await selection(page)).toMatchObject({ count: 2, isInspecting: true })

    expect(await gameState(page)).toEqual(before)
    await page.close()
  })

  test("a change to several is one undo step;  the selection survives a recompile", { timeout: 150_000 }, async () => {
    const page = await context.newPage()
    await open(page, "Solitaire", { codeEditor: true })
    const { text: before } = await fileState(page, "Solitaire.spellml")
    const foundations = await centersOf(page, "solitaire-foundation")
    await startInspecting(page)
    for (const index of [0, 1]) {
      await page.keyboard.down("Meta")
      await page.mouse.click(foundations[index]!.x, foundations[index]!.y)
      await page.keyboard.up("Meta")
    }
    await page.evaluate(() =>
      (window as unknown as { Inspector: { stopInspecting(): void } }).Inspector.stopInspecting()
    )
    await page.waitForTimeout(400)
    expect((await selection(page)).count).toBe(2)

    // they differ:  the field says so
    const nameField = page.locator('ui-property[name="name"]')
    expect(await page.locator('ui-property[name="name"][mixed]').count()).toBe(1)

    // real typing in the real field
    const steps = await historyLength(page)
    await nameField.locator("input").first().click()
    await page.keyboard.type("piled")
    await page.keyboard.press("Tab")
    await page.waitForTimeout(400)
    const { text: edited } = await fileState(page, "Solitaire.spellml")
    expect(edited).toContain(`a new foundation with name = "piled", suit = clubs`)
    expect(edited).toContain(`a new foundation with name = "piled", suit = diamonds`)
    expect(await historyLength(page)).toBe(steps + 1)

    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    await press(page, "ControlOrMeta+z")
    expect((await fileState(page, "Solitaire.spellml")).text).toBe(before)
    await press(page, "ControlOrMeta+Shift+z")
    expect((await fileState(page, "Solitaire.spellml")).text).toBe(edited)
    await press(page, "ControlOrMeta+z")

    // a recompile:  a typed comment in the same file, the game going on
    const state = await gameState(page)
    await page.locator("ui-item", { hasText: "Solitaire.spellml" }).first().click()
    await page.waitForTimeout(800)
    await page.locator(".monaco-editor .view-line").nth(1).click()
    await page.keyboard.press("ControlOrMeta+ArrowDown")
    await page.keyboard.type("\n// a comment\n")
    await page.waitForTimeout(6000)
    const after = await selection(page)
    expect(after.count).toBe(2)
    expect(after.labels.every((label) => label.startsWith("Foundation"))).toBe(true)
    expect(after.boxes).toBe(2)
    expect((await gameState(page)).moves).toBe(state.moves)
    await page.close()
  })
})
