/**
 * `spell place sign-in` and `spell place read-page`:  getting at a site behind its own sign-in (epic `mockup` P12).
 * - Signing in happens in a browser window Spell opens, Playwright's own Chromium:  never the person's own Chrome.
 * - The session is kept by `PlaceSessions`, on this machine and in no repo;  nothing here ever prints its values,
 *   and what it writes has them taken out.
 * - Reading a page is headless, with that session.
 * - Node only;  loaded when one of the commands runs.
 */
import { writeFileSync } from "node:fs"
import { createInterface } from "node:readline"

import type { Browser, Page } from "playwright"

import { BrowserPage } from "spell/element-tools/BrowserPage"
import { CLI } from "spell/cli"
import { PlaceSessions, type BrowserSessionState, type PlaceSession } from "spell/server/places"

/** How often it notes what the window has so far:  a window that's closed can't be asked. */
const NOTE_EVERY_MS = 1000

/** How long a page may take to show what it was asked to read. */
const READ_TIMEOUT_MS = 30_000

/** The most rows one page gives. */
const MOST_ROWS = 500

/** `spell place read-page`'s flags. */
export type PlaceReadPageOptions = {
  signedIn: string
  select: string
  as?: string
  into?: string
}

/** How to sign in, apart from the terminal and the window:  a test's own. */
export type SignInWays = {
  /** The browser;  default a window a person sees. */
  launch?: () => Promise<Browser>
  /** Resolves when they've finished;  default Enter, or the window closing. */
  finished?: (page: Page) => Promise<void>
}

/**
 * Run `spell place sign-in`:  its exit code.
 * - `address`:  left out, where it signed in last time.
 * - throws `CliError` with no address to go to, or no cookies when it's done
 */
export async function placeSignIn(place: string, address?: string, ways: SignInWays = {}): Promise<number> {
  const sessions = new PlaceSessions()
  const at = address ?? sessions.named(place)?.address
  if (!at) throw new CLI.CliError(`where do you sign in to ${place}?  spell place sign-in ${place} <address>`)
  const { launch = () => BrowserPage.launchVisible(), finished = windowFinished } = ways
  const browser = await launch()
  try {
    const page = await BrowserPage.newPage(browser, { context: { viewport: null } })
    CLI.out(`Sign in to ${place} in the window that opened.  When you're in, press Enter here, or close the window.`)
    await page.goto(at).catch((error: Error) => CLI.err(`Couldn't open ${at}:  ${error.message}`))
    const state = await stateAfter(page, finished)
    if (!state?.cookies.length) throw new CLI.CliError(`No sign-in to keep for ${place}:  it set no cookies`)
    const file = sessions.keep(place, { address: at, state })
    CLI.out(`Signed in to ${place}:  ${state.cookies.length} cookies, kept in ${file}, in no repo.`)
    return CLI.EXIT.OK
  } finally {
    await browser.close().catch(() => undefined)
  }
}

/** The window's sign-in when `finished` resolves:  what was noted last, if the window has gone by then. */
async function stateAfter(
  page: Page,
  finished: (page: Page) => Promise<void>
): Promise<BrowserSessionState | undefined> {
  const context = page.context()
  let noted: BrowserSessionState | undefined
  const note = async () => {
    noted = (await context.storageState().catch(() => undefined)) ?? noted
  }
  const noting = setInterval(() => void note(), NOTE_EVERY_MS)
  try {
    await finished(page)
    await note()
    return noted
  } finally {
    clearInterval(noting)
  }
}

/** Resolves on Enter at the terminal, or when the window closes. */
export function windowFinished(page: Page): Promise<void> {
  return new Promise((resolve) => {
    const terminal = process.stdin.isTTY ? createInterface({ input: process.stdin }) : undefined
    const done = () => {
      terminal?.close()
      resolve()
    }
    terminal?.once("line", done)
    page.context().once("close", done)
    page.context().browser()?.once("disconnected", done)
  })
}

/**
 * Run `spell place read-page`:  its exit code.
 * - throws `CliError` when it never signed in, the session has ended, or nothing on the page matches
 */
export async function placeReadPage(address: string, options: PlaceReadPageOptions): Promise<number> {
  const { signedIn, select, as = "samples", into } = options
  const session = new PlaceSessions().named(signedIn)
  if (!session)
    throw new CLI.CliError(`${signedIn} hasn't been signed in to:  spell place sign-in ${signedIn} <address>`)
  const rows = await BrowserPage.with((browser) => rowsOffPage(browser, address, select, session))
  const kept = session.scrubbed(
    JSON.stringify({ page: address, select, readAt: new Date().toISOString(), rows }, null, 2)
  )
  if (!into) {
    CLI.out(kept)
    return CLI.EXIT.OK
  }
  const file = samplesFileFor(into, as)
  writeFileSync(file, `${kept}\n`)
  CLI.out(`Read ${rows.length} rows off ${address}:  kept in ${file}.`)
  return CLI.EXIT.OK
}

/** Where the samples of `collection` go, beside the place's file `into`:  `Racks.api.spell` => `Racks.racks.samples.json`. */
export function samplesFileFor(into: string, collection: string): string {
  const stem = into.replace(/(?:\.api)?\.(?:spell|spellml)$/, "")
  return `${stem}.${collection.replace(/\W+/g, "-")}.samples.json`
}

/**
 * The rows at `select` on page `address`, signed in as `session`.
 * - A table (or an element with table roles):  a row each, by its heading's words.
 * - Anything else:  a row for each element it matches, its text.
 * - throws `CliError` when the session has ended, the page says no, or nothing matches
 */
export async function rowsOffPage(
  browser: Browser,
  address: string,
  select: string,
  session: PlaceSession
): Promise<Record<string, string>[]> {
  const ended = () =>
    new CLI.CliError(`the session for ${session.place} has ended:  sign in again, spell place sign-in ${session.place}`)
  if (session.hasEnded) throw ended()
  const page = await BrowserPage.newPage(browser, { context: { storageState: session.browserState } })
  try {
    const response = await page.goto(address, { timeout: READ_TIMEOUT_MS })
    if (response?.status() === 401 || session.sentToSignIn(address, page.url())) throw ended()
    if (response && !response.ok()) throw new CLI.CliError(`${address} answered ${response.status()}`)
    await page.waitForSelector(select, { timeout: READ_TIMEOUT_MS }).catch(() => {
      throw new CLI.CliError(`Nothing on ${address} matches ${select}`)
    })
    // a page that fills itself in after loading
    await page.waitForLoadState("networkidle", { timeout: READ_TIMEOUT_MS }).catch(() => undefined)
    return await page.$$eval(select, rowsIn, MOST_ROWS)
  } finally {
    await page.close()
  }
}

/** The rows in `elements`:  runs in the page. */
function rowsIn(elements: Element[], most: number): Record<string, string>[] {
  const words = (element: Element) => (element.textContent ?? "").replace(/\s+/g, " ").trim()
  const first = elements[0]
  const rowElements = first ? [...first.querySelectorAll("tr, [role=row]")] : []
  if (!rowElements.length) return elements.slice(0, most).map((element) => ({ text: words(element) }))
  const cellsOf = (row: Element) => [
    ...row.querySelectorAll("th, td, [role=columnheader], [role=cell], [role=gridcell]")
  ]
  const headed = rowElements[0]!.querySelector("th, [role=columnheader]") ? rowElements[0]! : undefined
  const headings = headed ? cellsOf(headed).map(words) : []
  return rowElements
    .filter((row) => row !== headed)
    .slice(0, most)
    .map((row) => Object.fromEntries(cellsOf(row).map((cell, at) => [headings[at] || `column ${at + 1}`, words(cell)])))
}
