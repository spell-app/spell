import { execSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { setTimeout as wait } from "node:timers/promises"
import { chromium, type BrowserContext, type Page } from "playwright"
import { afterAll, afterEach } from "vite-plus/test"

/**
 * How the editor's end-to-end tests find the running editor:  every test file here that opens it imports this.
 * - No record of an editor, as in CI:  `SERVING` is false, and the file skips itself.
 * - A record, and the editor answers:  `SERVING` is true.
 * - A record, but no answer for `ANSWER_MS`:  importing this THROWS, so the file fails and says why.
 *   - The editor is meant to be running, so skipping would look like a pass.
 *   - Start one with `spell server start all`.
 * - And it fails any test during which a page's updates stopped for good ("A stopped page", below).
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

/** Is there an editor to test?  (`describe.skipIf(!SERVING)`) */
export const SERVING = !!EDITOR

/**
 * What git says of the built-in projects right now, the changes themselves too.
 * - Compare it before and after a test:  someone's uncommitted work there is not the test's doing.
 */
export function builtInProjectsNow(): string {
  return execSync("git status --short spaces && git diff spaces", {
    cwd: path.join(KIT, "app"),
    maxBuffer: 64 * 1024 * 1024
  }).toString()
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

/**
 * Every test file's browsers watched for stopped pages, with nothing for a test to remember.
 * - HACK:  replaces `chromium.launch()`, and each browser's `newContext()` and `newPage()`:
 *   Playwright has no event for "a context was made".
 * - NEVER throws by itself:  `failOnStoppedPages()` is what fails the test.
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
      return context
    }
    browser.newPage = async (...args) => {
      const page = await newPage(...args)
      watchForStoppedPages(page.context())
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
afterAll(failOnStoppedPages)
