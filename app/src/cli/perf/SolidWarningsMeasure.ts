import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import type { Page } from "playwright"

import { BrowserPage, type ProblemKind } from "spell/element-tools/BrowserPage"

/****************
 * ### `SolidWarningsMeasure`
 * Every Solid dev warning the editor prints while a person goes through it:
 * `spell perf run --steps warnings` (epic `solid-2-final` P21).
 * - Owen's standing rule (2026-11-14, epic `editor` I98):  the editor's console stays clean,
 *   checked after every merge into main.
 * - The editor epic's probe, folded in (its `tests/solid-warnings.mjs`, kept with that epic's tests):
 *   the same walk, the same projects, its warnings heard as `BrowserPage`'s problem reports.
 * - The checkout's RUNNING editor, in dev mode:  Solid's warnings exist only in its dev build,
 *   so not the production build the other steps measure.
 *   - Found by the kit's `.spell-server.editor.json`;  none, and the step fails, saying to start it.
 * - Saves nothing:  every write to `/api` and every `.spell` write is answered here,
 *   a saved file kept in memory, so the editor reads back what it saved.
 * - A walk step that can't find what it needs FAILS LOUDLY (`failedSteps`):
 *   `PerfRun` names it, so the check never passes by checking nothing.
 * - Its position:  the app's command line, node only;  Playwright through the kit's `BrowserPage`.
 ****************/
export class SolidWarningsMeasure {
  /** the page being walked */
  private page!: Page

  /** each warning, by its first line */
  private readonly found = new Map<string, WarningEntry>()

  /** the walk step running, for each warning's `steps` */
  private step = "load"

  /** each walk step that failed, and why */
  private readonly failedSteps: string[] = []

  /** each walk step that ran through */
  private readonly passedSteps: string[] = []

  /** each write the editor tried, refused */
  private readonly blocked: string[] = []

  /** each file "saved" this run, by its address under `/spaces/`:  read back from here, as the server would */
  private readonly saved = new Map<string, string>()

  private constructor(
    readonly editorUrl: string,
    readonly say: (line: string) => void
  ) {}

  /**
   * Walk the editor at `kitRoot`'s running dev server, and say what Solid warned.
   * - throws when no editor is running there
   */
  static async measure(kitRoot: string, say: (line: string) => void): Promise<SolidWarningsResult> {
    const file = join(kitRoot, EDITOR_RECORD)
    if (!existsSync(file)) {
      throw new Error(`no editor running in this checkout (${EDITOR_RECORD}):  start it, spell server start editor`)
    }
    const { url } = JSON.parse(readFileSync(file, "utf8")) as { url: string }
    return new SolidWarningsMeasure(url.endsWith("/") ? url : `${url}/`, say).run()
  }

  /** The whole walk, in one headless Chromium. */
  private async run(): Promise<SolidWarningsResult> {
    return BrowserPage.with(async (browser) => {
      this.page = await BrowserPage.newPage(browser, {
        viewport: { width: 1600, height: 1000 },
        consoleTypes: ["error", "warning"],
        onProblem: (text, kind) => this.note(text, kind)
      })
      await this.blockWrites()
      // a stack under each Solid warning without one, to find where it came from
      await this.page.addInitScript(STACKS_SCRIPT)
      for (const [project, file] of PROJECTS) await this.walk(project, file)
      return this.result()
    })
  }

  /** One problem the page reported, counted under its first line. */
  private note(text: string, kind: ProblemKind) {
    const code = text.match(/^\[([A-Z_]+)\]/)?.[1] ?? (kind === "page error" ? "pageerror" : kind.replace(" ", "."))
    const key = text.split("\n")[0].slice(0, 220)
    const entry = this.found.get(key) ?? { code, count: 0, steps: [], text }
    entry.count++
    if (!entry.steps.includes(this.step)) entry.steps.push(this.step)
    this.found.set(key, entry)
  }

  /** Answer every write here, and no hot reloads from other sessions' edits mid-walk. */
  private async blockWrites() {
    const context = this.page.context()
    await context.route(/\/api\/|\/spaces\/|\.spell(\?.*)?$/, (route) => {
      const request = route.request()
      const { pathname } = new URL(request.url())
      if (request.method() === "GET") {
        const kept = this.saved.get(pathname.replace(/^\/api\/projects\/file\//, "/spaces/"))
        if (kept === undefined) return route.continue()
        return route.fulfill({ status: 200, contentType: "text/plain", body: kept })
      }
      this.blocked.push(`${request.method()} ${pathname}`)
      const file = pathname.match(SAVE)?.[1]
      if (file) this.saved.set(`/spaces${file}`, request.postData() ?? "")
      return route.fulfill({ status: 200, contentType: "application/json", body: file ? "true" : "{}" })
    })
    await context.routeWebSocket(/.*/, () => {})
  }

  /** What the walk found, worst first by code. */
  private result(): SolidWarningsResult {
    const entries = [...this.found.values()].sort((one, other) => one.code.localeCompare(other.code))
    const byCode: Record<string, number> = {}
    for (const entry of entries) byCode[entry.code] = (byCode[entry.code] ?? 0) + entry.count
    const count = (test: (entry: WarningEntry) => boolean) =>
      entries.filter(test).reduce((sum, entry) => sum + entry.count, 0)
    const solid = count((entry) => SOLID_CODE.test(entry.code))
    this.say(`  ${solid} Solid warnings, ${entries.length} distinct problems, ${this.failedSteps.length} steps failed`)
    for (const entry of entries)
      this.say(`  [${entry.code}] x${entry.count}  ${entry.text.split("\n")[0].slice(0, 160)}`)
    return {
      editor: this.editorUrl,
      solidWarnings: solid,
      otherProblems: count((entry) => !SOLID_CODE.test(entry.code)),
      byCode,
      entries,
      passedSteps: this.passedSteps,
      failedSteps: this.failedSteps,
      writesBlocked: this.blocked.length
    }
  }

  ////////////////
  // ## The walk
  ////////////////

  /** Every walk step, for one project. */
  private async walk(project: string, file?: string) {
    await this.runStep(`${project}:open`, () => this.open(project, file))
    // its other steps need it open:  one failure, not eight
    if (this.failedSteps.at(-1)?.startsWith(`${project}:open:`)) {
      this.failedSteps.push(`${project}:  every other step skipped, as it didn't open`)
      return
    }
    await this.runStep(`${project}:walk code`, () => this.walkCode(1, 40))
    await this.runStep(`${project}:inspect`, () => this.inspect())
    await this.runStep(`${project}:property editor`, () => this.propertyEditor())
    await this.runStep(`${project}:palette`, () => this.palette())
    await this.runStep(`${project}:menus`, () => this.menus())
    await this.runStep(`${project}:compiled code`, () => this.compiledCode())
    await this.runStep(`${project}:type`, () => this.type())
    await this.runStep(`${project}:run mode`, () => this.runMode())
  }

  /** Run one walk step, noting whether it ran through. */
  private async runStep(name: string, run: () => Promise<void>) {
    this.step = name
    try {
      await run()
      this.passedSteps.push(name)
      this.say(`  ok    ${name}`)
    } catch (error) {
      const why = String((error as Error).message ?? error).split("\n")[0]
      this.failedSteps.push(`${name}:  ${why}`)
      this.say(`  STEP FAILED  ${name}:  ${why}`)
    }
  }

  /** Open a project's file in the editor, and wait for its code. */
  private async open(project: string, file?: string) {
    await this.page.goto(`${this.editorUrl}edit/@spell/examples/${project}${file ? `/${file}` : ""}`, {
      timeout: 90_000
    })
    await this.page.waitForSelector(CODE_LINE, { timeout: 90_000 })
    await this.pause(3000)
    check((await this.codeText()).length, "the code pane is empty")
  }

  /** The crosshairs, then a click on something the app drew:  the Inspector shows what was picked. */
  private async inspect() {
    const { page } = this
    if ((await page.locator(".InspectAppButton").first().getAttribute("aria-pressed")) !== "true")
      await this.clickItem(".ModeTabs .InspectAppButton")
    await this.pause(1000)
    check(await page.locator(".InspectorPane").count(), "no Inspector after the crosshairs")
    const box = await page.locator(".AppPaneProgram").first().boundingBox()
    if (!box) throw new Error("no app drawn (.AppPaneProgram)")
    // a few places, till one picks something:  an app's background may pick nothing
    for (const [x, y] of PICK_AT) {
      await page.mouse.click(box.x + box.width * x, box.y + box.height * y)
      await this.pause(1500)
      if (await this.isPicked()) break
    }
    check(await this.isPicked(), "picking in the app selected nothing (the Inspector still shows its tip)")
  }

  /** A field of what's picked:  focused, then left alone. */
  private async propertyEditor() {
    const field = this.page
      .locator(".InspectorCard")
      .first()
      .locator("ui-input, ui-select, ui-dropdown")
      .filter({ visible: true })
      .first()
    check(await field.count(), "no property field in the Inspector")
    await field.click({ timeout: 3000 })
    await this.pause(400)
    await this.page.keyboard.press("Escape")
    await this.pause(300)
  }

  /** The add panel, View › Add a View… (epic `editor` T167), opened and closed, as the page tests' `openAddPanel()`. */
  private async palette() {
    await this.page.locator("#ViewBarMenu [part~=item]").first().click({ timeout: 5000 })
    await this.page.getByText("Add a View…").first().click({ timeout: 5000 })
    await this.page.waitForSelector(`${ADD_PANEL} ui-tree-item`, { state: "attached", timeout: 30_000 })
    await this.pause(1000)
    check(await this.page.locator(`${ADD_PANEL} ui-tree-item`).count(), "the add panel showed nothing")
    await this.page.keyboard.press("Escape")
    await this.pause(400)
  }

  /** Every menu of the top bar, opened and closed. */
  private async menus() {
    const menus = await this.barMenus()
    const labels = menus.map((menu) => menu.label)
    for (const wanted of BAR_MENUS)
      check(labels.includes(wanted), `no ${wanted} menu in the bar (has:  ${labels.join(", ")})`)
    check(
      await this.page.locator(".AppMenu .ProjectBarMenu .ProjectBarLabel").filter({ hasText: /\S/ }).count(),
      "no project menu, titled, in the bar"
    )
    const empty: string[] = []
    for (const { selector, label } of menus) {
      await this.openMenu(selector, label).catch((error: Error) => empty.push(error.message))
    }
    check(!empty.length, empty.join(";  "))
  }

  /** The top bar's compiled-code button, its languages' tabs, a walk through the code beside it, then off. */
  private async compiledCode() {
    const { page } = this
    const button = page.locator(".ModeTabs .CompiledCodeToggle").first()
    check(await button.count(), "no compiled-code button in the bar")
    if ((await button.getAttribute("aria-pressed")) !== "true") await this.clickItem(".ModeTabs .CompiledCodeToggle")
    await page.waitForSelector(".CodeOutputPane", { timeout: 10_000 })
    await this.pause(1500)
    for (const language of COMPILED_LANGUAGES) {
      await page.locator(".CodeOutputPane ui-item").filter({ hasText: language }).first().click({ timeout: 3000 })
      await this.pause(1500)
      check(await page.locator(".CodeOutputCode .cm-line").count(), `no compiled ${language} drawn`)
    }
    await this.walkCode(3, 5)
    await this.clickItem(".ModeTabs .CompiledCodeToggle")
    await this.pause(1500)
    check((await button.getAttribute("aria-pressed")) === "false", "the compiled code didn't hide")
  }

  /** Type at the end of the first line of code after the first, then take it back. */
  private async type() {
    const { page } = this
    const before = await this.codeText()
    const lineNumber =
      before.split("\n").findIndex((line, index) => index && /\S/.test(line) && !/^\s*(--|\/\/|#)/.test(line)) + 1
    check(lineNumber > 0, "no line of code to type in")
    await this.clickLine(lineNumber)
    await page.evaluate((at) => {
      const { view } = (window as unknown as EditorWindow).editor.shownCodeEditor
      view.dispatch({ selection: { anchor: view.state.doc.line(at).to } })
      view.focus()
    }, lineNumber)
    await page.keyboard.type(" x", { delay: 60 })
    await this.pause(3000)
    check((await this.codeText()) !== before, "typing changed nothing")
    await page.keyboard.press("Backspace")
    await page.keyboard.press("Backspace")
    await this.pause(3000)
    check((await this.codeText()) === before, "the code didn't come back after two backspaces")
  }

  /** Run mode, then Edit mode again. */
  private async runMode() {
    const { page } = this
    // a mode's tab says its name in its text (`.ModeText`), the one showing `selected`
    const selected = async () =>
      (await page.locator(".ModeTabs > ui-item[selected] .ModeText").first().textContent())?.trim()
    const tab = (name: string) => page.locator(".ModeTabs > ui-item").filter({ hasText: name }).first()
    await tab("Run").locator("[part~=item]").click({ timeout: 3000 })
    await this.pause(2500)
    check((await selected()) === "Run", `Run mode didn't take (selected:  ${await selected()})`)
    await tab("Edit").locator("[part~=item]").click({ timeout: 3000 })
    await this.pause(2000)
    check((await selected()) === "Edit", `Edit mode didn't come back (selected:  ${await selected()})`)
  }

  ////////////////
  // ## The code editor, as the page tests' `CodeEditor` reads it
  ////////////////

  /** The code pane's whole text. */
  private codeText(): Promise<string> {
    return this.page.evaluate(() => {
      const view = (window as unknown as EditorWindow).editor?.shownCodeEditor?.view
      if (!view) throw new Error("no window.editor.shownCodeEditor.view")
      return view.state.doc.toString()
    })
  }

  /** A real click on line `lineNumber`, one character into its first word, scrolled to the middle first. */
  private async clickLine(lineNumber: number) {
    const at = await this.page.evaluate(async (number) => {
      const view = (window as unknown as EditorWindow).editor?.shownCodeEditor?.view
      if (!view) throw new Error("no window.editor.shownCodeEditor.view")
      const line = view.state.doc.line(Math.min(number, view.state.doc.lines))
      const pos = Math.min(line.from + Math.max(0, line.text.search(/\S/)) + 1, line.to)
      view.dispatch({ effects: view.constructor.scrollIntoView(pos, { y: "center" }) })
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      const box = view.coordsAtPos(pos)
      if (!box) throw new Error(`line ${number} isn't drawn`)
      return { x: box.left + 2, y: (box.top + box.bottom) / 2 }
    }, lineNumber)
    await this.pause(200)
    await this.page.mouse.click(at.x, at.y)
  }

  /** The caret's line, from 1. */
  private caretLine(): Promise<number> {
    return this.page.evaluate(() => {
      const { state } = (window as unknown as EditorWindow).editor.shownCodeEditor.view
      return state.doc.lineAt(state.selection.main.head).number
    })
  }

  /** A click on line `lineNumber`, then the caret down `steps` lines, one at a time;  checks the caret moved. */
  private async walkCode(lineNumber: number, steps: number) {
    await this.clickLine(lineNumber)
    const from = await this.caretLine()
    for (let index = 0; index < steps; index++) {
      await this.page.keyboard.press("ArrowDown")
      await this.pause(250)
    }
    const to = await this.caretLine()
    check(steps === 0 || to > from, `the caret didn't move down (line ${from} => ${to})`)
  }

  ////////////////
  // ## The top bar
  ////////////////

  /** A `ui-item` of the bar, clicked where it's drawn (its `[part~=item]`). */
  private clickItem(selector: string) {
    return this.page.locator(`${selector} [part~=item]`).first().click({ timeout: 5000 })
  }

  /** Open the bar menu `menu` (a `ui-item.BarMenu`), check it shows items, then close it. */
  private async openMenu(menu: string, label: string) {
    const item = this.page.locator(menu).first()
    check(await item.count(), `no menu ${label} (${menu})`)
    await this.page.locator(`${menu} [part~=item]`).first().click({ timeout: 5000 })
    await this.pause(700)
    // its popup is the `.BarMenuPopup` for it, its items `ui-action`s (and `ui-submenu`s)
    const shown = await item.evaluate((element) => {
      const popup = document.querySelector(`.BarMenuPopup[for="${element.id}"]`)
      if (!popup?.getBoundingClientRect().height) return 0
      return popup.querySelectorAll("ui-action, ui-submenu, ui-item").length
    })
    check(shown, `menu ${label} opened no items`)
    await this.page.keyboard.press("Escape")
    await this.pause(300)
  }

  /** The menus the bar shows, by their selector and label. */
  private barMenus(): Promise<{ selector: string; label: string }[]> {
    return this.page.evaluate(() => {
      const bar = document.querySelector(".AppMenu")
      if (!bar) throw new Error("no .AppMenu bar")
      // a `ui-item` host draws nothing itself:  its `[part~=item]` is what shows
      const drawn = (item: Element) => item.shadowRoot?.querySelector("[part~=item]")?.getBoundingClientRect().width
      const menus = [...bar.querySelectorAll<HTMLElement>("ui-item.BarMenu")].filter(
        (item) => drawn(item) && !item.closest(".AppBarMenusFolded")
      )
      return menus.map((item, index) => {
        item.dataset.probeMenu = String(index)
        const label = item.querySelector(".ProjectBarLabel")?.textContent ?? item.firstChild?.textContent ?? ""
        return { selector: `[data-probe-menu="${index}"]`, label: label.trim() || `#${index}` }
      })
    })
  }

  /** Has the Inspector something picked?  (a part's or a thing's fields, not its "pick something" tip) */
  private async isPicked(): Promise<boolean> {
    const card = this.page.locator(".InspectorCard").first()
    return (
      !(await card.locator(".InspectorTip").count()) &&
      !!(await card.locator("ui-input, ui-select, ui-dropdown, ui-checkbox").count())
    )
  }

  /** Wait `ms` for the page. */
  private pause(ms = 800) {
    return this.page.waitForTimeout(ms)
  }
}

/** Throw `message` unless `ok`. */
function check(ok: unknown, message: string) {
  if (!ok) throw new Error(message)
}

/** the editor's record, at the kit's root */
const EDITOR_RECORD = ".spell-server.editor.json"

/** the projects it walks:  its id in the address, and the file to open, if not its first */
const PROJECTS: [string, string?][] = [["Solitaire", "Card.spell"], ["TaskList"], ["calculator"]]

/** the add panel, in either of its shapes (the page tests' `ADD_PANEL`) */
const ADD_PANEL = ":is(ui-popup.PalettePlus, ui-modal.PalettePanel)"

/** a line of the code pane */
const CODE_LINE = ".InputEditor .cm-editor .cm-line"

/** a file's save */
const SAVE = /\/api\/projects\/file(\/[^?]*)/

/** where in the app a pick is tried, as fractions of its box */
const PICK_AT = [
  [1 / 3, 1 / 3],
  [0.1, 0.2],
  [0.15, 0.4],
  [0.5, 0.1]
] as const

/** the bar's menus, by their labels */
const BAR_MENUS = ["Spell", "File", "Edit", "View", "Run", "Help"]

/** the compiled code's languages, by their tabs */
const COMPILED_LANGUAGES = ["TypeScript", "Python", "JavaScript"]

/** a Solid dev diagnostic's code */
const SOLID_CODE = /^[A-Z][A-Z_]{7,}$/

/** a stack under each `[CODE]` warning that has none */
const STACKS_SCRIPT = `(() => {
  const warn = console.warn
  console.warn = (...parts) => {
    const text = String(parts[0])
    if (/^\\[[A-Z_]+\\]/.test(text) && !/\\n\\s*at /.test(text))
      parts[0] = text + "\\n" + (new Error().stack ?? "").split("\\n").slice(2, 14).join("\\n")
    warn(...parts)
  }
})()`

/** The bits of the editor's page the walk reads:  its shown code editor's CodeMirror view. */
type EditorWindow = {
  editor: {
    shownCodeEditor: {
      view: {
        state: {
          doc: {
            toString(): string
            lines: number
            line(number: number): { from: number; to: number; text: string }
            lineAt(pos: number): { number: number }
          }
          selection: { main: { head: number } }
        }
        dispatch(spec: unknown): void
        focus(): void
        coordsAtPos(pos: number): { left: number; top: number; bottom: number } | null
        constructor: { scrollIntoView(pos: number, options: unknown): unknown }
      }
    }
  }
}

/** One problem the page reported:  its code, how often, in which walk steps, its text. */
export type WarningEntry = { code: string; count: number; steps: string[]; text: string }

/**
 * What the walk found.
 * - `solidWarnings`:  how many of Solid's `[CODE]` warnings;  `otherProblems`:  every other error or warning
 * - `failedSteps`:  walk steps that couldn't run, so their part of the editor went unchecked
 */
export type SolidWarningsResult = {
  editor: string
  solidWarnings: number
  otherProblems: number
  byCode: Record<string, number>
  entries: WarningEntry[]
  passedSteps: string[]
  failedSteps: string[]
  writesBlocked: number
}
