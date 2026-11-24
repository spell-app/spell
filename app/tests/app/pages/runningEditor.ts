import { execSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { setTimeout as wait } from "node:timers/promises"
import type { EditorView } from "@codemirror/view"
import { chromium, type BrowserContext, type Locator, type Page } from "playwright"
import { afterAll, afterEach } from "vite-plus/test"

import { Alignment } from "spell/test-helpers/Alignment"

/**
 * How the editor's end-to-end tests find the running editor:  every test file here that opens it imports this.
 * - No record of an editor, as in CI:  `SERVING` is false, and the file skips itself.
 * - A record, and the editor answers:  `SERVING` is true.
 * - A record, but no answer for `ANSWER_MS`:  importing this THROWS, so the file fails and says why.
 *   - The editor is meant to be running, so skipping would look like a pass.
 *   - Start one with `spell server start all`.
 * - And it fails any test during which a page's updates stopped for good ("A stopped page", below).
 * - And any test after which a page it opened shows a row whose items don't line up ("Rows lined up", below).
 * - Its pages keep running the code they loaded, though the editor's code changes on disk meanwhile
 *   ("Code as it was loaded", below).
 */

/** The kit's root, where the page server leaves its note of the editor's address. */
export const KIT = path.resolve(import.meta.dirname, "../../../..")

/** How long a just-started or busy editor gets to answer. */
const ANSWER_MS = 30_000

/** The running editor's address, from that note;  `undefined`:  none noted. */
function editorAddress(): string | undefined {
  const note = path.join(KIT, ".spell-server.editor.json")
  return existsSync(note) ? (JSON.parse(readFileSync(note, "utf8")) as { url: string }).url : undefined
}

/** Does the editor at `address` answer within `ANSWER_MS`? */
async function isAnswering(address: string): Promise<boolean> {
  for (const stop = Date.now() + ANSWER_MS; Date.now() < stop; await wait(1000)) {
    try {
      if ((await fetch(address, { signal: AbortSignal.timeout(ANSWER_MS) })).ok) return true
    } catch (ignored) {
      // not up yet:  try again
    }
  }
  return false
}

/** The running editor's address;  `undefined`:  none noted. */
export const EDITOR = editorAddress()

if (EDITOR && !(await isAnswering(EDITOR))) {
  throw new Error(`runningEditor:  the editor noted at ${EDITOR} doesn't answer;  start it:  spell server start all`)
}

/** Every built-in project's drafts, as a git path:  ignored, so `git status` lists them only with `--ignored`. */
const DRAFTS = "':(glob)spaces/**/__draft/**'"

/** Is there an editor to test?  (`describe.skipIf(!SERVING)`) */
export const SERVING = !!EDITOR

/**
 * What git says of the built-in projects right now, the changes themselves too.
 * - Compare it before and after a test:  someone's uncommitted work there is not the test's doing.
 * - Their drafts too, which git ignores (`__draft/`):  an edit kept by AutoSave as a page closed left one in
 *   Solitaire, and every later test that opened it read the draft
 */
export function builtInProjectsNow(): string {
  return execSync("git status --short spaces && git diff spaces && git status --short --ignored -- " + DRAFTS, {
    cwd: path.join(KIT, "app"),
    maxBuffer: 64 * 1024 * 1024
  }).toString()
}

////////////////
// ## The code editor
////////////////

/** What a test reads of the page's debug globals:  the code editor showing, CodeMirror's view of it. */
type CodeGlobals = { editor: { shownCodeEditor?: { view: EditorView } } }

/** A place in the code:  its line and column, each from 1. */
export type CodePlace = { lineNumber: number; column: number }

/**
 * The editor page's code editor, as a test reads and drives it:  every page test's ONE way in.
 * - Reads CodeMirror's own state (`window.editor.shownCodeEditor.view`), never what it draws,
 *   so long files read whole, and bubbly or plain looks alike.
 * - Lines and columns count from 1.
 * - Clicks are a real mouse's, keys a real keyboard's.
 */
export class CodeEditor {
  /** A drawn line of the code pane. */
  static readonly LINE = ".InputEditor .cm-editor .cm-line"

  constructor(readonly page: Page) {}

  /** Wait for the code pane to show a line. */
  async shown(timeout = 60_000): Promise<void> {
    await this.page.waitForSelector(CodeEditor.LINE, { timeout })
  }

  /** Its whole text. */
  text(): Promise<string> {
    return this.page.evaluate(() =>
      (window as unknown as CodeGlobals).editor.shownCodeEditor!.view.state.doc.toString()
    )
  }

  /** Its lines' text, each. */
  async lines(): Promise<string[]> {
    return (await this.text()).split("\n")
  }

  /** Line `lineNumber`'s text. */
  line(lineNumber: number): Promise<string> {
    return this.page.evaluate(
      (at) => (window as unknown as CodeGlobals).editor.shownCodeEditor!.view.state.doc.line(at).text,
      lineNumber
    )
  }

  /** `count` lines' text, from `lineNumber` on. */
  async linesFrom(lineNumber: number, count: number): Promise<string[]> {
    return (await this.lines()).slice(lineNumber - 1, lineNumber - 1 + count)
  }

  /** How many lines it has. */
  lineCount(): Promise<number> {
    return this.page.evaluate(() => (window as unknown as CodeGlobals).editor.shownCodeEditor!.view.state.doc.lines)
  }

  /** The number of the first line holding `words`;  `0`:  none does. */
  async lineOf(words: string): Promise<number> {
    return (await this.lines()).findIndex((line) => line.includes(words)) + 1
  }

  /** Where the caret is. */
  caret(): Promise<CodePlace> {
    return this.page.evaluate(() => {
      const { state } = (window as unknown as CodeGlobals).editor.shownCodeEditor!.view
      const { head } = state.selection.main
      const line = state.doc.lineAt(head)
      return { lineNumber: line.number, column: head - line.from + 1 }
    })
  }

  /**
   * Put the caret on line `lineNumber`, at `column`, scrolled into view.
   * - `"end"`:  after the line's last character
   * - Doesn't focus the editor:  `focus()` does
   */
  async setCaret(lineNumber: number, column: number | "end" = 1): Promise<void> {
    await this.page.evaluate(
      ([at, place]) => {
        const { view } = (window as unknown as CodeGlobals).editor.shownCodeEditor!
        const line = view.state.doc.line(at)
        const anchor = place === "end" ? line.to : line.from + place - 1
        view.dispatch({ selection: { anchor }, scrollIntoView: true })
      },
      [lineNumber, column] as const
    )
  }

  /** Give it the keyboard. */
  async focus(): Promise<void> {
    await this.page.evaluate(() => (window as unknown as CodeGlobals).editor.shownCodeEditor!.view.focus())
  }

  /** Has it the keyboard?  `false`:  no code editor showing either. */
  hasFocus(): Promise<boolean> {
    return this.page.evaluate(() => (window as unknown as CodeGlobals).editor.shownCodeEditor?.view.hasFocus ?? false)
  }

  /** The text selected;  `""`:  none. */
  selectedText(): Promise<string> {
    return this.page.evaluate(() => {
      const { state } = (window as unknown as CodeGlobals).editor.shownCodeEditor!.view
      return state.sliceDoc(state.selection.main.from, state.selection.main.to)
    })
  }

  /** How far down it's scrolled, in pixels. */
  scrollTop(): Promise<number> {
    return this.page.evaluate(() => (window as unknown as CodeGlobals).editor.shownCodeEditor!.view.scrollDOM.scrollTop)
  }

  /**
   * Click line `lineNumber` with a real mouse:  scrolled to the middle first.
   * - At `column`;  default:  one character into its first word
   */
  async clickLine(lineNumber: number, column?: number): Promise<void> {
    const at = await this.page.evaluate(
      async ([number, place]) => {
        const { view } = (window as unknown as CodeGlobals).editor.shownCodeEditor!
        const line = view.state.doc.line(number)
        const pos = line.from + (place ? place - 1 : Math.max(0, line.text.search(/\S/)) + 1)
        const scrollTo = (view.constructor as typeof EditorView).scrollIntoView
        view.dispatch({ effects: scrollTo(Math.min(pos, line.to), { y: "center" }) })
        // CodeMirror scrolls when it next measures, in a frame
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
        const box = view.coordsAtPos(Math.min(pos, line.to))!
        return { x: box.left + 2, y: (box.top + box.bottom) / 2 }
      },
      [lineNumber, column] as const
    )
    await this.page.waitForTimeout(200)
    await this.page.mouse.click(at.x, at.y)
  }

  /** Type `text` where the caret is, a key at a time:  focused first. */
  async type(text: string, delay = 0): Promise<void> {
    await this.focus()
    await this.page.keyboard.type(text, { delay })
  }

  /** Press `key` (`"Meta+z"`, `"Enter"` ...):  focused first. */
  async press(key: string): Promise<void> {
    await this.focus()
    await this.page.keyboard.press(key)
  }

  /** Paste `text` at the caret, as ⌘V's paste event would bring it. */
  async paste(text: string): Promise<void> {
    await this.page.evaluate((pasted) => {
      const data = new DataTransfer()
      data.setData("text/plain", pasted)
      const { contentDOM } = (window as unknown as CodeGlobals).editor.shownCodeEditor!.view
      contentDOM.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }))
    }, text)
  }

  /** The drawn lines of the code pane, those holding `words` only, if given. */
  lineLocator(words?: string): Locator {
    return this.page.locator(CodeEditor.LINE, words === undefined ? {} : { hasText: words })
  }

  /**
   * The drawn lines' text of any CodeMirror view inside `within` (an Inspector card's slice, the compiled code ...).
   * - Only those drawn:  CodeMirror leaves out lines far off screen.
   */
  static async drawnLines(within: Locator): Promise<string[]> {
    return within.locator(".cm-line").allInnerTexts()
  }
}

////////////////
// ## A stopped page
////////////////

/**
 * What Solid prints as an uncaught error stops it for the whole page:  nothing on that page updates again.
 * - Later `Update ignored` notices about the same stop don't match.
 */
const STOPPED = /\[REACTIVITY_HALTED\] An uncaught error/

/** A page whose updates stopped, as Solid said so. */
type StoppedPage = {
  /** The page. */
  page: Page
  /** Solid's message, naming the computation it stopped in. */
  message: string
  /** The error that stopped it, once the page has reported it. */
  cause?: string
}

/** The pages that stopped since `stoppedPagesReport()` last ran. */
const stoppedPages: StoppedPage[] = []

/** Note every page of `context`, those opened later too, whose updates stop. */
function watchForStoppedPages(context: BrowserContext): void {
  context.on("console", (message) => {
    const page = message.page()
    if (page && STOPPED.test(message.text())) stoppedPages.push({ page, message: message.text() })
  })
  context.on("weberror", (webError) => {
    const stopped = stoppedPages.find(({ page, cause }) => page === webError.page() && !cause)
    if (stopped) stopped.cause = webError.error().stack ?? String(webError.error())
  })
}

////////////////
// ## Code as it was loaded
////////////////

/**
 * Vite's messages to a page that would change its code under a running test:  reload it, or swap a module.
 * - Its others (`connected`, `ping`, `error` ...) still go through.
 */
const CODE_CHANGED = new Set(["full-reload", "update", "prune"])

/** Vite's own socket to a page, `ws://localhost:57509/?token=...`:  its address is the page's root. */
const isViteSocket = (url: URL): boolean => url.pathname === "/" && url.searchParams.has("token")

/**
 * Keep every page of `context` on the code it loaded:  Vite's reloads and module swaps never reach it.
 * - Why:  agents edit the editor's code while its tests run, in the same checkout.
 *   Vite then reloads every open editor, a test's too, in the middle of its clicks and drags:
 *   what's selected, the open palette and menu, a move half done, all gone (epic `editor` I143).
 * - A page loaded after the change, or a module it loads later, gets the new code, as ever.
 * - Says so once per test file, naming the first file that changed.
 * - NEVER throws.
 */
async function keepCodeAsLoaded(context: BrowserContext): Promise<void> {
  await context.routeWebSocket(isViteSocket, (socket) => {
    const vite = socket.connectToServer()
    vite.onMessage((message) => {
      const change = codeChangeIn(message)
      if (!change) return socket.send(message)
      if (!saidCodeChanged) {
        saidCodeChanged = true
        console.warn(
          `runningEditor:  the editor's code changed during this test file (${change}):\n` +
            "its pages keep running what they loaded, not reloaded by Vite"
        )
      }
    })
  })
}

/** What Vite's `message` says changed, if it would reload or swap the page's code;  else `undefined`. */
function codeChangeIn(message: string | Buffer): string | undefined {
  try {
    const { type, triggeredBy, updates } = JSON.parse(String(message)) as {
      type?: string
      triggeredBy?: string
      updates?: { path?: string }[]
    }
    if (!type || !CODE_CHANGED.has(type)) return undefined
    return triggeredBy ?? updates?.[0]?.path ?? type
  } catch (ignored) {
    // not JSON:  not one of Vite's
    return undefined
  }
}

/** Has this test file said its pages kept their code (`keepCodeAsLoaded()`)? */
let saidCodeChanged = false

////////////////
// ## Rows lined up
////////////////

/** Every page the test file's browsers opened, still open:  each is scanned after each test. */
const openPages = new Set<Page>()

/** Note `page`, forgotten once it closes. */
function notePage(page: Page): void {
  openPages.add(page)
  page.once("close", () => openPages.delete(page))
}

/** What was already said this file, so a page kept open across tests fails the first test it shows in, once. */
const saidMisaligned = new Set<string>()

/**
 * Fail the test if a page it left open shows a row whose items don't line up (epic `epic-engine` P83):
 * any editor test checks the rows it shows, whatever it was testing.
 * - the scan:  the kit's `Alignment`;  a row meant to be uneven says so with `data-align="free: <why>"`
 * - a page that can't be scanned (closing, navigating) is left alone
 */
async function failOnMisalignedRows(): Promise<void> {
  const reports: string[] = []
  for (const page of openPages) {
    if (page.isClosed()) continue
    try {
      for (const line of Alignment.report(await Alignment.scanPage(page))) {
        const said = `${page.url()}\n${line}`
        if (!saidMisaligned.has(said)) reports.push(said)
        saidMisaligned.add(said)
      }
    } catch (ignored) {
      // closing or navigating:  nothing to scan
    }
  }
  if (reports.length)
    throw new Error(
      [
        "A row on the page doesn't line up:  one item is drawn above or below the rest of its row.",
        'Fix it in its component;  a row meant to be uneven says so:  data-align="free: <why>".',
        ...reports
      ].join("\n\n")
    )
}

/**
 * Every test file's browsers watched for stopped pages, and kept on the code they loaded,
 * with nothing for a test to remember.
 * - HACK:  replaces `chromium.launch()`, and each browser's `newContext()` and `newPage()`:
 *   Playwright has no event for "a context was made".
 * - NEVER throws by itself:  `failOnStoppedPages()` and `failOnMisalignedRows()` are what fail the test.
 */
function watchEveryBrowser(): void {
  const launch = chromium.launch.bind(chromium)
  chromium.launch = async (...launchArgs) => {
    const browser = await launch(...launchArgs)
    const newContext = browser.newContext.bind(browser)
    const newPage = browser.newPage.bind(browser)
    browser.newContext = async (...args) => {
      const context = await newContext(...args)
      watchForStoppedPages(context)
      await keepCodeAsLoaded(context)
      context.on("page", notePage)
      return context
    }
    browser.newPage = async (...args) => {
      const page = await newPage(...args)
      watchForStoppedPages(page.context())
      await keepCodeAsLoaded(page.context())
      notePage(page)
      return page
    }
    return browser
  }
}

/**
 * What to say of the pages that stopped since last asked;  `undefined`:  none did.
 * - SIDE EFFECT:  forgets them, so each failure reports its own.
 */
export function stoppedPagesReport(): string | undefined {
  if (!stoppedPages.length) return undefined
  const reports = stoppedPages
    .splice(0)
    .map(
      ({ page, message, cause }) =>
        `${page.url()}\n${message}\nThe error that stopped it:\n${cause ?? "(none reported)"}`
    )
  return [
    "A page's updates stopped for good:  an uncaught error halted Solid, so nothing on that page will change again.",
    "Fix the FIRST error, below;  whatever the test says after it is only what that page could no longer do.",
    "Solid's own guide:  node_modules/solid-js/skills/reactivity-diagnostics/SKILL.md",
    ...reports
  ].join("\n\n")
}

/** Fail the test (or the file, for a stop in `beforeAll()`) if a page stopped during it. */
function failOnStoppedPages(): void {
  const report = stoppedPagesReport()
  if (report) throw new Error(report)
}

watchEveryBrowser()
afterEach(failOnStoppedPages)
afterEach(failOnMisalignedRows)
afterAll(failOnStoppedPages)
