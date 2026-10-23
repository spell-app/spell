/**
 * Opening a docs page in a headless browser, for the tools that look at pages:
 * `check-spell.js` (checks and screenshots) and `designer-shots.js` (the designer review's screenshots).
 * - plain `node`, on Playwright;  its URL from `pages.js`' `browserUrlFor()`
 * - NEVER Claude-in-Chrome:  pages are looked at headlessly (Owen's standing rule)
 */
import { existsSync } from "node:fs"

// By its name with its `.ts`, its types stripped by `node` itself:  this runs under plain `node`
import { engineFileFor } from "spell-epic/server/engineLinks.ts"
import { PACKAGE } from "./pages.js"

/**
 * Elements the page's packs define, as `ui-*` (Spell UI) and `epic-*` (the `epics` pack, epic pages):
 * a tag that looks like one of theirs must be defined and draw into a shadow root.
 */
export const PACK_TAG = /^(ui|epic)-/

/** The engine whose routes a `file://` page's `/_epic/...` requests are answered from:  this checkout. */
const ENGINE = PACKAGE

/**
 * A new page of `browser` at `url`, drawn and settled (`settle()`).
 * - `viewport`:  `{ width, height }`;  `colorScheme`:  `light` or `dark`, the page's `prefers-color-scheme`
 * - `onProblem(text)`:  each page error and console error, labelled with the width
 * - a page from `file://` loading the engine's routes (`/_epic/...`):  answered from this engine's folders
 * - throws when the server answers with an error page (a 404):  it has none of the page's shape
 */
export async function openPage(browser, url, { viewport, colorScheme = "light", onProblem = () => {} }) {
  const page = await browser.newPage({ viewport, colorScheme })
  const label = `${viewport.width}px`
  page.on("pageerror", (error) => onProblem(`page error (${label}):  ${error}`))
  page.on("console", (message) => message.type() === "error" && onProblem(`console (${label}):  ${message.text()}`))
  await page.route(/^file:\/\/\/_epic\//, (route) => {
    const file = engineFileFor(new URL(route.request().url()).pathname, ENGINE)
    return file && existsSync(file) ? route.fulfill({ path: file }) : route.fulfill({ status: 404 })
  })
  const response = await page.goto(url)
  if (response && !response.ok()) throw new Error(`${url}:  ${response.status()} ${response.statusText()}`)
  await settle(page)
  return page
}

/**
 * Wait until every pack tag on `page` is defined and not pending (or 10s passed), then a second for the runtime.
 * - Pending:  a root defines its catalog's tags before their families load (`:state(pending)`, epic `solid-17` P7).
 */
export async function settle(page) {
  await page
    .waitForFunction(
      (pattern) =>
        [...document.querySelectorAll("*")].every(
          (el) =>
            !new RegExp(pattern).test(el.localName) ||
            (customElements.get(el.localName) && !el.matches(":state(pending)"))
        ),
      PACK_TAG.source,
      { timeout: 10000 }
    )
    .catch(() => {})
  await page.waitForTimeout(1000)
}
