/**
 * Opening a docs page in a headless browser, for the tools that look at pages:
 * `check-spell.js` (checks and screenshots) and `designer-shots.js` (the designer review's screenshots).
 * - the kit's `BrowserPage` opens and settles it;  what's spell-epic's own is here:
 *   - a `file://` page's `/_epic/...` requests, answered from this engine's folders
 *   - each problem labelled with the width (`page error (390px):  ...`)
 * - plain `node`, on Playwright;  its URL from `pages.js`' `browserUrlFor()`
 * - NEVER Claude-in-Chrome:  pages are looked at headlessly (Owen's standing rule)
 */
import { BrowserPage } from "spell/element-tools/BrowserPage"

// By its name with its `.ts`, its types stripped by `node` itself:  this runs under plain `node`
import { engineFileFor } from "spell-epic/server/engineLinks.ts"
import { PACKAGE } from "./pages.js"

/**
 * Elements the page's packs define, as `ui-*` (Spell UI) and `epic-*` (the `epics` pack, epic pages):
 * a tag that looks like one of theirs must be defined and draw into a shadow root.
 * - not the kit's `PACK_TAGS`, which adds the brand's `brand-*`:  no docs page here draws one
 */
export const PACK_TAG = /^(ui|epic)-/

/** A `file://` page's engine routes (`/_epic/...`), answered from this checkout's engine, as the epic server would. */
const ENGINE_ROUTE = {
  url: /^file:\/\/\/_epic\//,
  fileFor: (url) => engineFileFor(url.pathname, PACKAGE)
}

/**
 * A new page of `browser` at `url`, drawn and settled (`settle()`).
 * - `viewport`:  `{ width, height }`;  `colorScheme`:  `light` or `dark`, the page's `prefers-color-scheme`
 * - `onProblem(text)`:  each page error and console error, labelled with the width
 * - throws when the server answers with an error page (a 404):  it has none of the page's shape
 */
export function openPage(browser, url, { viewport, colorScheme = "light", onProblem = () => {} }) {
  const label = `${viewport.width}px`
  return BrowserPage.open(browser, url, {
    viewport,
    colorScheme,
    routes: [ENGINE_ROUTE],
    onProblem: (text, kind) => onProblem(`${kind === "page error" ? kind : "console"} (${label}):  ${text}`),
    settle: { tags: PACK_TAG }
  })
}

/** Wait until every pack tag on `page` is defined and not pending (or 10s passed), then a second for the runtime. */
export function settle(page) {
  return BrowserPage.settle(page, { tags: PACK_TAG })
}
